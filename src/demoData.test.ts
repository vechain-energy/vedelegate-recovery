import { describe, expect, it } from 'vitest'
import { demoAssets, demoB3trAddress, demoPools, demoTerms, demoVeb3trAddress, demoVot3Address } from './demoData'

describe('demo data', () => {
  it('covers liquid balance scenarios', () => {
    expect(demoPools).toHaveLength(2)
    expect(demoAssets.vetBalance).toBeGreaterThan(0n)

    const balances = new Map(demoAssets.tokenBalances.map((item) => [item.token.symbol, item]))
    expect(balances.get('B3TR')?.token.address).toBe(demoB3trAddress)
    expect(balances.get('B3TR')?.balance).toBeGreaterThan(0n)
    expect(balances.get('VOT3')?.token.address).toBe(demoVot3Address)
    expect(balances.get('VOT3')?.balance).toBeGreaterThan(0n)
    expect(balances.get('veB3TR')?.token.address).toBe(demoVeb3trAddress)
    expect(balances.get('veB3TR')?.balance).toBeGreaterThan(0n)
    expect(balances.get('SHA')?.token.source).toBe('registry')
    expect(balances.get('SHA')?.balance).toBeGreaterThan(0n)
    expect(balances.get('OCE')?.balance).toBe(0n)
  })

  it('covers locked term action scenarios', () => {
    expect(demoTerms.map((term) => term.status)).toEqual([
      'ended',
      'ended',
      'locked',
      'closed-ready',
      'closed-empty',
    ])
    expect(demoTerms.some((term) => term.metadata.autoRenew && term.actionKind === 'close-ended')).toBe(true)
    expect(demoTerms.some((term) => !term.metadata.autoRenew && term.actionKind === 'close-ended')).toBe(true)
    expect(demoTerms.some((term) => term.actionKind === 'withdraw-closed')).toBe(true)
    expect(demoTerms.filter((term) => term.actionKind === 'none')).toHaveLength(2)
  })
})
