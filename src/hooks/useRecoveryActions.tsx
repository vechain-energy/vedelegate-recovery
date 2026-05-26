import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { txReceiptQueryKey, useSendTransaction } from '@vechain/vechain-kit'
import type { Address } from 'viem'
import { RecoveryTransactionModal, type RecoveryTransactionPhase } from '../components/RecoveryTransactionModal'
import type { AppConfig } from '../config'
import {
  buildConvertVot3Clause,
  buildRecoverAllClauses,
  buildTermActionClauses,
  buildWithdrawGmNftClauses,
  buildWithdrawTokenClause,
  buildWithdrawVetClause,
  type RecoveryClause,
} from '../lib/clauses'
import type { LockedTerm } from '../lib/lockedTerms'
import type { PoolAssetSnapshot, PoolGmNft, PoolTokenBalance } from '../lib/pools'
import { simulateRecoveryTransaction, type RecoverySimulationSummary } from '../lib/simulation'
import type { TokenInfo } from '../lib/tokens'

type RecoveryActionOptions = {
  tokenList?: readonly TokenInfo[]
  onTransactionSettled?: () => void
}

type RecoveryRequest = {
  title: string
  clauses: RecoveryClause[]
  knownTokens: readonly TokenInfo[]
  knownNfts: readonly PoolGmNft[]
}

type ActiveRecoveryTransaction = {
  request: RecoveryRequest
  phase: RecoveryTransactionPhase
  summary?: RecoverySimulationSummary
  errorText?: string
  txId?: string
}

export type RecoveryActions = {
  isBusy: boolean
  error?: string
  modal: ReactNode
  recoverVet: (poolAddress: Address, ownerAddress: Address, amount: bigint) => Promise<void>
  recoverToken: (poolAddress: Address, ownerAddress: Address, tokenBalance: PoolTokenBalance) => Promise<void>
  recoverGmNft: (poolAddress: Address, ownerAddress: Address, gmNft: PoolGmNft) => Promise<void>
  convertVot3: (poolAddress: Address, amount: bigint) => Promise<void>
  recoverAll: (poolAddress: Address, ownerAddress: Address, assets: PoolAssetSnapshot) => Promise<void>
  recoverTerm: (poolAddress: Address, term: LockedTerm) => Promise<void>
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'reason' in error) {
    const reason = (error as { reason?: unknown }).reason
    if (typeof reason === 'string') {
      return reason
    }
  }

  return 'Transaction failed.'
}

const mergeTokenLists = (
  baseTokens: readonly TokenInfo[],
  knownTokens: readonly TokenInfo[],
): TokenInfo[] => {
  const seen = new Set<string>()
  const merged: TokenInfo[] = []

  const push = (token: TokenInfo) => {
    const key = token.address.toLowerCase()
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    merged.push(token)
  }

  baseTokens.forEach(push)
  knownTokens.forEach(push)

  return merged
}

type ReceiptLike = {
  reverted?: boolean
  meta?: {
    txID?: string
  }
} | null | undefined

type MaybeTransactionId = {
  txId?: unknown
  txID?: unknown
  transactionId?: unknown
  txHash?: unknown
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.startsWith('0x') ? value : undefined

const getReceiptTransactionId = (receipt: ReceiptLike): string | undefined => readString(receipt?.meta?.txID)

const getTransactionIdFromHook = (transaction: MaybeTransactionId): string | undefined =>
  readString(transaction.txId) ??
  readString(transaction.txID) ??
  readString(transaction.transactionId) ??
  readString(transaction.txHash)

const kitTxReceiptQueryKeyPrefix = txReceiptQueryKey('0x')

const readKitTxReceiptQueryId = (queryKey: readonly unknown[]): string | undefined => {
  if (queryKey[0] !== kitTxReceiptQueryKeyPrefix[0] || queryKey[1] !== kitTxReceiptQueryKeyPrefix[1]) {
    return undefined
  }

  return readString(queryKey[2])
}

const findPendingKitTransactionId = (queryClient: QueryClient): string | undefined => {
  const queries = queryClient.getQueryCache().getAll()
  const fetchingQuery = queries.find((query) => readKitTxReceiptQueryId(query.queryKey) && query.state.fetchStatus === 'fetching')
  const latestQuery = queries.findLast((query) => readKitTxReceiptQueryId(query.queryKey))

  return readKitTxReceiptQueryId(fetchingQuery?.queryKey ?? []) ?? readKitTxReceiptQueryId(latestQuery?.queryKey ?? [])
}

export const useRecoveryActions = (
  config: AppConfig,
  ownerAddress?: Address,
  options: RecoveryActionOptions = {},
): RecoveryActions => {
  const queryClient = useQueryClient()
  const transaction = useSendTransaction({
    signerAccountAddress: ownerAddress ?? '',
  })
  const [activeTransaction, setActiveTransaction] = useState<ActiveRecoveryTransaction>()
  const tokenList = useMemo(
    () => options.tokenList ?? [],
    [options.tokenList],
  )

  const simulationMutation = useMutation({
    mutationFn: async (request: RecoveryRequest) => {
      if (!ownerAddress) {
        throw new Error('You need to connect wallet.')
      }

      return simulateRecoveryTransaction({
        config,
        ownerAddress,
        clauses: request.clauses,
        tokenList: mergeTokenLists(tokenList, request.knownTokens),
        knownNfts: request.knownNfts,
      })
    },
  })

  const beginTransaction = useCallback(
    async (request: RecoveryRequest) => {
      if (!ownerAddress) {
        throw new Error('You need to connect wallet.')
      }

      if (request.clauses.length === 0) {
        throw new Error('Nothing to recover.')
      }

      transaction.resetStatus()
      setActiveTransaction({ request, phase: 'simulating' })

      try {
        const summary = await simulationMutation.mutateAsync(request)
        setActiveTransaction({
          request,
          phase: summary.reverted ? 'simulation-error' : 'ready',
          summary,
          errorText: summary.errorText,
        })
      } catch (error) {
        setActiveTransaction({
          request,
          phase: 'simulation-error',
          errorText: toErrorMessage(error),
        })
      }
    },
    [ownerAddress, simulationMutation, transaction],
  )

  const confirmTransaction = useCallback(
    async () => {
      if (!activeTransaction || activeTransaction.phase !== 'ready') {
        return
      }

      setActiveTransaction((current) => (current ? { ...current, phase: 'signing', errorText: undefined } : current))

      try {
        const submitClauses: Parameters<typeof transaction.sendTransaction>[0] = activeTransaction.request.clauses
        await transaction.sendTransaction(
          submitClauses,
          config.delegationUrl,
          {
            title: activeTransaction.request.title,
            description: activeTransaction.request.title,
            buttonText: 'Sign',
          },
        )
        setActiveTransaction((current) => (current ? { ...current, phase: 'pending' } : current))
      } catch (error) {
        setActiveTransaction((current) =>
          current
            ? {
                ...current,
                phase: 'error',
                errorText: transaction.error?.reason ?? toErrorMessage(error),
              }
            : current,
        )
      }
    },
    [activeTransaction, config.delegationUrl, transaction],
  )

  useEffect(
    () => {
      if (!activeTransaction) {
        return
      }

      const txId =
        getReceiptTransactionId(transaction.txReceipt) ??
        getTransactionIdFromHook(transaction as MaybeTransactionId) ??
        findPendingKitTransactionId(queryClient)

      if (!txId) {
        return
      }

      setActiveTransaction((current) => (current && current.txId !== txId ? { ...current, txId } : current))
    },
    [activeTransaction, queryClient, transaction, transaction.txReceipt, transaction.status],
  )

  useEffect(
    () => {
      if (!activeTransaction) {
        return
      }

      if (transaction.status === 'success') {
        setActiveTransaction((current) =>
          current && current.phase !== 'success'
            ? {
                ...current,
                phase: 'success',
                txId: getReceiptTransactionId(transaction.txReceipt) ?? current.txId,
              }
            : current,
        )
        return
      }

      if (transaction.status === 'error') {
        const nextTxId = getReceiptTransactionId(transaction.txReceipt)
        const nextErrorText = transaction.error?.reason ?? (transaction.txReceipt?.reverted ? 'Transaction reverted.' : 'Transaction failed.')

        setActiveTransaction((current) =>
          current && (current.phase !== 'error' || current.errorText !== nextErrorText || (nextTxId && current.txId !== nextTxId))
            ? {
                ...current,
                phase: 'error',
                txId: nextTxId ?? current.txId,
                errorText: nextErrorText,
              }
            : current,
        )
      }
    },
    [activeTransaction, transaction.error, transaction.status, transaction.txReceipt],
  )

  const closeTransactionModal = useCallback(
    () => {
      const shouldRefresh = activeTransaction?.phase === 'success' || transaction.status === 'success'

      setActiveTransaction(undefined)
      simulationMutation.reset()
      transaction.resetStatus()

      if (shouldRefresh) {
        options.onTransactionSettled?.()
      }
    },
    [activeTransaction?.phase, options, simulationMutation, transaction],
  )

  const modalPhase: RecoveryTransactionPhase | undefined = activeTransaction
    ? transaction.isTransactionPending
      ? 'pending'
      : activeTransaction.phase
    : undefined
  const isModalBusy = Boolean(
    activeTransaction &&
      (activeTransaction.phase === 'simulating' ||
        activeTransaction.phase === 'signing' ||
        modalPhase === 'pending' ||
        transaction.isWaitingForWalletConfirmation ||
        transaction.isTransactionPending),
  )

  return {
    isBusy: isModalBusy,
    error: transaction.error?.reason ?? activeTransaction?.errorText,
    modal: activeTransaction && modalPhase ? (
      <RecoveryTransactionModal
        isOpen
        title={activeTransaction.request.title}
        phase={modalPhase}
        network={config.network}
        summary={activeTransaction.summary}
        errorText={activeTransaction.errorText}
        txId={activeTransaction.txId}
        isWalletWaiting={transaction.isWaitingForWalletConfirmation}
        isChainPending={transaction.isTransactionPending}
        onClose={closeTransactionModal}
        onConfirm={() => {
          void confirmTransaction()
        }}
      />
    ) : null,
    recoverVet: (poolAddress, targetAddress, amount) =>
      beginTransaction({
        title: 'Withdraw VET',
        clauses: [buildWithdrawVetClause(poolAddress, targetAddress, amount)],
        knownTokens: [],
        knownNfts: [],
      }),
    recoverToken: (poolAddress, targetAddress, tokenBalance) =>
      beginTransaction({
        title: `Withdraw ${tokenBalance.token.symbol}`,
        clauses: [
          buildWithdrawTokenClause(
            poolAddress,
            targetAddress,
            tokenBalance.token.address,
            tokenBalance.balance,
            tokenBalance.token.symbol,
          ),
        ],
        knownTokens: [tokenBalance.token],
        knownNfts: [],
      }),
    recoverGmNft: (poolAddress, targetAddress, gmNft) =>
      beginTransaction({
        title: `Withdraw GM ${gmNft.tokenIdText}`,
        clauses: buildWithdrawGmNftClauses(config, poolAddress, targetAddress, gmNft),
        knownTokens: [],
        knownNfts: [gmNft],
      }),
    convertVot3: (poolAddress, amount) =>
      beginTransaction({
        title: 'Convert VOT3 to B3TR',
        clauses: [buildConvertVot3Clause(config, poolAddress, amount)],
        knownTokens: [],
        knownNfts: [],
      }),
    recoverAll: (poolAddress, targetAddress, assets) =>
      beginTransaction({
        title: 'Recover pool assets',
        clauses: buildRecoverAllClauses({
          config,
          poolAddress,
          ownerAddress: targetAddress,
          vetBalance: assets.vetBalance,
          tokenBalances: assets.tokenBalances,
          gmNfts: assets.gmNfts,
        }),
        knownTokens: assets.tokenBalances.map((item) => item.token),
        knownNfts: assets.gmNfts,
      }),
    recoverTerm: (poolAddress, term) =>
      beginTransaction({
        title: `Recover term ${term.tokenIdText}`,
        clauses: buildTermActionClauses({
          config,
          poolAddress,
          tokenId: term.tokenId,
          isActive: term.metadata.isActive,
          isEnded: term.isEnded,
          autoRenew: term.metadata.autoRenew,
          b3trBalance: term.b3trBalance,
          vot3Balance: term.vot3Balance,
        }),
        knownTokens: [],
        knownNfts: [],
      }),
  }
}
