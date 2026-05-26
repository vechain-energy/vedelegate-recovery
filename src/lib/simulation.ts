import {
  decodeEventLog,
  isAddress,
  parseAbi,
  type Address,
  type Hex,
} from 'viem'
import type { AppConfig } from '../config'
import type { RecoveryClause } from './clauses'
import { formatTokenAmount, sameAddress, shortAddress } from './format'
import type { PoolGmNft } from './pools'
import type { TokenInfo } from './tokens'

export type ThorSimulationEvent = {
  address?: string
  topics?: Hex[]
  data?: Hex
}

export type ThorSimulationTransfer = {
  sender?: string
  recipient?: string
  amount?: string
}

export type ThorSimulationResult = {
  data?: Hex
  events?: ThorSimulationEvent[]
  transfers?: ThorSimulationTransfer[]
  gasUsed?: number
  reverted?: boolean
  vmError?: string
}

type EventTopics = [signature: Hex, ...args: Hex[]]

type NormalizedThorSimulationEvent = {
  address: Address
  topics: EventTopics
  data: Hex
}

export type RecoveryTransferItem = {
  id: string
  kind: 'vet' | 'erc20' | 'nft'
  symbol: string
  label: string
  amount?: bigint
  decimals?: number
  tokenAddress?: Address
  tokenId?: bigint
  iconUrl?: string
  displayValue: string
}

export type RecoverySimulationSummary = {
  reverted: boolean
  clauseCount: number
  items: RecoveryTransferItem[]
  errorText?: string
}

type SummarizeInput = {
  ownerAddress: Address
  galaxyMemberAddress: Address
  tokenList: readonly TokenInfo[]
  knownNfts: readonly PoolGmNft[]
  results: readonly ThorSimulationResult[]
}

type SimulateInput = Omit<SummarizeInput, 'results' | 'galaxyMemberAddress'> & {
  config: AppConfig
  clauses: readonly RecoveryClause[]
}

const transferEventAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)'])
const nftTransferEventAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'])

const trimNodeUrl = (nodeUrl: string) => nodeUrl.replace(/\/+$/, '')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asAddress = (value: unknown): Address | undefined =>
  typeof value === 'string' && isAddress(value) ? value : undefined

const asHex = (value: unknown): Hex | undefined =>
  typeof value === 'string' && value.startsWith('0x') ? (value as Hex) : undefined

const asHexArray = (value: unknown): EventTopics | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const topics = value.map(asHex)
  if (!topics.every((item) => item !== undefined) || topics.length === 0) {
    return undefined
  }

  return topics as EventTopics
}

const parseQuantity = (value: unknown): bigint => {
  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(value)
  }

  if (typeof value !== 'string' || value.length === 0) {
    return 0n
  }

  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const isThorSimulationResultArray = (value: unknown): value is ThorSimulationResult[] => {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every(isRecord)
}

const normalizeEvent = (event: ThorSimulationEvent): NormalizedThorSimulationEvent | undefined => {
  const address = asAddress(event.address)
  const topics = asHexArray(event.topics)
  const data = asHex(event.data)

  if (!address || !topics || !data) {
    return undefined
  }

  return { address, topics, data }
}

const findToken = (tokens: readonly TokenInfo[], address: Address): TokenInfo | undefined =>
  tokens.find((token) => sameAddress(token.address, address))

const findNft = (nfts: readonly PoolGmNft[], tokenId: bigint): PoolGmNft | undefined =>
  nfts.find((nft) => nft.tokenId === tokenId)

const formatFungibleValue = (amount: bigint, decimals: number, symbol: string) =>
  `${formatTokenAmount(amount, decimals)} ${symbol}`

const addFungibleItem = (
  items: Map<string, RecoveryTransferItem>,
  nextItem: Omit<RecoveryTransferItem, 'displayValue'> & { amount: bigint; decimals: number },
) => {
  const existing = items.get(nextItem.id)
  const amount = (existing?.amount ?? 0n) + nextItem.amount

  items.set(nextItem.id, {
    ...nextItem,
    amount,
    displayValue: formatFungibleValue(amount, nextItem.decimals, nextItem.symbol),
  })
}

const addVetTransfers = (
  items: Map<string, RecoveryTransferItem>,
  ownerAddress: Address,
  transfers: readonly ThorSimulationTransfer[],
) => {
  transfers.forEach((transfer) => {
    const recipient = asAddress(transfer.recipient)
    const amount = parseQuantity(transfer.amount)

    if (!recipient || !sameAddress(recipient, ownerAddress) || amount <= 0n) {
      return
    }

    addFungibleItem(items, {
      id: 'vet',
      kind: 'vet',
      symbol: 'VET',
      label: 'VET',
      amount,
      decimals: 18,
    })
  })
}

const decodeFungibleTransferEvent = (event: NormalizedThorSimulationEvent) => {
  try {
    const decoded = decodeEventLog({
      abi: transferEventAbi,
      eventName: 'Transfer',
      data: event.data,
      topics: event.topics,
    })

    const from = asAddress(decoded.args.from)
    const to = asAddress(decoded.args.to)
    const value = parseQuantity(decoded.args.value)

    if (!from || !to) {
      return undefined
    }

    return { tokenAddress: event.address, from, to, value }
  } catch {
    return undefined
  }
}

const decodeNftTransferEvent = (event: NormalizedThorSimulationEvent) => {
  try {
    const decoded = decodeEventLog({
      abi: nftTransferEventAbi,
      eventName: 'Transfer',
      data: event.data,
      topics: event.topics,
    })

    const from = asAddress(decoded.args.from)
    const to = asAddress(decoded.args.to)
    const value = parseQuantity(decoded.args.tokenId)

    if (!from || !to) {
      return undefined
    }

    return { tokenAddress: event.address, from, to, value }
  } catch {
    return undefined
  }
}

const decodeTransferEvent = (event: ThorSimulationEvent, galaxyMemberAddress: Address) => {
  const normalized = normalizeEvent(event)
  if (!normalized) {
    return undefined
  }

  if (sameAddress(normalized.address, galaxyMemberAddress)) {
    return decodeNftTransferEvent(normalized)
  }

  return decodeFungibleTransferEvent(normalized)
}

const addTokenEvents = (
  items: Map<string, RecoveryTransferItem>,
  ownerAddress: Address,
  galaxyMemberAddress: Address,
  tokenList: readonly TokenInfo[],
  knownNfts: readonly PoolGmNft[],
  events: readonly ThorSimulationEvent[],
) => {
  events.forEach((event) => {
    const decoded = decodeTransferEvent(event, galaxyMemberAddress)

    if (!decoded || !sameAddress(decoded.to, ownerAddress)) {
      return
    }

    if (sameAddress(decoded.tokenAddress, galaxyMemberAddress)) {
      const knownNft = findNft(knownNfts, decoded.value)
      const tokenIdText = knownNft?.tokenIdText ?? decoded.value.toString()
      const id = `nft-${decoded.tokenAddress.toLowerCase()}-${tokenIdText}`

      items.set(id, {
        id,
        kind: 'nft',
        symbol: 'GM',
        label: `GM #${tokenIdText}`,
        tokenAddress: decoded.tokenAddress,
        tokenId: decoded.value,
        iconUrl: knownNft?.imageUrl,
        displayValue: `GM #${tokenIdText}`,
      })
      return
    }

    const token = findToken(tokenList, decoded.tokenAddress)
    const symbol = token?.symbol ?? 'TOKEN'
    const decimals = token?.decimals ?? 0
    const label = token?.symbol ?? shortAddress(decoded.tokenAddress)

    addFungibleItem(items, {
      id: `erc20-${decoded.tokenAddress.toLowerCase()}`,
      kind: 'erc20',
      symbol,
      label,
      tokenAddress: decoded.tokenAddress,
      amount: decoded.value,
      decimals,
      iconUrl: token?.iconUrl,
    })
  })
}

export const summarizeSimulationResults = ({
  ownerAddress,
  galaxyMemberAddress,
  tokenList,
  knownNfts,
  results,
}: SummarizeInput): RecoverySimulationSummary => {
  const items = new Map<string, RecoveryTransferItem>()

  results.forEach((result) => {
    addVetTransfers(items, ownerAddress, result.transfers ?? [])
    addTokenEvents(items, ownerAddress, galaxyMemberAddress, tokenList, knownNfts, result.events ?? [])
  })

  const revertedResult = results.find((result) => result.reverted)

  return {
    reverted: Boolean(revertedResult),
    clauseCount: results.length,
    items: [...items.values()],
    errorText: revertedResult?.vmError || (revertedResult ? 'Transaction would revert.' : undefined),
  }
}

export async function simulateRecoveryTransaction({
  config,
  ownerAddress,
  clauses,
  tokenList,
  knownNfts,
}: SimulateInput): Promise<RecoverySimulationSummary> {
  const response = await fetch(`${trimNodeUrl(config.nodeUrl)}/accounts/*`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      caller: ownerAddress,
      gas: 50_000_000,
      gasPrice: '0x0',
      clauses: clauses.map((clause) => ({
        to: clause.to,
        value: clause.value,
        data: clause.data,
      })),
    }),
  })

  if (!response.ok) {
    throw new Error(`You need to use a working VeChain node. Simulation failed: ${response.statusText}`)
  }

  const payload = (await response.json()) as unknown
  if (!isThorSimulationResultArray(payload)) {
    throw new Error('You need to use a VeChain node with Thor REST simulation support.')
  }

  return summarizeSimulationResults({
    ownerAddress,
    galaxyMemberAddress: config.addresses.galaxyMember,
    tokenList,
    knownNfts,
    results: payload,
  })
}
