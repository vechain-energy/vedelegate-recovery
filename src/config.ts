import { isAddress, type Address } from 'viem'

export type NetworkType = 'main' | 'test' | 'solo'

export type AppConfig = {
  network: NetworkType
  nodeUrl: string
  tokenRegistryUrl: string
  walletConnectProjectId: string
  enableDemoData: boolean
  delegationUrl?: string
  addresses: {
    veDelegate: Address
    b3tr: Address
    vot3: Address
    veB3TR: Address
    lockedTerms: Address
  }
}

const DEFAULTS = {
  nodeUrl: 'https://mainnet.vechain.org',
  veDelegate: '0xfc32a9895C78CE00A1047d602Bd81Ea8134CC32b',
  b3tr: '0x5ef79995FE8a89e0812330E4378eB2660ceDe699',
  vot3: '0x76Ca782B59C74d088C7D2Cce2f211BC00836c602',
  veB3TR: '0x420dFe6B7Bc605Ce61E9839c8c0E745870A6CDE0',
  lockedTerms: '0x807496420F89fF2AbF2e97C3AaA0886d6881dB8B',
} as const

const normalizeNetwork = (value: string | undefined): NetworkType => {
  if (value === 'test' || value === 'solo') {
    return value
  }
  return 'main'
}

export const asAddress = (value: string, label: string): Address => {
  if (!isAddress(value)) {
    throw new Error(`${label} is not a valid address.`)
  }
  return value
}

const getAddressEnv = (value: string | undefined, fallback: string, label: string) =>
  asAddress(value || fallback, label)

const network = normalizeNetwork(import.meta.env.VITE_NETWORK)

export const appConfig: AppConfig = {
  network,
  nodeUrl: import.meta.env.VITE_NODE_URL || DEFAULTS.nodeUrl,
  tokenRegistryUrl: `https://vechain.github.io/token-registry/${network === 'main' ? 'main' : 'test'}.json`,
  walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
  enableDemoData: import.meta.env.VITE_ENABLE_DEMO_DATA === 'true',
  delegationUrl: import.meta.env.VITE_DELEGATION_URL || undefined,
  addresses: {
    veDelegate: getAddressEnv(import.meta.env.VITE_VEDELEGATE_ADDRESS, DEFAULTS.veDelegate, 'VITE_VEDELEGATE_ADDRESS'),
    b3tr: getAddressEnv(import.meta.env.VITE_B3TR_ADDRESS, DEFAULTS.b3tr, 'VITE_B3TR_ADDRESS'),
    vot3: getAddressEnv(import.meta.env.VITE_VOT3_ADDRESS, DEFAULTS.vot3, 'VITE_VOT3_ADDRESS'),
    veB3TR: getAddressEnv(import.meta.env.VITE_VEB3TR_ADDRESS, DEFAULTS.veB3TR, 'VITE_VEB3TR_ADDRESS'),
    lockedTerms: getAddressEnv(import.meta.env.VITE_LOCKED_TERMS_ADDRESS, DEFAULTS.lockedTerms, 'VITE_LOCKED_TERMS_ADDRESS'),
  },
}
