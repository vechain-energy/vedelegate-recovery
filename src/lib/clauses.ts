import { encodeFunctionData, type Address, type Hex } from 'viem'
import { erc20Abi, galaxyMemberAbi, lockedTermsAbi, poolExecuteAbi, vot3Abi } from '../abis'
import type { AppConfig } from '../config'
import { sameAddress } from './format'
import type { PoolGmNft, PoolTokenBalance } from './pools'

export type RecoveryClause = {
  to: Address
  value: Hex
  data: Hex
  comment?: string
  abi?: string
}

export type RecoverAllInput = {
  config: AppConfig
  poolAddress: Address
  ownerAddress: Address
  vetBalance: bigint
  tokenBalances: readonly PoolTokenBalance[]
  gmNfts: readonly PoolGmNft[]
}

export type TermActionInput = {
  config: AppConfig
  poolAddress: Address
  tokenId: bigint
  isActive: boolean
  isEnded: boolean
  autoRenew: boolean
  b3trBalance: bigint
  vot3Balance: bigint
}

const ZERO_VALUE = '0x0'
const EMPTY_DATA = '0x'

export const buildPoolExecuteClause = (
  poolAddress: Address,
  to: Address,
  innerValue: bigint,
  innerData: Hex,
  comment: string,
): RecoveryClause => ({
  to: poolAddress,
  value: ZERO_VALUE,
  data: encodeFunctionData({
    abi: poolExecuteAbi,
    functionName: 'execute',
    args: [to, innerValue, innerData, 0n],
  }),
  comment,
})

export const buildWithdrawVetClause = (
  poolAddress: Address,
  ownerAddress: Address,
  amount: bigint,
): RecoveryClause =>
  buildPoolExecuteClause(poolAddress, ownerAddress, amount, EMPTY_DATA, 'Withdraw VET')

export const buildWithdrawTokenClause = (
  poolAddress: Address,
  ownerAddress: Address,
  tokenAddress: Address,
  amount: bigint,
  symbol: string,
): RecoveryClause => {
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [ownerAddress, amount],
  })

  return buildPoolExecuteClause(poolAddress, tokenAddress, 0n, transferData, `Withdraw ${symbol}`)
}

export const buildConvertVot3Clause = (
  config: AppConfig,
  poolAddress: Address,
  amount: bigint,
): RecoveryClause => {
  const convertData = encodeFunctionData({
    abi: vot3Abi,
    functionName: 'convertToB3TR',
    args: [amount],
  })

  return buildPoolExecuteClause(poolAddress, config.addresses.vot3, 0n, convertData, 'Convert VOT3 to B3TR')
}

const buildDetachGmNodeClause = (
  config: AppConfig,
  poolAddress: Address,
  gmNft: PoolGmNft,
): RecoveryClause =>
  buildPoolExecuteClause(
    poolAddress,
    config.addresses.galaxyMember,
    0n,
    encodeFunctionData({
      abi: galaxyMemberAbi,
      functionName: 'detachNode',
      args: [gmNft.nodeIdAttached, gmNft.tokenId],
    }),
    `Detach node ${gmNft.nodeIdAttached.toString()} from GM ${gmNft.tokenIdText}`,
  )

const buildTransferGmNftClause = (
  config: AppConfig,
  poolAddress: Address,
  ownerAddress: Address,
  gmNft: PoolGmNft,
): RecoveryClause =>
  buildPoolExecuteClause(
    poolAddress,
    config.addresses.galaxyMember,
    0n,
    encodeFunctionData({
      abi: galaxyMemberAbi,
      functionName: 'safeTransferFrom',
      args: [poolAddress, ownerAddress, gmNft.tokenId],
    }),
    `Withdraw GM ${gmNft.tokenIdText}`,
  )

export const buildWithdrawGmNftClauses = (
  config: AppConfig,
  poolAddress: Address,
  ownerAddress: Address,
  gmNft: PoolGmNft,
): RecoveryClause[] => {
  const clauses: RecoveryClause[] = []

  if (gmNft.nodeIdAttached > 0n) {
    clauses.push(buildDetachGmNodeClause(config, poolAddress, gmNft))
  }

  clauses.push(buildTransferGmNftClause(config, poolAddress, ownerAddress, gmNft))

  return clauses
}

export const buildRecoverAllClauses = ({
  config,
  poolAddress,
  ownerAddress,
  vetBalance,
  tokenBalances,
  gmNfts,
}: RecoverAllInput): RecoveryClause[] => {
  const clauses: RecoveryClause[] = []
  const b3trBalance = tokenBalances.find((item) => sameAddress(item.token.address, config.addresses.b3tr))?.balance ?? 0n
  const vot3Balance = tokenBalances.find((item) => sameAddress(item.token.address, config.addresses.vot3))?.balance ?? 0n

  if (vetBalance > 0n) {
    clauses.push(buildWithdrawVetClause(poolAddress, ownerAddress, vetBalance))
  }

  if (vot3Balance > 0n) {
    clauses.push(buildConvertVot3Clause(config, poolAddress, vot3Balance))
  }

  if (b3trBalance + vot3Balance > 0n) {
    clauses.push(
      buildWithdrawTokenClause(
        poolAddress,
        ownerAddress,
        config.addresses.b3tr,
        b3trBalance + vot3Balance,
        'B3TR',
      ),
    )
  }

  tokenBalances.forEach((item) => {
    if (
      item.balance <= 0n ||
      sameAddress(item.token.address, config.addresses.b3tr) ||
      sameAddress(item.token.address, config.addresses.vot3)
    ) {
      return
    }

    clauses.push(
      buildWithdrawTokenClause(
        poolAddress,
        ownerAddress,
        item.token.address,
        item.balance,
        item.token.symbol,
      ),
    )
  })

  gmNfts.forEach((gmNft) => {
    clauses.push(...buildWithdrawGmNftClauses(config, poolAddress, ownerAddress, gmNft))
  })

  return clauses
}

const buildLockedTermExecuteClause = (
  config: AppConfig,
  poolAddress: Address,
  data: Hex,
  comment: string,
): RecoveryClause =>
  buildPoolExecuteClause(poolAddress, config.addresses.lockedTerms, 0n, data, comment)

export const buildTermActionClauses = ({
  config,
  poolAddress,
  tokenId,
  isActive,
  isEnded,
  autoRenew,
  b3trBalance,
  vot3Balance,
}: TermActionInput): RecoveryClause[] => {
  const hasFunds = b3trBalance > 0n || vot3Balance > 0n
  const tokenIdLabel = tokenId.toString()

  if (isActive && !isEnded) {
    return []
  }

  if (!isActive && !hasFunds) {
    return []
  }

  const clauses: RecoveryClause[] = []

  if (isActive && autoRenew) {
    clauses.push(
      buildLockedTermExecuteClause(
        config,
        poolAddress,
        encodeFunctionData({
          abi: lockedTermsAbi,
          functionName: 'setAutoRenew',
          args: [tokenId, false],
        }),
        `Disable auto-renew for term ${tokenIdLabel}`,
      ),
    )
  }

  if (isActive) {
    clauses.push(
      buildLockedTermExecuteClause(
        config,
        poolAddress,
        encodeFunctionData({
          abi: lockedTermsAbi,
          functionName: 'closeTerm',
          args: [tokenId],
        }),
        `Close term ${tokenIdLabel}`,
      ),
    )
  }

  clauses.push(
    buildLockedTermExecuteClause(
      config,
      poolAddress,
      encodeFunctionData({
        abi: lockedTermsAbi,
        functionName: 'withdrawFundsFrom',
        args: [tokenId],
      }),
      `Withdraw term ${tokenIdLabel}`,
    ),
  )

  return clauses
}
