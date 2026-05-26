import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { ConnectedWalletButton, HeaderWalletControl, shortWalletLabel } from './HeaderWalletControl'

const kitMock = vi.hoisted(() => ({
  openAccount: vi.fn(),
  openConnect: vi.fn(),
  walletState: {
    account: null as { address?: string; domain?: string; image?: string } | null,
    connection: {
      isConnected: false,
      isLoading: false,
    },
  },
}))

vi.mock('@vechain/vechain-kit', () => ({
  useAccountModal: () => ({ close: () => undefined, isOpen: false, open: kitMock.openAccount }),
  useConnectModal: () => ({ close: () => undefined, isOpen: false, open: kitMock.openConnect }),
  useWallet: () => kitMock.walletState,
}))

const address = '0xc0a50000000000000000000000000000000037f7' as Address

describe('HeaderWalletControl', () => {
  beforeEach(() => {
    kitMock.openAccount.mockClear()
    kitMock.openConnect.mockClear()
    kitMock.walletState.account = null
    kitMock.walletState.connection.isConnected = false
    kitMock.walletState.connection.isLoading = false
  })

  it('opens VeChain Kit connect modal from a local button', async () => {
    const user = userEvent.setup()
    render(<HeaderWalletControl isDemoMode={false} logoUrl="/logo.png" />)

    const button = screen.getByRole('button', { name: 'Connect' })
    expect(button).toHaveClass('wallet-connect-button')

    await user.click(button)
    expect(kitMock.openConnect).toHaveBeenCalledTimes(1)
  })

  it('shortens long wallet names without hiding the address title', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const domain = 'arrow.vedelegate.extra-long-name.vet'

    const view = render(
      <ConnectedWalletButton
        address={address}
        domain={domain}
        image="https://example.com/avatar.png"
        fallbackLogoUrl="/logo.png"
        onOpen={onOpen}
      />,
    )

    const button = screen.getByRole('button', { name: 'Open wallet 0xc0a5...37f7' })
    const image = view.container.querySelector('.wallet-chip-image')
    if (!image) {
      throw new Error('Wallet image is missing.')
    }

    expect(button).toHaveAttribute('title', `${domain} / ${address}`)
    expect(screen.getByText('arrow.vedelegat...vet')).toBeInTheDocument()
    expect(screen.getByText('0xc0a5...37f7')).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.png')

    await user.click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('uses the fallback logo when no wallet image exists', () => {
    const view = render(<ConnectedWalletButton address={address} fallbackLogoUrl="/logo.png" onOpen={vi.fn()} />)
    const image = view.container.querySelector('.wallet-chip-image')
    if (!image) {
      throw new Error('Wallet image is missing.')
    }

    expect(image).toHaveAttribute('src', '/logo.png')
    expect(screen.getAllByText('0xc0a5...37f7')).toHaveLength(2)
  })

  it('leaves short wallet names unchanged', () => {
    expect(shortWalletLabel('arrow.vedelegate.vet')).toBe('arrow.vedelegate.vet')
  })
})
