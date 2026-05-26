import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoverySimulationSummary } from '../lib/simulation'
import { buildVechainStatsTxUrl, RecoveryTransactionModal } from './RecoveryTransactionModal'

const summary: RecoverySimulationSummary = {
  reverted: false,
  clauseCount: 3,
  items: [
    {
      id: 'vet',
      kind: 'vet',
      symbol: 'VET',
      label: 'VET',
      amount: 1000000000000000000n,
      decimals: 18,
      displayValue: '1 VET',
    },
    {
      id: 'erc20-0x3333333333333333333333333333333333333333',
      kind: 'erc20',
      symbol: 'B3TR',
      label: 'B3TR',
      amount: 5_000000000000000000n,
      decimals: 18,
      displayValue: '5 B3TR',
      iconUrl: 'https://example.com/b3tr.png',
    },
    {
      id: 'nft-0x5555555555555555555555555555555555555555-8102',
      kind: 'nft',
      symbol: 'GM',
      label: 'GM #8102',
      tokenId: 8102n,
      displayValue: 'GM #8102',
      iconUrl: 'https://example.com/gm.png',
    },
  ],
}

const txId = `0x${'1'.repeat(64)}`

describe('RecoveryTransactionModal', () => {
  it('shows a simple wallet recovery preview before signing', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <RecoveryTransactionModal
        isOpen
        title="Recover pool assets"
        phase="ready"
        network="main"
        summary={summary}
        isWalletWaiting={false}
        isChainPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Recover pool assets' })).toBeInTheDocument()
    expect(screen.getByText('Wallet receives')).toBeInTheDocument()
    expect(screen.getByText('1 VET')).toBeInTheDocument()
    expect(screen.getByText('5 B3TR')).toBeInTheDocument()
    expect(screen.getByText('GM #8102')).toBeInTheDocument()
    expect(screen.queryByText('TOKEN TO WALLET')).not.toBeInTheDocument()
    expect(screen.queryByText('NFT TO WALLET')).not.toBeInTheDocument()
    expect(screen.getByText('5 B3TR').closest('.tx-recovery-row')?.textContent?.trim()).toBe('5 B3TR')

    await user.click(screen.getByRole('button', { name: 'Sign transaction' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows pending signing state and disables actions', () => {
    render(
      <RecoveryTransactionModal
        isOpen
        title="Withdraw VET"
        phase="signing"
        network="main"
        summary={summary}
        isWalletWaiting
        isChainPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Waiting for signature')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Waiting' })).toBeDisabled()
  })

  it('shows a spinner in the pending button while waiting on chain', () => {
    render(
      <RecoveryTransactionModal
        isOpen
        title="Withdraw VET"
        phase="pending"
        network="main"
        summary={summary}
        txId={txId}
        isWalletWaiting={false}
        isChainPending
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    const pendingButton = screen.getByRole('button', { name: 'Pending' })

    expect(screen.getByText('Pending on chain')).toBeInTheDocument()
    expect(screen.getByText('TX PENDING')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0x11111111...11111111' })).toHaveAttribute(
      'href',
      buildVechainStatsTxUrl(txId),
    )
    expect(pendingButton).toBeDisabled()
    expect(pendingButton.querySelector('.button-spinner')).toBeInTheDocument()
  })

  it('shows success confirmation and keeps the transaction link', () => {
    render(
      <RecoveryTransactionModal
        isOpen
        title="Recover pool assets"
        phase="success"
        network="main"
        summary={summary}
        txId={txId}
        isWalletWaiting={false}
        isChainPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Recovered')).toBeInTheDocument()
    expect(screen.getByText('TX CONFIRMED')).toBeInTheDocument()
    expect(screen.getByText('Close to scan updated state.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0x11111111...11111111' })).toHaveAttribute(
      'href',
      buildVechainStatsTxUrl(txId),
    )
  })

  it('shows transaction errors without hiding the simulated recovery', () => {
    render(
      <RecoveryTransactionModal
        isOpen
        title="Withdraw VET"
        phase="error"
        network="main"
        summary={summary}
        errorText="Transaction reverted with: execution reverted"
        txId={txId}
        isWalletWaiting={false}
        isChainPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
    expect(screen.getByText('TX REVERTED')).toBeInTheDocument()
    expect(screen.getByText('Transaction reverted with: execution reverted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0x11111111...11111111' })).toHaveAttribute(
      'href',
      buildVechainStatsTxUrl(txId),
    )
    expect(screen.getByText('1 VET')).toBeInTheDocument()
  })
})
