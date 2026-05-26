import { useCallback, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { VeChainKitProvider, useWallet, type VechainKitProviderProps } from '@vechain/vechain-kit'
import { isAddress } from 'viem'
import { appConfig } from './config'
import { VECHAIN_KIT_LANGUAGE } from './config/localization'
import { HeaderWalletControl } from './components/HeaderWalletControl'
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
          name: 'veDelegate.vet Pool Recovery',
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

const hiddenQuickActions: NonNullable<VechainKitProviderProps['hiddenQuickActions']> = ['send', 'swap', 'receive']

function RecoveryApp() {
  const { account } = useWallet()
  const queryClientInstance = useQueryClient()
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`
  const demoMode = appConfig.enableDemoData ? new URLSearchParams(window.location.search).get('demo') : undefined
  const isDemoBalances = demoMode === 'balances'
  const isDemoScanning = demoMode === 'scanning'
  const isDemoMode = isDemoBalances || isDemoScanning
  const connectedWalletAddress = account?.address && isAddress(account.address) ? account.address : undefined
  const walletAddress = isDemoMode ? demoWalletAddress : connectedWalletAddress
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState<string>()

  const tokenQuery = useTokenList(appConfig)
  const poolsQuery = useOwnedPools(appConfig, isDemoMode ? undefined : walletAddress)
  const pools = isDemoBalances ? demoPools : poolsQuery.data ?? []

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
  const assets = isDemoBalances ? getDemoAssets(selectedPool?.tokenIdText) : assetQuery.data
  const terms = isDemoBalances ? getDemoTerms(selectedPool?.tokenIdText) : termsQuery.data ?? []

  const refresh = useCallback(() => {
    if (isDemoMode) {
      return
    }
    void queryClientInstance.invalidateQueries()
  }, [isDemoMode, queryClientInstance])

  const actions = useRecoveryActions(appConfig, walletAddress, {
    tokenList: tokenQuery.data ?? [],
    onTransactionSettled: refresh,
  })

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
        logoUrl={logoUrl}
        walletAddress={walletAddress}
        walletControl={<HeaderWalletControl isDemoMode={isDemoMode} />}
        networkLabel={appConfig.network}
        pools={pools}
        selectedPool={selectedPool}
        selectedPoolTokenId={selectedPool?.tokenIdText}
        assets={assets}
        terms={terms}
        b3trAddress={appConfig.addresses.b3tr}
        vot3Address={appConfig.addresses.vot3}
        isPoolsLoading={isDemoScanning || (!isDemoMode && poolsQuery.isLoading)}
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
        onRecoverGmNft={(item) => {
          if (!walletAddress || !selectedPool || isDemoMode) {
            return
          }
          void actions.recoverGmNft(selectedPool.address, walletAddress, item)
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
        hiddenQuickActions={hiddenQuickActions}
        language={VECHAIN_KIT_LANGUAGE}
        darkMode
      >
        <RecoveryApp />
      </VeChainKitProvider>
    </QueryClientProvider>
  )
}
