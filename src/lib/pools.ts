import type { Address } from 'viem'
import { erc20Abi, poolAbi } from '../abis'
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

export type PoolAssetSnapshot = {
  poolAddress: Address
  vetBalance: bigint
  tokenBalances: PoolTokenBalance[]
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
  const [vetBalance, tokenBalances] = await Promise.all([
    getNativeVetBalance(config.nodeUrl, poolAddress),
    readTokenBalances(config, poolAddress, tokens),
  ])

  return {
    poolAddress,
    vetBalance,
    tokenBalances,
  }
}
