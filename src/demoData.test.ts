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
    expect(balances.get('veB3TR')?.token.iconUrl).toBe(
      'https://vechain.github.io/token-registry/assets/1c641b86096d56bf13d49f38388accd6db8b8b2e.png',
    )
    expect(balances.get('SHA')?.token.source).toBe('registry')
    expect(balances.get('SHA')?.balance).toBeGreaterThan(0n)
    expect(balances.get('SHA')?.token.iconUrl).toBe(
      'https://vechain.github.io/token-registry/assets/735a5e4a70116463649aa9c508b5d18361f10ab7.png',
    )
    expect(balances.get('OCE')?.balance).toBe(0n)
  })

  it('covers GM NFT transfer scenarios', () => {
    expect(demoAssets.gmNfts).toHaveLength(2)
    expect(demoAssets.gmNfts.some((nft) => nft.isAttachedToNode && nft.nodeIdAttached > 0n)).toBe(true)
    expect(demoAssets.gmNfts.some((nft) => !nft.isAttachedToNode && nft.nodeIdAttached === 0n)).toBe(true)
    expect(demoAssets.gmNfts.every((nft) => nft.imageUrl?.startsWith('https://ipfs.io/ipfs/'))).toBe(true)
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
