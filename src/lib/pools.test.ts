import { describe, expect, it } from 'vitest'
import { mapPoolOwnership } from './pools'

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
