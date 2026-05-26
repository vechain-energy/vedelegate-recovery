import { useAccountModal, useConnectModal, useWallet } from '@vechain/vechain-kit'
import { isAddress, type Address } from 'viem'
import { shortAddress } from '../lib/format'

type HeaderWalletControlProps = {
  isDemoMode: boolean
  logoUrl: string
}

type ConnectedWalletButtonProps = {
  address: Address
  domain?: string
  image?: string
  fallbackLogoUrl: string
  onOpen: () => void
}

export const shortWalletLabel = (value: string) => {
  if (value.length <= 22) {
    return value
  }

  return `${value.slice(0, 15)}...${value.slice(-3)}`
}

export function ConnectedWalletButton({ address, domain, image, fallbackLogoUrl, onOpen }: ConnectedWalletButtonProps) {
  const name = shortWalletLabel(domain ?? shortAddress(address))

  return (
    <button
      type="button"
      className="wallet-chip"
      title={domain ? `${domain} / ${address}` : address}
      aria-label={`Open wallet ${shortAddress(address)}`}
      onClick={onOpen}
    >
      <img src={image ?? fallbackLogoUrl} alt="" className="wallet-chip-image" />
      <span className="wallet-chip-text">
        <strong>{name}</strong>
        <code>{shortAddress(address)}</code>
      </span>
    </button>
  )
}

export function HeaderWalletControl({ isDemoMode, logoUrl }: HeaderWalletControlProps) {
  const { account, connection } = useWallet()
  const accountModal = useAccountModal()
  const connectModal = useConnectModal()

  if (isDemoMode) {
    return (
      <button type="button" className="demo-wallet" disabled>
        Demo wallet
      </button>
    )
  }

  if (!connection.isConnected || !account?.address || !isAddress(account.address)) {
    return (
      <button type="button" className="wallet-connect-button" onClick={() => connectModal.open()} disabled={connection.isLoading}>
        {connection.isLoading ? 'Connecting' : 'Connect'}
      </button>
    )
  }

  return (
    <ConnectedWalletButton
      address={account.address}
      domain={account.domain}
      image={account.image}
      fallbackLogoUrl={logoUrl}
      onOpen={accountModal.open}
    />
  )
}
