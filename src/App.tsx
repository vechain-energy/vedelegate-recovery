import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { VeChainKitProvider, WalletButton, useWallet, type VechainKitProviderProps } from '@vechain/vechain-kit'
import { isAddress } from 'viem'
import { appConfig } from './config'
import { RecoveryDashboard } from './components/RecoveryDashboard'
import { useLockedTerms, useOwnedPools, usePoolAssets, useTokenList } from './hooks/useRecoveryQueries'
import { useRecoveryActions } from './hooks/useRecoveryActions'

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
  const walletAddress = account?.address && isAddress(account.address) ? account.address : undefined
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState<string>()

  const tokenQuery = useTokenList(appConfig)
  const poolsQuery = useOwnedPools(appConfig, walletAddress)
  const pools = poolsQuery.data ?? []

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

  const assetQuery = usePoolAssets(appConfig, selectedPool?.address, tokenQuery.data)
  const termsQuery = useLockedTerms(appConfig, selectedPool?.address)
  const actions = useRecoveryActions(appConfig, walletAddress)

  const refresh = () => {
    void queryClientInstance.invalidateQueries()
  }

  const recoverVet = () => {
    if (!walletAddress || !selectedPool || !assetQuery.data || assetQuery.data.vetBalance <= 0n) {
      return
    }
    void actions.recoverVet(selectedPool.address, walletAddress, assetQuery.data.vetBalance)
  }

  const recoverAll = () => {
    if (!walletAddress || !selectedPool || !assetQuery.data) {
      return
    }
    void actions.recoverAll(selectedPool.address, walletAddress, assetQuery.data)
  }

  return (
    <>
      <RecoveryDashboard
        logoUrl={`${import.meta.env.BASE_URL}logo.png`}
        walletAddress={walletAddress}
        walletControl={<WalletButton />}
        networkLabel={appConfig.network}
        pools={pools}
        selectedPool={selectedPool}
        selectedPoolTokenId={selectedPool?.tokenIdText}
        assets={assetQuery.data}
        terms={termsQuery.data ?? []}
        b3trAddress={appConfig.addresses.b3tr}
        vot3Address={appConfig.addresses.vot3}
        isPoolsLoading={poolsQuery.isLoading}
        isAssetsLoading={assetQuery.isLoading || tokenQuery.isLoading}
        isTermsLoading={termsQuery.isLoading}
        isBusy={actions.isBusy}
        errorText={actions.error ?? poolsQuery.error?.message ?? assetQuery.error?.message ?? termsQuery.error?.message}
        onSelectPool={setSelectedPoolTokenId}
        onRefresh={refresh}
        onRecoverVet={recoverVet}
        onRecoverToken={(item) => {
          if (!walletAddress || !selectedPool) {
            return
          }
          void actions.recoverToken(selectedPool.address, walletAddress, item)
        }}
        onConvertVot3={(item) => {
          if (!selectedPool) {
            return
          }
          void actions.convertVot3(selectedPool.address, item.balance)
        }}
        onRecoverAll={recoverAll}
        onRecoverTerm={(term) => {
          if (!selectedPool) {
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
