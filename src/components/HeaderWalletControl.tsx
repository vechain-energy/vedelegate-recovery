import { WalletButton } from '@vechain/vechain-kit'

type HeaderWalletControlProps = {
  isDemoMode: boolean
}

export function HeaderWalletControl({ isDemoMode }: HeaderWalletControlProps) {
  if (isDemoMode) {
    return (
      <button type="button" className="demo-wallet" disabled>
        Demo wallet
      </button>
    )
  }

  return <WalletButton connectionVariant="modal" desktopVariant="iconAndDomain" mobileVariant="iconAndDomain" />
}
