import { describe, expect, it } from 'vitest'
import type { AppConfig } from '../config'
import { getCoreTokens, parseTokenRegistry } from './tokens'

const config: AppConfig = {
  network: 'main',
  nodeUrl: 'https://mainnet.vechain.org',
  tokenRegistryUrl: 'https://vechain.github.io/token-registry/main.json',
  walletConnectProjectId: '',
  enableDemoData: false,
  addresses: {
    veDelegate: '0x1111111111111111111111111111111111111111',
    b3tr: '0x2222222222222222222222222222222222222222',
    vot3: '0x3333333333333333333333333333333333333333',
    veB3TR: '0x4444444444444444444444444444444444444444',
    lockedTerms: '0x5555555555555555555555555555555555555555',
  },
}

describe('token registry parsing', () => {
  it('keeps core tokens and de-dupes registry entries by address', () => {
    const core = getCoreTokens(config)
    const tokens = parseTokenRegistry(
      [
        {
          address: config.addresses.b3tr,
          symbol: 'B3TR-REG',
          name: 'B3TR registry',
          decimals: 18,
          icon: 'x.png',
        },
        {
          address: '0x6666666666666666666666666666666666666666',
          symbol: 'REG',
          name: 'Registry',
          decimals: 6,
          icon: 'reg.png',
        },
        { bad: true },
      ],
      core,
    )

    expect(tokens.map((token) => token.symbol)).toEqual(['B3TR', 'VOT3', 'veB3TR', 'REG'])
    expect(tokens[3]?.iconUrl).toBe('https://vechain.github.io/token-registry/assets/reg.png')
  })
})
