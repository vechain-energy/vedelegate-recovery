import type { Address } from 'viem'
import { erc20Abi, lockedTermsAbi, poolAbi } from '../abis'
import type { AppConfig } from '../config'
import { executeReadCall, executeReadCalls, makeReadCall } from './thor'

export type LockedTermMetadata = {
  minter: Address
  amount: bigint
  veDelegatePoolTokenId: bigint
  optionId: bigint
  startTime: bigint
  autoRenew: boolean
  isActive: boolean
  creationRoundId: bigint
  lastModifiedRoundId: bigint
}

export type LockedTermOption = {
  timeLength: bigint
  multiplier: bigint
  balance: bigint
  isActive: boolean
}

export type LockedTermStatus = 'locked' | 'ended' | 'closed-ready' | 'closed-empty'

export type LockedTermActionKind = 'none' | 'close-ended' | 'withdraw-closed'

export type LockedTerm = {
  tokenId: bigint
  tokenIdText: string
  metadata: LockedTermMetadata
  option: LockedTermOption
  termPoolAddress: Address
  endTime: number
  isEnded: boolean
  status: LockedTermStatus
  actionKind: LockedTermActionKind
  b3trBalance: bigint
  vot3Balance: bigint
}

type MetadataArray = readonly [
  Address,
  bigint,
  bigint,
  bigint,
  bigint,
  boolean,
  boolean,
  bigint,
  bigint,
]

type MetadataObject = {
  minter: Address
  amount: bigint
  veDelegatePoolTokenId: bigint
  optionId: bigint
  startTime: bigint
  autoRenew: boolean
  isActive: boolean
  creationRoundId: bigint
  lastModifiedRoundId: bigint
}

type OptionArray = readonly [bigint, bigint, bigint, boolean]

type OptionObject = {
  timeLength: bigint
  multiplier: bigint
  balance: bigint
  isActive: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMetadataObject = (value: unknown): value is MetadataObject =>
  isRecord(value) &&
  typeof value.minter === 'string' &&
  typeof value.amount === 'bigint' &&
  typeof value.veDelegatePoolTokenId === 'bigint' &&
  typeof value.optionId === 'bigint' &&
  typeof value.startTime === 'bigint' &&
  typeof value.autoRenew === 'boolean' &&
  typeof value.isActive === 'boolean' &&
  typeof value.creationRoundId === 'bigint' &&
  typeof value.lastModifiedRoundId === 'bigint'

const isMetadataArray = (value: unknown): value is MetadataArray =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'bigint' &&
  typeof value[2] === 'bigint' &&
  typeof value[3] === 'bigint' &&
  typeof value[4] === 'bigint' &&
  typeof value[5] === 'boolean' &&
  typeof value[6] === 'boolean' &&
  typeof value[7] === 'bigint' &&
  typeof value[8] === 'bigint'

const isOptionObject = (value: unknown): value is OptionObject =>
  isRecord(value) &&
  typeof value.timeLength === 'bigint' &&
  typeof value.multiplier === 'bigint' &&
  typeof value.balance === 'bigint' &&
  typeof value.isActive === 'boolean'

const isOptionArray = (value: unknown): value is OptionArray =>
  Array.isArray(value) &&
  typeof value[0] === 'bigint' &&
  typeof value[1] === 'bigint' &&
  typeof value[2] === 'bigint' &&
  typeof value[3] === 'boolean'

export const parseLockedTermMetadata = (value: unknown): LockedTermMetadata => {
  if (isMetadataObject(value)) {
    return value
  }

  if (isMetadataArray(value)) {
    return {
      minter: value[0],
      amount: value[1],
      veDelegatePoolTokenId: value[2],
      optionId: value[3],
      startTime: value[4],
      autoRenew: value[5],
      isActive: value[6],
      creationRoundId: value[7],
      lastModifiedRoundId: value[8],
    }
  }

  throw new Error('Locked term metadata has unknown shape.')
}

export const parseLockedTermOption = (value: unknown): LockedTermOption => {
  if (isOptionObject(value)) {
    return value
  }

  if (isOptionArray(value)) {
    return {
      timeLength: value[0],
      multiplier: value[1],
      balance: value[2],
      isActive: value[3],
    }
  }

  throw new Error('Locked term option has unknown shape.')
}

export const computeTermStatus = (
  metadata: Pick<LockedTermMetadata, 'isActive'>,
  isEnded: boolean,
  b3trBalance: bigint,
  vot3Balance: bigint,
): { status: LockedTermStatus; actionKind: LockedTermActionKind } => {
  const hasFunds = b3trBalance > 0n || vot3Balance > 0n

  if (metadata.isActive && !isEnded) {
    return { status: 'locked', actionKind: 'none' }
  }

  if (metadata.isActive) {
    return { status: 'ended', actionKind: 'close-ended' }
  }

  if (hasFunds) {
    return { status: 'closed-ready', actionKind: 'withdraw-closed' }
  }

  return { status: 'closed-empty', actionKind: 'none' }
}

export async function fetchLockedTerms(
  config: AppConfig,
  poolAddress: Address,
): Promise<LockedTerm[]> {
  const [ownedCount, termInterval] = await Promise.all([
    executeReadCall(config.nodeUrl, makeReadCall(config.addresses.lockedTerms, lockedTermsAbi, 'balanceOf', [poolAddress])),
    executeReadCall(config.nodeUrl, makeReadCall(config.addresses.lockedTerms, lockedTermsAbi, 'termInterval', [])),
  ])

  if (ownedCount === 0n) {
    return []
  }

  const tokenIdCalls = Array.from({ length: Number(ownedCount) }, (_, index) =>
    makeReadCall(config.addresses.lockedTerms, lockedTermsAbi, 'tokenOfOwnerByIndex', [poolAddress, BigInt(index)]),
  )
  const tokenIds = await executeReadCalls(config.nodeUrl, tokenIdCalls)

  const metadataResults = await executeReadCalls(
    config.nodeUrl,
    tokenIds.map((tokenId) =>
      makeReadCall(config.addresses.lockedTerms, lockedTermsAbi, 'getTokenMetadata', [tokenId]),
    ),
  )
  const metadataList = metadataResults.map(parseLockedTermMetadata)

  const [optionResults, termPoolAddresses] = await Promise.all([
    executeReadCalls(
      config.nodeUrl,
      metadataList.map((metadata) =>
        makeReadCall(config.addresses.lockedTerms, lockedTermsAbi, 'getOption', [metadata.optionId]),
      ),
    ),
    executeReadCalls(
      config.nodeUrl,
      metadataList.map((metadata) =>
        makeReadCall(config.addresses.veDelegate, poolAbi, 'getPoolAddress', [metadata.veDelegatePoolTokenId]),
      ),
    ),
  ])
  const options = optionResults.map(parseLockedTermOption)

  const balanceCalls = termPoolAddresses.flatMap((address) => [
    makeReadCall(config.addresses.b3tr, erc20Abi, 'balanceOf', [address]),
    makeReadCall(config.addresses.vot3, erc20Abi, 'balanceOf', [address]),
  ])
  const balances = await executeReadCalls(config.nodeUrl, balanceCalls)

  const nowSeconds = Math.floor(Date.now() / 1000)

  return tokenIds.map((tokenId, index) => {
    const metadata = metadataList[index]
    const option = options[index]
    const termPoolAddress = termPoolAddresses[index]

    if (!metadata || !option || !termPoolAddress) {
      throw new Error('Locked term response count mismatch.')
    }

    const b3trBalance = balances[index * 2] ?? 0n
    const vot3Balance = balances[index * 2 + 1] ?? 0n
    const endTimeBigInt = metadata.startTime + option.timeLength * termInterval
    const endTime = Number(endTimeBigInt)
    const isEnded = nowSeconds >= endTime
    const status = computeTermStatus(metadata, isEnded, b3trBalance, vot3Balance)

    return {
      tokenId,
      tokenIdText: tokenId.toString(),
      metadata,
      option,
      termPoolAddress,
      endTime,
      isEnded,
      status: status.status,
      actionKind: status.actionKind,
      b3trBalance,
      vot3Balance,
    }
  })
}
