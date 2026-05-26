import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderWalletControl } from './HeaderWalletControl'

vi.mock('@vechain/vechain-kit', () => ({
  WalletButton: ({
    connectionVariant,
    desktopVariant,
    mobileVariant,
  }: {
    connectionVariant?: string
    desktopVariant?: string
    mobileVariant?: string
  }) => (
    <button
      type="button"
      data-connection-variant={connectionVariant}
      data-desktop-variant={desktopVariant}
      data-mobile-variant={mobileVariant}
    >
      Kit wallet
    </button>
  ),
}))

describe('HeaderWalletControl', () => {
  it('uses the VeChain Kit wallet button outside demo mode', () => {
    render(<HeaderWalletControl isDemoMode={false} />)

    const button = screen.getByRole('button', { name: 'Kit wallet' })
    expect(button).toHaveAttribute('data-connection-variant', 'modal')
    expect(button).toHaveAttribute('data-desktop-variant', 'iconAndDomain')
    expect(button).toHaveAttribute('data-mobile-variant', 'iconAndDomain')
  })

  it('shows a disabled demo wallet marker in demo mode', () => {
    render(<HeaderWalletControl isDemoMode />)

    expect(screen.getByRole('button', { name: 'Demo wallet' })).toBeDisabled()
  })
})
