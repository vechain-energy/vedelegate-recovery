import { describe, expect, it } from 'vitest'
import { ipfsToHttpUrl, mapGmNftReadResults, mapPoolOwnership, parseNftMetadataImage } from './pools'

describe('pool discovery mapping', () => {
  it('maps token ids to pool addresses', () => {
    expect(
      mapPoolOwnership([1n, 2n], [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ]),
    ).toEqual([
      {
        tokenId: 1n,
        tokenIdText: '1',
        address: '0x1111111111111111111111111111111111111111',
      },
      {
        tokenId: 2n,
        tokenIdText: '2',
        address: '0x2222222222222222222222222222222222222222',
      },
    ])
  })
})

describe('GM NFT discovery mapping', () => {
  it('maps GM NFT reads and only marks attached when node id is non-zero', () => {
    expect(
      mapGmNftReadResults(
        [12n, 13n],
        [1n, 7n],
        ['ipfs://earth-meta', 'ipfs://saturn-meta'],
        [0n, 777n],
        ['https://ipfs.io/ipfs/earth-image', 'https://ipfs.io/ipfs/saturn-image'],
      ),
    ).toEqual([
      {
        tokenId: 12n,
        tokenIdText: '12',
        level: 1n,
        tokenUri: 'ipfs://earth-meta',
        imageUrl: 'https://ipfs.io/ipfs/earth-image',
        nodeIdAttached: 0n,
        isAttachedToNode: false,
      },
      {
        tokenId: 13n,
        tokenIdText: '13',
        level: 7n,
        tokenUri: 'ipfs://saturn-meta',
        imageUrl: 'https://ipfs.io/ipfs/saturn-image',
        nodeIdAttached: 777n,
        isAttachedToNode: true,
      },
    ])
  })

  it('parses NFT metadata images through an IPFS gateway', () => {
    expect(parseNftMetadataImage({ image: 'ipfs://bafyabc/7.png' })).toBe('https://ipfs.io/ipfs/bafyabc/7.png')
    expect(ipfsToHttpUrl('https://example.com/gm.png')).toBe('https://example.com/gm.png')
  })
})
