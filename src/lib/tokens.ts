import { isAddress, type Address } from 'viem'
import type { AppConfig } from '../config'

export type TokenInfo = {
  address: Address
  symbol: string
  name: string
  decimals: number
  iconUrl?: string
  source: 'core' | 'registry'
}

type RegistryToken = {
  address: Address
  symbol: string
  name: string
  decimals: number
  icon?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const parseRegistryToken = (value: unknown): RegistryToken | null => {
  if (!isRecord(value)) {
    return null
  }

  const address = value.address
  const symbol = value.symbol
  const name = value.name
  const decimals = value.decimals
  const icon = value.icon

  if (
    typeof address !== 'string' ||
    !isAddress(address) ||
    typeof symbol !== 'string' ||
    typeof name !== 'string' ||
    typeof decimals !== 'number'
  ) {
    return null
  }

  return {
    address,
    symbol,
    name,
    decimals,
    icon: typeof icon === 'string' ? icon : undefined,
  }
}

export const getCoreTokens = (config: AppConfig): TokenInfo[] => [
  {
    address: config.addresses.b3tr,
    symbol: 'B3TR',
    name: 'B3TR',
    decimals: 18,
    iconUrl: 'https://vechain.github.io/token-registry/assets/38b6a2fdff4c109128935762dc27853c773fef21.png',
    source: 'core',
  },
  {
    address: config.addresses.vot3,
    symbol: 'VOT3',
    name: 'VOT3',
    decimals: 18,
    iconUrl: 'https://vechain.github.io/token-registry/assets/dcc6e7f09932a389a536fe74107cd73af445dd65.png',
    source: 'core',
  },
  {
    address: config.addresses.veB3TR,
    symbol: 'veB3TR',
    name: 'veB3TR',
    decimals: 18,
    source: 'core',
  },
]

export const mergeTokens = (
  coreTokens: readonly TokenInfo[],
  registryTokens: readonly RegistryToken[],
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

  coreTokens.forEach(push)

  registryTokens.forEach((token) => {
    push({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      iconUrl: token.icon ? `https://vechain.github.io/token-registry/assets/${token.icon}` : undefined,
      source: 'registry',
    })
  })

  return merged
}

export const parseTokenRegistry = (
  payload: unknown,
  coreTokens: readonly TokenInfo[],
): TokenInfo[] => {
  if (!Array.isArray(payload)) {
    return [...coreTokens]
  }

  return mergeTokens(coreTokens, payload.map(parseRegistryToken).filter((token) => token !== null))
}

export async function fetchTokenRegistry(config: AppConfig): Promise<TokenInfo[]> {
  const coreTokens = getCoreTokens(config)
  const response = await fetch(config.tokenRegistryUrl)

  if (!response.ok) {
    return coreTokens
  }

  return parseTokenRegistry((await response.json()) as unknown, coreTokens)
}
