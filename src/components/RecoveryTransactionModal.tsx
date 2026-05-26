import type { RecoverySimulationSummary, RecoveryTransferItem } from '../lib/simulation'
import type { NetworkType } from '../config'

export type RecoveryTransactionPhase = 'simulating' | 'ready' | 'signing' | 'pending' | 'success' | 'error' | 'simulation-error'

type RecoveryTransactionModalProps = {
  isOpen: boolean
  title: string
  phase: RecoveryTransactionPhase
  network: NetworkType
  summary?: RecoverySimulationSummary
  errorText?: string
  txId?: string
  isWalletWaiting: boolean
  isChainPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export const buildVechainStatsTxUrl = (txId: string) => `https://vechainstats.com/transaction/${txId}/`

const shortTxId = (txId: string) => `${txId.slice(0, 10)}...${txId.slice(-8)}`

const phaseText = (
  phase: RecoveryTransactionPhase,
  isWalletWaiting: boolean,
  isChainPending: boolean,
): string => {
  if (phase === 'simulating') {
    return 'Checking recovery'
  }
  if (isWalletWaiting) {
    return 'Waiting for signature'
  }
  if (isChainPending || phase === 'pending') {
    return 'Pending on chain'
  }
  if (phase === 'success') {
    return 'Recovered'
  }
  if (phase === 'error') {
    return 'Transaction failed'
  }
  if (phase === 'simulation-error') {
    return 'Simulation failed'
  }
  return 'Ready to sign'
}

const canClose = (phase: RecoveryTransactionPhase, isWalletWaiting: boolean, isChainPending: boolean) =>
  !isWalletWaiting && !isChainPending && phase !== 'signing' && phase !== 'pending'

function TransferMark({ item }: { item: RecoveryTransferItem }) {
  if (item.iconUrl) {
    return <img src={item.iconUrl} alt="" className="tx-token-icon" />
  }

  return (
    <span className="tx-token-symbol" aria-hidden="true">
      {item.symbol.slice(0, 4)}
    </span>
  )
}

function TransferRow({ item }: { item: RecoveryTransferItem }) {
  return (
    <li className="tx-recovery-row">
      <div>
        <TransferMark item={item} />
        <span>
          <strong>{item.displayValue}</strong>
        </span>
      </div>
    </li>
  )
}

function TransactionLink({ txId }: { txId: string }) {
  return (
    <a href={buildVechainStatsTxUrl(txId)} target="_blank" rel="noreferrer" className="tx-link">
      {shortTxId(txId)}
    </a>
  )
}

function TxStatusDetails({
  phase,
  txId,
  errorText,
}: Pick<RecoveryTransactionModalProps, 'phase' | 'txId' | 'errorText' | 'network'>) {
  if (phase === 'pending') {
    return (
      <div className="tx-status-note">
        <strong>TX PENDING</strong>
        {txId ? <TransactionLink txId={txId} /> : <span>TX ID WAITING FOR NODE</span>}
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="tx-status-note success">
        <strong>TX CONFIRMED</strong>
        {txId ? <TransactionLink txId={txId} /> : <span>Recovery confirmed.</span>}
      </div>
    )
  }

  if (phase === 'error') {
    const isRevert = errorText?.toLowerCase().includes('revert') ?? false

    return (
      <div className="tx-status-note error">
        <strong>{isRevert ? 'TX REVERTED' : 'TX FAILED'}</strong>
        {txId ? <TransactionLink txId={txId} /> : null}
        <span>{errorText ?? 'Transaction failed.'}</span>
      </div>
    )
  }

  if (phase === 'simulation-error') {
    return (
      <div className="tx-status-note error">
        <strong>SIMULATION FAILED</strong>
        <span>{errorText ?? 'Transaction would not execute.'}</span>
      </div>
    )
  }

  return null
}

function ModalBody({
  summary,
  phase,
  errorText,
  txId,
  network,
}: Pick<RecoveryTransactionModalProps, 'summary' | 'phase' | 'errorText' | 'txId' | 'network'>) {
  if (phase === 'simulating') {
    return <div className="tx-empty">SIMULATING CLAUSES</div>
  }

  return (
    <>
      <div className="tx-section-title">
        <span>Wallet receives</span>
        <em>{summary?.items.length ?? 0} ITEMS</em>
      </div>

      {summary && summary.items.length > 0 ? (
        <ul className="tx-recovery-list">
          {summary.items.map((item) => (
            <TransferRow item={item} key={item.id} />
          ))}
        </ul>
      ) : (
        <div className="tx-empty">NO DIRECT WALLET TRANSFER</div>
      )}

      <TxStatusDetails phase={phase} errorText={errorText} txId={txId} network={network} />
    </>
  )
}

function ModalActions({
  phase,
  isWalletWaiting,
  isChainPending,
  onClose,
  onConfirm,
}: Pick<RecoveryTransactionModalProps, 'phase' | 'isWalletWaiting' | 'isChainPending' | 'onClose' | 'onConfirm'>) {
  const isPending = isChainPending || phase === 'pending'

  if (phase === 'ready') {
    return (
      <>
        <button type="button" className="ghost-button small" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="action-button small" onClick={onConfirm}>
          Sign transaction
        </button>
      </>
    )
  }

  if (phase === 'success' || phase === 'error' || phase === 'simulation-error') {
    return (
      <button type="button" className="action-button small" onClick={onClose}>
        Close
      </button>
    )
  }

  return (
    <button type="button" className={isPending ? 'action-button small pending-button' : 'action-button small'} disabled>
      {isPending ? <span className="button-spinner" aria-hidden="true" /> : null}
      <span>{isPending ? 'Pending' : isWalletWaiting ? 'Waiting' : 'Checking'}</span>
    </button>
  )
}

export function RecoveryTransactionModal({
  isOpen,
  title,
  phase,
  network,
  summary,
  errorText,
  txId,
  isWalletWaiting,
  isChainPending,
  onClose,
  onConfirm,
}: RecoveryTransactionModalProps) {
  if (!isOpen) {
    return null
  }

  const statusText = phaseText(phase, isWalletWaiting, isChainPending)
  const isCloseEnabled = canClose(phase, isWalletWaiting, isChainPending)

  return (
    <div className="app-shell tx-modal-layer">
      <div className="tx-modal-backdrop" />
      <section className="tx-modal" role="dialog" aria-modal="true" aria-labelledby="tx-modal-title">
        <header className="tx-modal-head">
          <div>
            <span>{statusText}</span>
            <h2 id="tx-modal-title">{title}</h2>
          </div>
          <button type="button" className="tx-close-button" onClick={onClose} disabled={!isCloseEnabled} aria-label="Close">
            x
          </button>
        </header>

        <ModalBody summary={summary} phase={phase} errorText={errorText} txId={txId} network={network} />

        <footer className="tx-modal-actions">
          <small>{phase === 'success' ? 'Close to scan updated state.' : `${summary?.clauseCount ?? 0} clauses checked.`}</small>
          <div>
            <ModalActions
              phase={phase}
              isWalletWaiting={isWalletWaiting}
              isChainPending={isChainPending}
              onClose={onClose}
              onConfirm={onConfirm}
            />
          </div>
        </footer>
      </section>
    </div>
  )
}
