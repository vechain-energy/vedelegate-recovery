import type { Address } from 'viem'
import type { LockedTerm } from './lib/lockedTerms'
import type { PoolAssetSnapshot, PoolInfo } from './lib/pools'

export const demoWalletAddress = '0xA11CE00000000000000000000000000000000000' as Address
export const demoB3trAddress = '0x5ef79995FE8a89e0812330E4378eB2660ceDe699' as Address
export const demoVot3Address = '0x76Ca782B59C74d088C7D2Cce2f211BC00836c602' as Address
export const demoVeb3trAddress = '0x420dFe6B7Bc605Ce61E9839c8c0E745870A6CDE0' as Address
const demoShaAddress = '0x5db3c8a942333f6468176a870db36eef120a34dc' as Address
const demoOceanAddress = '0x0ce6661b4ba86a0ea7ca2bd86a0de87b0b860f14' as Address

export const demoPools: PoolInfo[] = [
  {
    tokenId: 42n,
    tokenIdText: '42',
    address: '0xBEEF000000000000000000000000000000000042' as Address,
  },
  {
    tokenId: 77n,
    tokenIdText: '77',
    address: '0xBEEF000000000000000000000000000000000077' as Address,
  },
]

export const demoAssets: PoolAssetSnapshot = {
  poolAddress: demoPools[0]?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
  vetBalance: 1234567890000000000000n,
  tokenBalances: [
    {
      token: { address: demoB3trAddress, symbol: 'B3TR', name: 'B3TR', decimals: 18, source: 'core' },
      balance: 8042000000000000000000n,
    },
    {
      token: { address: demoVot3Address, symbol: 'VOT3', name: 'VOT3', decimals: 18, source: 'core' },
      balance: 1250000000000000000000n,
    },
    {
      token: { address: demoVeb3trAddress, symbol: 'veB3TR', name: 'veB3TR', decimals: 18, source: 'core' },
      balance: 530000000000000000000n,
    },
    {
      token: { address: demoShaAddress, symbol: 'SHA', name: 'Safe Haven', decimals: 18, source: 'registry' },
      balance: 72000000000000000000n,
    },
    {
      token: { address: demoOceanAddress, symbol: 'OCE', name: 'OceanEx', decimals: 18, source: 'registry' },
      balance: 0n,
    },
  ],
}

const demoEmptyAssets: PoolAssetSnapshot = {
  poolAddress: demoPools[1]?.address ?? ('0x0000000000000000000000000000000000000000' as Address),
  vetBalance: 0n,
  tokenBalances: [],
}

const termPoolAddress = '0x7000000000000000000000000000000000000088' as Address

export const demoTerms: LockedTerm[] = [
  {
    tokenId: 88n,
    tokenIdText: '88',
    metadata: {
      minter: demoWalletAddress,
      amount: 5000000000000000000000n,
      veDelegatePoolTokenId: 42n,
      optionId: 2n,
      startTime: 1710000000n,
      autoRenew: true,
      isActive: true,
      creationRoundId: 100n,
      lastModifiedRoundId: 110n,
    },
    option: {
      timeLength: 3n,
      multiplier: 120n,
      balance: 0n,
      isActive: true,
    },
    termPoolAddress,
    endTime: 1717776000,
    isEnded: true,
    status: 'ended',
    actionKind: 'close-ended',
    b3trBalance: 5100000000000000000000n,
    vot3Balance: 900000000000000000000n,
  },
  {
    tokenId: 89n,
    tokenIdText: '89',
    metadata: {
      minter: demoWalletAddress,
      amount: 3000000000000000000000n,
      veDelegatePoolTokenId: 42n,
      optionId: 2n,
      startTime: 1712000000n,
      autoRenew: false,
      isActive: true,
      creationRoundId: 115n,
      lastModifiedRoundId: 116n,
    },
    option: {
      timeLength: 3n,
      multiplier: 120n,
      balance: 0n,
      isActive: true,
    },
    termPoolAddress: '0x7000000000000000000000000000000000000089' as Address,
    endTime: 1719776000,
    isEnded: true,
    status: 'ended',
    actionKind: 'close-ended',
    b3trBalance: 3000000000000000000000n,
    vot3Balance: 0n,
  },
  {
    tokenId: 91n,
    tokenIdText: '91',
    metadata: {
      minter: demoWalletAddress,
      amount: 2500000000000000000000n,
      veDelegatePoolTokenId: 42n,
      optionId: 4n,
      startTime: 1790000000n,
      autoRenew: false,
      isActive: true,
      creationRoundId: 130n,
      lastModifiedRoundId: 130n,
    },
    option: {
      timeLength: 6n,
      multiplier: 150n,
      balance: 0n,
      isActive: true,
    },
    termPoolAddress: '0x7000000000000000000000000000000000000091' as Address,
    endTime: 1805552000,
    isEnded: false,
    status: 'locked',
    actionKind: 'none',
    b3trBalance: 0n,
    vot3Balance: 0n,
  },
  {
    tokenId: 93n,
    tokenIdText: '93',
    metadata: {
      minter: demoWalletAddress,
      amount: 4000000000000000000000n,
      veDelegatePoolTokenId: 42n,
      optionId: 3n,
      startTime: 1705000000n,
      autoRenew: false,
      isActive: false,
      creationRoundId: 90n,
      lastModifiedRoundId: 140n,
    },
    option: {
      timeLength: 3n,
      multiplier: 120n,
      balance: 0n,
      isActive: true,
    },
    termPoolAddress: '0x7000000000000000000000000000000000000093' as Address,
    endTime: 1712776000,
    isEnded: true,
    status: 'closed-ready',
    actionKind: 'withdraw-closed',
    b3trBalance: 4000000000000000000000n,
    vot3Balance: 300000000000000000000n,
  },
  {
    tokenId: 94n,
    tokenIdText: '94',
    metadata: {
      minter: demoWalletAddress,
      amount: 1000000000000000000000n,
      veDelegatePoolTokenId: 42n,
      optionId: 1n,
      startTime: 1700000000n,
      autoRenew: false,
      isActive: false,
      creationRoundId: 80n,
      lastModifiedRoundId: 120n,
    },
    option: {
      timeLength: 1n,
      multiplier: 100n,
      balance: 0n,
      isActive: true,
    },
    termPoolAddress: '0x7000000000000000000000000000000000000094' as Address,
    endTime: 1702592000,
    isEnded: true,
    status: 'closed-empty',
    actionKind: 'none',
    b3trBalance: 0n,
    vot3Balance: 0n,
  },
]

export const getDemoAssets = (tokenIdText?: string): PoolAssetSnapshot | undefined => {
  if (!tokenIdText) {
    return undefined
  }

  return tokenIdText === '77' ? demoEmptyAssets : demoAssets
}

export const getDemoTerms = (tokenIdText?: string): LockedTerm[] =>
  tokenIdText === '77' ? [] : demoTerms
