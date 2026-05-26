import { decodeFunctionData, type Address } from 'viem'
import { describe, expect, it } from 'vitest'
import { erc20Abi, lockedTermsAbi, poolExecuteAbi, vot3Abi } from '../abis'
import type { AppConfig } from '../config'
import {
  buildConvertVot3Clause,
  buildRecoverAllClauses,
  buildTermActionClauses,
  buildWithdrawTokenClause,
  buildWithdrawVetClause,
} from './clauses'

const owner = '0x1111111111111111111111111111111111111111' as Address
const pool = '0x2222222222222222222222222222222222222222' as Address
const b3tr = '0x3333333333333333333333333333333333333333' as Address
const vot3 = '0x4444444444444444444444444444444444444444' as Address
const token = '0x5555555555555555555555555555555555555555' as Address
const lockedTerms = '0x6666666666666666666666666666666666666666' as Address

const config: AppConfig = {
  network: 'main',
  nodeUrl: 'https://mainnet.vechain.org',
  tokenRegistryUrl: 'https://vechain.github.io/token-registry/main.json',
  walletConnectProjectId: '',
  enableDemoData: false,
  addresses: {
    veDelegate: '0x7777777777777777777777777777777777777777',
    b3tr,
    vot3,
    veB3TR: '0x8888888888888888888888888888888888888888',
    lockedTerms,
  },
}

const decodeExecute = (data: `0x${string}`) =>
  decodeFunctionData({
    abi: poolExecuteAbi,
    data,
  })

describe('recovery clause builders', () => {
  it('builds VET withdraw through pool execute', () => {
    const clause = buildWithdrawVetClause(pool, owner, 12n)
    const decoded = decodeExecute(clause.data)

    expect(clause.to).toBe(pool)
    expect(decoded.functionName).toBe('execute')
    expect(decoded.args).toEqual([owner, 12n, '0x', 0n])
  })

  it('builds ERC20 withdraw through pool execute', () => {
    const clause = buildWithdrawTokenClause(pool, owner, token, 99n, 'TKN')
    const decoded = decodeExecute(clause.data)
    const transfer = decodeFunctionData({ abi: erc20Abi, data: decoded.args[2] })

    expect(decoded.args[0]).toBe(token)
    expect(transfer.functionName).toBe('transfer')
    expect(transfer.args).toEqual([owner, 99n])
  })

  it('builds VOT3 convert through pool execute', () => {
    const clause = buildConvertVot3Clause(config, pool, 44n)
    const decoded = decodeExecute(clause.data)
    const convert = decodeFunctionData({ abi: vot3Abi, data: decoded.args[2] })

    expect(decoded.args[0]).toBe(vot3)
    expect(convert.functionName).toBe('convertToB3TR')
    expect(convert.args).toEqual([44n])
  })

  it('orders recover-all as VET, VOT3 convert, B3TR withdraw, then other tokens', () => {
    const clauses = buildRecoverAllClauses({
      config,
      poolAddress: pool,
      ownerAddress: owner,
      vetBalance: 1n,
      tokenBalances: [
        { token: { address: token, symbol: 'TKN', name: 'Token', decimals: 18, source: 'registry' }, balance: 7n },
        { token: { address: vot3, symbol: 'VOT3', name: 'VOT3', decimals: 18, source: 'core' }, balance: 3n },
        { token: { address: b3tr, symbol: 'B3TR', name: 'B3TR', decimals: 18, source: 'core' }, balance: 5n },
      ],
    })

    const decoded = clauses.map((clause) => decodeExecute(clause.data))
    const b3trTransfer = decodeFunctionData({ abi: erc20Abi, data: decoded[2]?.args[2] ?? '0x' })

    expect(decoded.map((item) => item.args[0])).toEqual([owner, vot3, b3tr, token])
    expect(b3trTransfer.args).toEqual([owner, 8n])
  })

  it('disables auto-renew before closing expired terms', () => {
    const clauses = buildTermActionClauses({
      config,
      poolAddress: pool,
      tokenId: 9n,
      isActive: true,
      isEnded: true,
      autoRenew: true,
      b3trBalance: 1n,
      vot3Balance: 0n,
    })

    const innerCalls = clauses.map((clause) => {
      const execute = decodeExecute(clause.data)
      return decodeFunctionData({ abi: lockedTermsAbi, data: execute.args[2] })
    })

    expect(innerCalls.map((call) => call.functionName)).toEqual([
      'setAutoRenew',
      'closeTerm',
      'withdrawFundsFrom',
    ])
  })

  it('does not build action for active locked term', () => {
    expect(
      buildTermActionClauses({
        config,
        poolAddress: pool,
        tokenId: 10n,
        isActive: true,
        isEnded: false,
        autoRenew: false,
        b3trBalance: 2n,
        vot3Balance: 2n,
      }),
    ).toEqual([])
  })
})
