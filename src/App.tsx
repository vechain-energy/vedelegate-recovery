import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { VeChainKitProvider, WalletButton, useWallet, type VechainKitProviderProps } from '@vechain/vechain-kit'
import { isAddress } from 'viem'
import { appConfig } from './config'
import { RecoveryDashboard } from './components/RecoveryDashboard'
import { useLockedTerms, useOwnedPools, usePoolAssets, useTokenList } from './hooks/useRecoveryQueries'
import { useRecoveryActions } from './hooks/useRecoveryActions'
import { demoPools, demoWalletAddress, getDemoAssets, getDemoTerms } from './demoData'

const hashQueryKey = (queryKey: readonly unknown[]): string =>
  JSON.stringify(queryKey, (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  )

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: hashQueryKey,
      retry: 1,
    },
  },
})

const walletConnectOptions: NonNullable<NonNullable<VechainKitProviderProps['dappKit']>['walletConnectOptions']> | undefined =
  appConfig.walletConnectProjectId
    ? {
        projectId: appConfig.walletConnectProjectId,
        metadata: {
          name: 'VeDelegate Pool Recovery',
          description: 'Recover funds from VeDelegate smart wallets.',
          url: window.location.origin,
          icons: [`${window.location.origin}${import.meta.env.BASE_URL}logo.png`],
        },
      }
    : undefined

const allowedWallets: NonNullable<NonNullable<VechainKitProviderProps['dappKit']>['allowedWallets']> =
  appConfig.walletConnectProjectId ? ['veworld', 'sync2', 'wallet-connect'] : ['veworld', 'sync2']

const loginMethods: VechainKitProviderProps['loginMethods'] = [
  { method: 'vechain', gridColumn: 4 },
  { method: 'ecosystem', gridColumn: 4 },
  { method: 'dappkit', gridColumn: 4 },
]

function RecoveryApp() {
  const { account } = useWallet()
  const queryClientInstance = useQueryClient()
  const isDemoMode = appConfig.enableDemoData && new URLSearchParams(window.location.search).get('demo') === 'balances'
  const connectedWalletAddress = account?.address && isAddress(account.address) ? account.address : undefined
  const walletAddress = isDemoMode ? demoWalletAddress : connectedWalletAddress
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState<string>()

  const tokenQuery = useTokenList(appConfig)
  const poolsQuery = useOwnedPools(appConfig, isDemoMode ? undefined : walletAddress)
  const pools = isDemoMode ? demoPools : poolsQuery.data ?? []

  const selectedPool = useMemo(() => {
    if (pools.length === 0) {
      return undefined
    }
    return pools.find((pool) => pool.tokenIdText === selectedPoolTokenId) ?? pools[0]
  }, [pools, selectedPoolTokenId])

  useEffect(() => {
    if (!selectedPoolTokenId && selectedPool) {
      setSelectedPoolTokenId(selectedPool.tokenIdText)
    }
  }, [selectedPool, selectedPoolTokenId])

  const assetQuery = usePoolAssets(appConfig, isDemoMode ? undefined : selectedPool?.address, tokenQuery.data)
  const termsQuery = useLockedTerms(appConfig, isDemoMode ? undefined : selectedPool?.address)
  const actions = useRecoveryActions(appConfig, walletAddress)
  const assets = isDemoMode ? getDemoAssets(selectedPool?.tokenIdText) : assetQuery.data
  const terms = isDemoMode ? getDemoTerms(selectedPool?.tokenIdText) : termsQuery.data ?? []

  const refresh = () => {
    if (isDemoMode) {
      return
    }
    void queryClientInstance.invalidateQueries()
  }

  const recoverVet = () => {
    if (!walletAddress || !selectedPool || !assets || assets.vetBalance <= 0n || isDemoMode) {
      return
    }
    void actions.recoverVet(selectedPool.address, walletAddress, assets.vetBalance)
  }

  const recoverAll = () => {
    if (!walletAddress || !selectedPool || !assets || isDemoMode) {
      return
    }
    void actions.recoverAll(selectedPool.address, walletAddress, assets)
  }

  return (
    <>
      <RecoveryDashboard
        logoUrl={`${import.meta.env.BASE_URL}logo.png`}
        walletAddress={walletAddress}
        walletControl={
          isDemoMode ? (
            <button type="button" className="demo-wallet" disabled>
              Demo wallet
            </button>
          ) : (
            <WalletButton />
          )
        }
        networkLabel={appConfig.network}
        pools={pools}
        selectedPool={selectedPool}
        selectedPoolTokenId={selectedPool?.tokenIdText}
        assets={assets}
        terms={terms}
        b3trAddress={appConfig.addresses.b3tr}
        vot3Address={appConfig.addresses.vot3}
        isPoolsLoading={!isDemoMode && poolsQuery.isLoading}
        isAssetsLoading={!isDemoMode && (assetQuery.isLoading || tokenQuery.isLoading)}
        isTermsLoading={!isDemoMode && termsQuery.isLoading}
        isBusy={!isDemoMode && actions.isBusy}
        errorText={
          isDemoMode ? undefined : actions.error ?? poolsQuery.error?.message ?? assetQuery.error?.message ?? termsQuery.error?.message
        }
        onSelectPool={setSelectedPoolTokenId}
        onRefresh={refresh}
        onRecoverVet={recoverVet}
        onRecoverToken={(item) => {
          if (!walletAddress || !selectedPool || isDemoMode) {
            return
          }
          void actions.recoverToken(selectedPool.address, walletAddress, item)
        }}
        onConvertVot3={(item) => {
          if (!selectedPool || isDemoMode) {
            return
          }
          void actions.convertVot3(selectedPool.address, item.balance)
        }}
        onRecoverAll={recoverAll}
        onRecoverTerm={(term) => {
          if (!selectedPool || isDemoMode) {
            return
          }
          void actions.recoverTerm(selectedPool.address, term)
        }}
      />
      {actions.modal}
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VeChainKitProvider
        network={{
          type: appConfig.network,
          nodeUrl: appConfig.nodeUrl,
        }}
        dappKit={{
          allowedWallets,
          usePersistence: true,
          walletConnectOptions,
        }}
        loginMethods={loginMethods}
        feeDelegation={
          appConfig.delegationUrl
            ? {
                delegatorUrl: appConfig.delegationUrl,
                delegateAllTransactions: false,
              }
            : undefined
        }
        loginModalUI={{
          logo: `${import.meta.env.BASE_URL}logo.png`,
          description: 'Recover VeDelegate pool funds.',
        }}
        darkMode
      >
        <RecoveryApp />
      </VeChainKitProvider>
    </QueryClientProvider>
  )
}
