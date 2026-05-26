import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import { RecoveryDashboard } from './RecoveryDashboard'
import {
  demoAssets,
  demoB3trAddress,
  demoLongPoolTokenId,
  demoPools,
  demoTerms,
  demoVot3Address,
} from '../demoData'
import type { LockedTerm } from '../lib/lockedTerms'
import type { PoolAssetSnapshot, PoolInfo } from '../lib/pools'

const owner = '0x1111111111111111111111111111111111111111' as Address
const poolAddress = '0x2222222222222222222222222222222222222222' as Address
const b3tr = '0x3333333333333333333333333333333333333333' as Address
const vot3 = '0x4444444444444444444444444444444444444444' as Address

const pools: PoolInfo[] = [
  {
    tokenId: 1n,
    tokenIdText: '1',
    address: poolAddress,
  },
]

const assets: PoolAssetSnapshot = {
  poolAddress,
  vetBalance: 10n,
  tokenBalances: [
    {
      token: { address: b3tr, symbol: 'B3TR', name: 'B3TR', decimals: 18, source: 'core' },
      balance: 50n,
    },
    {
      token: { address: vot3, symbol: 'VOT3', name: 'VOT3', decimals: 18, source: 'core' },
      balance: 0n,
    },
  ],
}

const terms: LockedTerm[] = []

const renderDashboard = (overrides: Partial<React.ComponentProps<typeof RecoveryDashboard>> = {}) =>
  render(
    <RecoveryDashboard
      logoUrl="/logo.png"
      walletAddress={owner}
      walletControl={<button type="button">Wallet</button>}
      networkLabel="main"
      pools={pools}
      selectedPool={pools[0]}
      selectedPoolTokenId="1"
      assets={assets}
      terms={terms}
      b3trAddress={b3tr}
      vot3Address={vot3}
      isPoolsLoading={false}
      isAssetsLoading={false}
      isTermsLoading={false}
      isBusy={false}
      onSelectPool={vi.fn()}
      onRefresh={vi.fn()}
      onRecoverVet={vi.fn()}
      onRecoverToken={vi.fn()}
      onConvertVot3={vi.fn()}
      onRecoverAll={vi.fn()}
      onRecoverTerm={vi.fn()}
      {...overrides}
    />,
  )

describe('RecoveryDashboard', () => {
  it('shows connect empty state', () => {
    renderDashboard({ walletAddress: undefined, pools: [], selectedPool: undefined })
    expect(screen.getByText('CONNECT WALLET')).toBeInTheDocument()
  })

  it('renders owned pool list', () => {
    renderDashboard()
    expect(screen.getByRole('button', { name: /#1/ })).toBeInTheDocument()
    expect(screen.getByText('Pool #1')).toBeInTheDocument()
  })

  it('hides zero token rows', () => {
    renderDashboard()
    expect(screen.getAllByText('B3TR')).not.toHaveLength(0)
    expect(screen.queryByText('VOT3')).not.toBeInTheDocument()
  })

  it('disables action buttons while pending', async () => {
    const user = userEvent.setup()
    const onRecoverAll = vi.fn()
    renderDashboard({ isBusy: true, onRecoverAll })

    const button = screen.getByRole('button', { name: 'Recover all' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onRecoverAll).not.toHaveBeenCalled()
  })

  it('shows scan loading indicator while scanning pools', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const view = renderDashboard({ isPoolsLoading: true, onRefresh })

    const button = screen.getByRole('button', { name: 'Scanning pools' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(view.container.querySelector('.button-spinner')).toBeInTheDocument()

    await user.click(button)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('renders demo balances and term actions', () => {
    const view = renderDashboard({
      pools: demoPools,
      selectedPool: demoPools[0],
      selectedPoolTokenId: demoLongPoolTokenId.toString(),
      assets: demoAssets,
      terms: demoTerms,
      b3trAddress: demoB3trAddress,
      vot3Address: demoVot3Address,
    })

    expect(screen.getByText('Pool #123456...7890')).toBeInTheDocument()
    expect(screen.queryByText(`Pool #${demoLongPoolTokenId.toString()}`)).not.toBeInTheDocument()
    expect(screen.queryByText('NATIVE')).not.toBeInTheDocument()
    expect(screen.getAllByText('VET')).not.toHaveLength(0)
    expect(screen.getAllByText('B3TR')).not.toHaveLength(0)
    expect(screen.getAllByText('VOT3')).not.toHaveLength(0)
    expect(screen.getAllByText('veB3TR')).not.toHaveLength(0)
    expect(screen.getAllByText('SHA')).not.toHaveLength(0)
    expect(screen.queryByText('OCE')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close + withdraw' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Withdraw term' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'No action' })).toHaveLength(2)
    expect(view.container.querySelectorAll('.token-icon')).not.toHaveLength(0)
    expect(view.container.querySelector('img[src*="735a5e4a70116463649aa9c508b5d18361f10ab7.png"]')).toBeInTheDocument()
  })
})
