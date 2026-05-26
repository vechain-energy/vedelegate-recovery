import { encodeAbiParameters, encodeEventTopics, parseAbi, type Address, type Hex } from 'viem'
import { describe, expect, it } from 'vitest'
import type { TokenInfo } from './tokens'
import { summarizeSimulationResults, type ThorSimulationEvent } from './simulation'

const transferAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)'])
const nftTransferAbi = parseAbi(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'])

const signer = '0x1111111111111111111111111111111111111111' as Address
const pool = '0x2222222222222222222222222222222222222222' as Address
const b3tr = '0x3333333333333333333333333333333333333333' as Address
const unknownToken = '0x4444444444444444444444444444444444444444' as Address
const galaxyMember = '0x5555555555555555555555555555555555555555' as Address

const tokenList: TokenInfo[] = [
  {
    address: b3tr,
    symbol: 'B3TR',
    name: 'B3TR',
    decimals: 18,
    iconUrl: 'https://example.com/b3tr.png',
    source: 'core',
  },
]

const transferEvent = (address: Address, from: Address, to: Address, value: bigint): ThorSimulationEvent => ({
  address,
  topics: encodeEventTopics({
    abi: transferAbi,
    eventName: 'Transfer',
    args: { from, to },
  }) as Hex[],
  data: encodeAbiParameters([{ type: 'uint256' }], [value]),
})

const nftTransferEvent = (address: Address, from: Address, to: Address, tokenId: bigint): ThorSimulationEvent => ({
  address,
  topics: encodeEventTopics({
    abi: nftTransferAbi,
    eventName: 'Transfer',
    args: { from, to, tokenId },
  }) as Hex[],
  data: '0x',
})

describe('simulation summaries', () => {
  it('counts native VET transfers sent to the signer', () => {
    const summary = summarizeSimulationResults({
      ownerAddress: signer,
      galaxyMemberAddress: galaxyMember,
      tokenList,
      knownNfts: [],
      results: [
        {
          transfers: [
            { sender: pool, recipient: signer, amount: '1000000000000000000' },
            { sender: pool, recipient: '0x9999999999999999999999999999999999999999', amount: '3' },
          ],
          events: [],
          reverted: false,
        },
      ],
    })

    expect(summary.reverted).toBe(false)
    expect(summary.items).toEqual([
      expect.objectContaining({
        kind: 'vet',
        symbol: 'VET',
        amount: 1000000000000000000n,
        displayValue: '1 VET',
      }),
    ])
  })

  it('counts ERC20 transfers sent to the signer and de-dupes by token', () => {
    const summary = summarizeSimulationResults({
      ownerAddress: signer,
      galaxyMemberAddress: galaxyMember,
      tokenList,
      knownNfts: [],
      results: [
        {
          transfers: [],
          events: [
            transferEvent(b3tr, pool, signer, 2_000000000000000000n),
            transferEvent(b3tr, pool, signer, 3_000000000000000000n),
            transferEvent(b3tr, pool, pool, 7_000000000000000000n),
          ],
          reverted: false,
        },
      ],
    })

    expect(summary.items).toEqual([
      expect.objectContaining({
        kind: 'erc20',
        symbol: 'B3TR',
        amount: 5_000000000000000000n,
        displayValue: '5 B3TR',
        iconUrl: 'https://example.com/b3tr.png',
      }),
    ])
  })

  it('detects GM NFT transfers sent to the signer', () => {
    const summary = summarizeSimulationResults({
      ownerAddress: signer,
      galaxyMemberAddress: galaxyMember,
      tokenList,
      knownNfts: [
        {
          tokenId: 8102n,
          tokenIdText: '8102',
          level: 7n,
          tokenUri: 'ipfs://metadata',
          imageUrl: 'https://example.com/gm.png',
          nodeIdAttached: 0n,
          isAttachedToNode: false,
        },
      ],
      results: [
        {
          transfers: [],
          events: [nftTransferEvent(galaxyMember, pool, signer, 8102n)],
          reverted: false,
        },
      ],
    })

    expect(summary.items).toEqual([
      expect.objectContaining({
        kind: 'nft',
        symbol: 'GM',
        tokenId: 8102n,
        displayValue: 'GM #8102',
        iconUrl: 'https://example.com/gm.png',
      }),
    ])
  })

  it('marks reverted simulation and keeps unknown incoming token events visible', () => {
    const summary = summarizeSimulationResults({
      ownerAddress: signer,
      galaxyMemberAddress: galaxyMember,
      tokenList,
      knownNfts: [],
      results: [
        {
          transfers: [],
          events: [transferEvent(unknownToken, pool, signer, 12n)],
          reverted: true,
          vmError: 'execution reverted',
        },
      ],
    })

    expect(summary.reverted).toBe(true)
    expect(summary.errorText).toBe('execution reverted')
    expect(summary.items).toEqual([
      expect.objectContaining({
        kind: 'erc20',
        symbol: 'TOKEN',
        amount: 12n,
        displayValue: '12 TOKEN',
      }),
    ])
  })
})
