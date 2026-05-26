import type { ReactNode } from 'react'
import type { Address } from 'viem'
import { formatDateTime, formatTokenAmount, shortAddress, sameAddress } from '../lib/format'
import type { LockedTerm } from '../lib/lockedTerms'
import type { PoolAssetSnapshot, PoolInfo, PoolTokenBalance } from '../lib/pools'

type RecoveryDashboardProps = {
  logoUrl: string
  walletAddress?: Address
  walletControl: ReactNode
  networkLabel: string
  pools: PoolInfo[]
  selectedPool?: PoolInfo
  selectedPoolTokenId?: string
  assets?: PoolAssetSnapshot
  terms: LockedTerm[]
  b3trAddress: Address
  vot3Address: Address
  isPoolsLoading: boolean
  isAssetsLoading: boolean
  isTermsLoading: boolean
  isBusy: boolean
  errorText?: string
  onSelectPool: (tokenId: string) => void
  onRefresh: () => void
  onRecoverVet: () => void
  onRecoverToken: (tokenBalance: PoolTokenBalance) => void
  onConvertVot3: (tokenBalance: PoolTokenBalance) => void
  onRecoverAll: () => void
  onRecoverTerm: (term: LockedTerm) => void
}

const hasLiquidFunds = (assets?: PoolAssetSnapshot) => {
  if (!assets) {
    return false
  }
  return assets.vetBalance > 0n || assets.tokenBalances.some((item) => item.balance > 0n)
}

const statusLabel = (term: LockedTerm) => {
  switch (term.status) {
    case 'locked':
      return 'LOCKED'
    case 'ended':
      return term.metadata.autoRenew ? 'ENDED / AUTO' : 'ENDED'
    case 'closed-ready':
      return 'CLOSED / FUNDS'
    case 'closed-empty':
      return 'CLOSED'
  }
}

const actionLabel = (term: LockedTerm) => {
  if (term.actionKind === 'close-ended') {
    return 'Close + withdraw'
  }
  if (term.actionKind === 'withdraw-closed') {
    return 'Withdraw term'
  }
  return 'No action'
}

const symbolBadgeText = (symbol: string) => symbol.slice(0, 6)

const shortTokenId = (tokenId: string) => {
  if (tokenId.length <= 13) {
    return tokenId
  }

  return `${tokenId.slice(0, 6)}...${tokenId.slice(-4)}`
}

type TokenMarkProps = {
  symbol: string
  iconUrl?: string
}

function TokenMark({ symbol, iconUrl }: TokenMarkProps) {
  if (iconUrl) {
    return <img src={iconUrl} alt="" className="token-icon" />
  }

  return (
    <span className="token-symbol" aria-hidden="true">
      {symbolBadgeText(symbol)}
    </span>
  )
}

export function RecoveryDashboard({
  logoUrl,
  walletAddress,
  walletControl,
  networkLabel,
  pools,
  selectedPool,
  selectedPoolTokenId,
  assets,
  terms,
  b3trAddress,
  vot3Address,
  isPoolsLoading,
  isAssetsLoading,
  isTermsLoading,
  isBusy,
  errorText,
  onSelectPool,
  onRefresh,
  onRecoverVet,
  onRecoverToken,
  onConvertVot3,
  onRecoverAll,
  onRecoverTerm,
}: RecoveryDashboardProps) {
  const tokenBalances = assets?.tokenBalances.filter((item) => item.balance > 0n) ?? []
  const canRecoverAll = hasLiquidFunds(assets) && !isBusy

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logoUrl} alt="veDelegate" className="brand-logo" />
          <div>
            <h1>Pool Recovery</h1>
            <div className="brand-subline">{networkLabel.toUpperCase()} / SMART WALLET EXIT</div>
          </div>
        </div>
        <div className="wallet-zone">{walletControl}</div>
      </header>

      <main className="console-grid">
        <section className="pool-panel" aria-label="Owned pools">
          <div className="panel-head">
            <div>
              <h2>Pools</h2>
              <span>{walletAddress ? shortAddress(walletAddress) : 'NO WALLET'}</span>
            </div>
            <button
              type="button"
              className="ghost-button scan-button"
              onClick={onRefresh}
              disabled={!walletAddress || isBusy || isPoolsLoading}
              aria-busy={isPoolsLoading}
              aria-label={isPoolsLoading ? 'Scanning pools' : 'Scan'}
            >
              {isPoolsLoading ? <span className="button-spinner" aria-hidden="true" /> : null}
              <span>{isPoolsLoading ? 'Scanning' : 'Scan'}</span>
            </button>
          </div>

          {!walletAddress ? (
            <div className="empty-state">
              <strong>CONNECT WALLET</strong>
              <span>Owned pools load here.</span>
            </div>
          ) : isPoolsLoading ? (
            <div className="empty-state">SCANNING POOLS</div>
          ) : pools.length === 0 ? (
            <div className="empty-state">
              <strong>NO POOLS</strong>
              <span>Nothing owned by this wallet.</span>
            </div>
          ) : (
            <div className="pool-list">
              {pools.map((pool) => {
                const active = pool.tokenIdText === selectedPoolTokenId
                return (
                  <button
                    type="button"
                    key={pool.tokenIdText}
                    className={active ? 'pool-row active' : 'pool-row'}
                    title={`Pool #${pool.tokenIdText}`}
                    onClick={() => onSelectPool(pool.tokenIdText)}
                  >
                    <span>#{shortTokenId(pool.tokenIdText)}</span>
                    <code>{shortAddress(pool.address)}</code>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="detail-panel" aria-label="Pool recovery">
          <div className="pool-summary">
            <div>
              <h2 title={selectedPool ? `Pool #${selectedPool.tokenIdText}` : undefined}>
                {selectedPool ? `Pool #${shortTokenId(selectedPool.tokenIdText)}` : 'Select pool'}
              </h2>
              <span title={selectedPool ? selectedPool.address : undefined}>
                {selectedPool ? shortAddress(selectedPool.address) : 'NO POOL SELECTED'}
              </span>
            </div>
            <button type="button" className="action-button" onClick={onRecoverAll} disabled={!canRecoverAll}>
              Recover all
            </button>
          </div>

          {errorText ? <div className="error-line">{errorText}</div> : null}

          {!selectedPool ? (
            <div className="empty-state">SELECT POOL</div>
          ) : (
            <>
              <div className="section-block">
                <div className="section-title">
                  <span>Liquid funds</span>
                  {isAssetsLoading ? <em>LOADING</em> : <em>{tokenBalances.length + (assets?.vetBalance ? 1 : 0)} ITEMS</em>}
                </div>

                {isAssetsLoading ? (
                  <div className="empty-state compact">READING BALANCES</div>
                ) : !assets || !hasLiquidFunds(assets) ? (
                  <div className="empty-state compact">ZERO LIQUID BALANCE</div>
                ) : (
                  <div className="asset-table">
                    {assets.vetBalance > 0n ? (
                      <div className="asset-row">
                        <div className="asset-name">
                          <TokenMark symbol="VET" />
                          <span>
                            <strong>VET</strong>
                          </span>
                        </div>
                        <code>{formatTokenAmount(assets.vetBalance, 18)} VET</code>
                        <button type="button" className="action-button small" onClick={onRecoverVet} disabled={isBusy}>
                          Withdraw
                        </button>
                      </div>
                    ) : null}

                    {tokenBalances.map((item) => {
                      const isVot3 = sameAddress(item.token.address, vot3Address)
                      const isB3tr = sameAddress(item.token.address, b3trAddress)
                      return (
                        <div className="asset-row" key={item.token.address}>
                          <div className="asset-name">
                            <TokenMark symbol={item.token.symbol} iconUrl={item.token.iconUrl} />
                            <span>
                              <strong>{item.token.symbol}</strong>
                              <small>{shortAddress(item.token.address)}</small>
                            </span>
                          </div>
                          <code>{formatTokenAmount(item.balance, item.token.decimals)} {item.token.symbol}</code>
                          {isVot3 ? (
                            <button
                              type="button"
                              className="action-button small"
                              onClick={() => onConvertVot3(item)}
                              disabled={isBusy}
                            >
                              Convert
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={isB3tr ? 'action-button small' : 'ghost-button small'}
                              onClick={() => onRecoverToken(item)}
                              disabled={isBusy}
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="section-block">
                <div className="section-title">
                  <span>Locked terms</span>
                  {isTermsLoading ? <em>LOADING</em> : <em>{terms.length} TERMS</em>}
                </div>

                {isTermsLoading ? (
                  <div className="empty-state compact">READING TERMS</div>
                ) : terms.length === 0 ? (
                  <div className="empty-state compact">NO TERMS OWNED BY POOL</div>
                ) : (
                  <div className="term-list">
                    {terms.map((term) => (
                      <article className="term-card" key={term.tokenIdText}>
                        <div className="term-main">
                          <div>
                            <strong>TERM #{term.tokenIdText}</strong>
                            <span title={`Pool #${term.metadata.veDelegatePoolTokenId.toString()}`}>
                              POOL #{shortTokenId(term.metadata.veDelegatePoolTokenId.toString())}
                            </span>
                          </div>
                          <em>{statusLabel(term)}</em>
                        </div>
                        <div className="term-grid">
                          <span>
                            AMOUNT
                            <code>{formatTokenAmount(term.metadata.amount, 18)} B3TR</code>
                          </span>
                          <span>
                            END
                            <code>{formatDateTime(term.endTime)}</code>
                          </span>
                          <span>
                            HELD
                            <code>{formatTokenAmount(term.b3trBalance + term.vot3Balance, 18)} B3TR/VOT3</code>
                          </span>
                        </div>
                        <button
                          type="button"
                          className={term.actionKind === 'none' ? 'ghost-button small' : 'action-button small'}
                          onClick={() => onRecoverTerm(term)}
                          disabled={isBusy || term.actionKind === 'none'}
                        >
                          {actionLabel(term)}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
