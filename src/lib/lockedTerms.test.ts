import { describe, expect, it } from 'vitest'
import { computeTermStatus } from './lockedTerms'

describe('locked term status', () => {
  it('marks active unended terms as locked with no action', () => {
    expect(computeTermStatus({ isActive: true }, false, 1n, 0n)).toEqual({
      status: 'locked',
      actionKind: 'none',
    })
  })

  it('marks active ended terms as closeable', () => {
    expect(computeTermStatus({ isActive: true }, true, 0n, 0n)).toEqual({
      status: 'ended',
      actionKind: 'close-ended',
    })
  })

  it('marks closed funded terms as withdrawable', () => {
    expect(computeTermStatus({ isActive: false }, true, 0n, 4n)).toEqual({
      status: 'closed-ready',
      actionKind: 'withdraw-closed',
    })
  })
})
