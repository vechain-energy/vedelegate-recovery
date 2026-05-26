import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import type { AppConfig } from '../config'
import { fetchLockedTerms } from '../lib/lockedTerms'
import { fetchOwnedPools, fetchPoolAssets, type PoolInfo } from '../lib/pools'
import { fetchTokenRegistry, type TokenInfo } from '../lib/tokens'

export const useTokenList = (config: AppConfig) =>
  useQuery<TokenInfo[]>({
    queryKey: ['tokens', config.network, config.tokenRegistryUrl],
    queryFn: () => fetchTokenRegistry(config),
    staleTime: 60 * 60 * 1000,
  })

export const useOwnedPools = (config: AppConfig, ownerAddress?: Address) =>
  useQuery<PoolInfo[]>({
    queryKey: ['pools', config.addresses.veDelegate, ownerAddress],
    queryFn: () => {
      if (!ownerAddress) {
        return []
      }
      return fetchOwnedPools(config, ownerAddress)
    },
    enabled: Boolean(ownerAddress),
    staleTime: 30 * 1000,
  })

export const usePoolAssets = (
  config: AppConfig,
  poolAddress: Address | undefined,
  tokens: readonly TokenInfo[] | undefined,
) =>
  useQuery({
    queryKey: ['assets', poolAddress, tokens?.length ?? 0],
    queryFn: () => {
      if (!poolAddress || !tokens) {
        throw new Error('Pool and token list required.')
      }
      return fetchPoolAssets(config, poolAddress, tokens)
    },
    enabled: Boolean(poolAddress && tokens),
    staleTime: 30 * 1000,
  })

export const useLockedTerms = (config: AppConfig, poolAddress?: Address) =>
  useQuery({
    queryKey: ['lockedTerms', poolAddress, config.addresses.lockedTerms],
    queryFn: () => {
      if (!poolAddress) {
        throw new Error('Pool required.')
      }
      return fetchLockedTerms(config, poolAddress)
    },
    enabled: Boolean(poolAddress),
    staleTime: 30 * 1000,
  })
