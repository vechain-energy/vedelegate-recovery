import type { Address } from 'viem'
import { erc20Abi, galaxyMemberAbi, poolAbi } from '../abis'
import type { AppConfig } from '../config'
import { makeReadCall, executeReadCall, executeReadCalls, getNativeVetBalance, type ReadCall } from './thor'
import type { TokenInfo } from './tokens'

export type PoolInfo = {
  tokenId: bigint
  tokenIdText: string
  address: Address
}

export type PoolTokenBalance = {
  token: TokenInfo
  balance: bigint
}

export type PoolGmNft = {
  tokenId: bigint
  tokenIdText: string
  level: bigint
  tokenUri: string
  imageUrl?: string
  nodeIdAttached: bigint
  isAttachedToNode: boolean
}

export type PoolAssetSnapshot = {
  poolAddress: Address
  vetBalance: bigint
  tokenBalances: PoolTokenBalance[]
  gmNfts: PoolGmNft[]
}

export const mapPoolOwnership = (
  tokenIds: readonly bigint[],
  poolAddresses: readonly Address[],
): PoolInfo[] =>
  tokenIds.map((tokenId, index) => ({
    tokenId,
    tokenIdText: tokenId.toString(),
    address: poolAddresses[index] ?? '0x0000000000000000000000000000000000000000',
  }))

export async function fetchOwnedPools(config: AppConfig, owner: Address): Promise<PoolInfo[]> {
  const ownedCount = await executeReadCall(
    config.nodeUrl,
    makeReadCall(config.addresses.veDelegate, poolAbi, 'balanceOf', [owner]),
  )

  if (ownedCount === 0n) {
    return []
  }

  const tokenIdCalls = Array.from({ length: Number(ownedCount) }, (_, index) =>
    makeReadCall(config.addresses.veDelegate, poolAbi, 'tokenOfOwnerByIndex', [owner, BigInt(index)]),
  )
  const tokenIds = await executeReadCalls(config.nodeUrl, tokenIdCalls)

  const poolAddressCalls = tokenIds.map((tokenId) =>
    makeReadCall(config.addresses.veDelegate, poolAbi, 'getPoolAddress', [tokenId]),
  )
  const poolAddresses = await executeReadCalls(config.nodeUrl, poolAddressCalls)

  return mapPoolOwnership(tokenIds, poolAddresses)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const ipfsToHttpUrl = (uri: string): string => {
  if (!uri.startsWith('ipfs://')) {
    return uri
  }

  return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length).replace(/^ipfs\//, '')}`
}

export const parseNftMetadataImage = (metadata: unknown): string | undefined => {
  if (!isRecord(metadata)) {
    return undefined
  }

  const image = metadata.image
  if (typeof image !== 'string' || image.length === 0) {
    return undefined
  }

  return ipfsToHttpUrl(image)
}

const fetchNftImageUrl = async (tokenUri: string): Promise<string | undefined> => {
  if (!tokenUri) {
    return undefined
  }

  try {
    const response = await fetch(ipfsToHttpUrl(tokenUri))
    if (!response.ok) {
      return undefined
    }

    return parseNftMetadataImage(await response.json())
  } catch {
    return undefined
  }
}

export const mapGmNftReadResults = (
  tokenIds: readonly bigint[],
  levels: readonly bigint[],
  tokenUris: readonly string[],
  nodeIds: readonly bigint[],
  imageUrls: readonly (string | undefined)[],
): PoolGmNft[] =>
  tokenIds.map((tokenId, index) => {
    const nodeIdAttached = nodeIds[index] ?? 0n
    return {
      tokenId,
      tokenIdText: tokenId.toString(),
      level: levels[index] ?? 0n,
      tokenUri: tokenUris[index] ?? '',
      imageUrl: imageUrls[index],
      nodeIdAttached,
      isAttachedToNode: nodeIdAttached > 0n,
    }
  })

async function readGmNfts(config: AppConfig, poolAddress: Address): Promise<PoolGmNft[]> {
  const ownedCount = await executeReadCall(
    config.nodeUrl,
    makeReadCall(config.addresses.galaxyMember, galaxyMemberAbi, 'balanceOf', [poolAddress]),
  )

  if (ownedCount === 0n) {
    return []
  }

  const tokenIds = await executeReadCalls(
    config.nodeUrl,
    Array.from({ length: Number(ownedCount) }, (_item, index) =>
      makeReadCall(config.addresses.galaxyMember, galaxyMemberAbi, 'tokenOfOwnerByIndex', [poolAddress, BigInt(index)]),
    ),
  )

  const [levels, tokenUris, nodeIds] = await Promise.all([
    executeReadCalls(
      config.nodeUrl,
      tokenIds.map((tokenId) => makeReadCall(config.addresses.galaxyMember, galaxyMemberAbi, 'levelOf', [tokenId])),
    ),
    executeReadCalls(
      config.nodeUrl,
      tokenIds.map((tokenId) => makeReadCall(config.addresses.galaxyMember, galaxyMemberAbi, 'tokenURI', [tokenId])),
    ),
    executeReadCalls(
      config.nodeUrl,
      tokenIds.map((tokenId) =>
        makeReadCall(config.addresses.galaxyMember, galaxyMemberAbi, 'getNodeIdAttached', [tokenId]),
      ),
    ),
  ])

  const imageUrls = await Promise.all(tokenUris.map(fetchNftImageUrl))

  return mapGmNftReadResults(tokenIds, levels, tokenUris, nodeIds, imageUrls)
}

async function readTokenBalances(
  config: AppConfig,
  poolAddress: Address,
  tokens: readonly TokenInfo[],
): Promise<PoolTokenBalance[]> {
  const calls = tokens.map((token) => ({
    token,
    call: makeReadCall(token.address, erc20Abi, 'balanceOf', [poolAddress]),
  }))

  const balances: PoolTokenBalance[] = []
  const chunkSize = 20

  for (let index = 0; index < calls.length; index += chunkSize) {
    const chunk = calls.slice(index, index + chunkSize)
    const readCalls: ReadCall<bigint>[] = chunk.map((item) => item.call)

    try {
      const chunkBalances = await executeReadCalls(config.nodeUrl, readCalls, chunkSize)
      chunkBalances.forEach((balance, balanceIndex) => {
        const item = chunk[balanceIndex]
        if (item) {
          balances.push({ token: item.token, balance })
        }
      })
    } catch {
      for (const item of chunk) {
        try {
          const balance = await executeReadCall(config.nodeUrl, item.call)
          balances.push({ token: item.token, balance })
        } catch {
          balances.push({ token: item.token, balance: 0n })
        }
      }
    }
  }

  return balances
}

export async function fetchPoolAssets(
  config: AppConfig,
  poolAddress: Address,
  tokens: readonly TokenInfo[],
): Promise<PoolAssetSnapshot> {
  const [vetBalance, tokenBalances, gmNfts] = await Promise.all([
    getNativeVetBalance(config.nodeUrl, poolAddress),
    readTokenBalances(config, poolAddress, tokens),
    readGmNfts(config, poolAddress),
  ])

  return {
    poolAddress,
    vetBalance,
    tokenBalances,
    gmNfts,
  }
}
