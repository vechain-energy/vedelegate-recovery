import { useCallback } from 'react'
import { TransactionModal, useSendTransaction, useTransactionModal } from '@vechain/vechain-kit'
import type { Address } from 'viem'
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

export type RecoveryActions = {
  isBusy: boolean
  error?: string
  modal: React.ReactNode
  recoverVet: (poolAddress: Address, ownerAddress: Address, amount: bigint) => Promise<void>
  recoverToken: (poolAddress: Address, ownerAddress: Address, tokenBalance: PoolTokenBalance) => Promise<void>
  recoverGmNft: (poolAddress: Address, ownerAddress: Address, gmNft: PoolGmNft) => Promise<void>
  convertVot3: (poolAddress: Address, amount: bigint) => Promise<void>
  recoverAll: (poolAddress: Address, ownerAddress: Address, assets: PoolAssetSnapshot) => Promise<void>
  recoverTerm: (poolAddress: Address, term: LockedTerm) => Promise<void>
}

export const useRecoveryActions = (config: AppConfig, ownerAddress?: Address): RecoveryActions => {
  const transaction = useSendTransaction({
    signerAccountAddress: ownerAddress ?? '',
  })
  const transactionModal = useTransactionModal()

  const sendClauses = useCallback(
    async (clauses: RecoveryClause[], title: string) => {
      if (!ownerAddress) {
        throw new Error('You need to connect wallet.')
      }

      if (clauses.length === 0) {
        throw new Error('Nothing to recover.')
      }

      transactionModal.open()
      const submitClauses: Parameters<typeof transaction.sendTransaction>[0] = clauses
      await transaction.sendTransaction(
        submitClauses,
        config.delegationUrl,
        {
          title,
          description: title,
          buttonText: 'Sign',
        },
      )
    },
    [config.delegationUrl, ownerAddress, transaction, transactionModal],
  )

  return {
    isBusy: transaction.isTransactionPending || transaction.isWaitingForWalletConfirmation,
    error: transaction.error?.reason,
    modal: (
      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={transactionModal.close}
        status={transaction.status}
        txReceipt={transaction.txReceipt}
        txError={transaction.error}
        onTryAgain={() => transaction.resetStatus()}
        uiConfig={{
          title: 'Recovery transaction',
          description: 'Status on VeChainThor',
          showExplorerButton: true,
          isClosable: true,
        }}
      />
    ),
    recoverVet: (poolAddress, targetAddress, amount) =>
      sendClauses([buildWithdrawVetClause(poolAddress, targetAddress, amount)], 'Withdraw VET'),
    recoverToken: (poolAddress, targetAddress, tokenBalance) =>
      sendClauses(
        [
          buildWithdrawTokenClause(
            poolAddress,
            targetAddress,
            tokenBalance.token.address,
            tokenBalance.balance,
            tokenBalance.token.symbol,
          ),
        ],
        `Withdraw ${tokenBalance.token.symbol}`,
      ),
    recoverGmNft: (poolAddress, targetAddress, gmNft) =>
      sendClauses(buildWithdrawGmNftClauses(config, poolAddress, targetAddress, gmNft), `Withdraw GM ${gmNft.tokenIdText}`),
    convertVot3: (poolAddress, amount) =>
      sendClauses([buildConvertVot3Clause(config, poolAddress, amount)], 'Convert VOT3 to B3TR'),
    recoverAll: (poolAddress, targetAddress, assets) =>
      sendClauses(
        buildRecoverAllClauses({
          config,
          poolAddress,
          ownerAddress: targetAddress,
          vetBalance: assets.vetBalance,
          tokenBalances: assets.tokenBalances,
          gmNfts: assets.gmNfts,
        }),
        'Recover pool assets',
      ),
    recoverTerm: (poolAddress, term) =>
      sendClauses(
        buildTermActionClauses({
          config,
          poolAddress,
          tokenId: term.tokenId,
          isActive: term.metadata.isActive,
          isEnded: term.isEnded,
          autoRenew: term.metadata.autoRenew,
          b3trBalance: term.b3trBalance,
          vot3Balance: term.vot3Balance,
        }),
        `Recover term ${term.tokenIdText}`,
      ),
  }
}
