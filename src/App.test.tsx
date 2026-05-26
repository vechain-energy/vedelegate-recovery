import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync('src/App.tsx', 'utf8')
const htmlSource = readFileSync('index.html', 'utf8')
const mainSource = readFileSync('src/main.tsx', 'utf8')
const recoveryActionsSource = readFileSync('src/hooks/useRecoveryActions.tsx', 'utf8')

describe('VeChain Kit provider config', () => {
  it('enables Kit-owned dark mode for wallet modals', () => {
    expect(appSource).toMatch(/<VeChainKitProvider[\s\S]*\bdarkMode\b[\s\S]*>/)
  })

  it('uses English wallet localization instead of browser locale', () => {
    expect(appSource).toContain('language={VECHAIN_KIT_LANGUAGE}')
    expect(mainSource).toContain('forceVechainKitEnglish()')
  })

  it('sets the browser title to the product name', () => {
    expect(htmlSource).toContain('<title>veDelegate.vet Pool Recovery</title>')
    expect(appSource).toContain("name: 'veDelegate.vet Pool Recovery'")
  })

  it('keeps social and wallet login options enabled', () => {
    expect(appSource).toMatch(/method:\s*'vechain'/)
    expect(appSource).toMatch(/method:\s*'ecosystem'/)
    expect(appSource).toMatch(/method:\s*'dappkit'/)
    expect(appSource).not.toMatch(/method:\s*'email'/)
  })

  it('passes refresh into recovery actions', () => {
    expect(appSource).toMatch(/onTransactionSettled:\s*refresh/)
  })

  it('refreshes recovery data only when a successful modal is closed', () => {
    expect(recoveryActionsSource).toMatch(/const shouldRefresh = activeTransaction\?\.phase === 'success'/)
    expect(recoveryActionsSource).toMatch(/if \(shouldRefresh\) {\s*options\.onTransactionSettled\?\.\(\)\s*}/)
    expect(recoveryActionsSource).not.toMatch(/finally\s*{[\s\S]*options\.onTransactionSettled/)
  })
})
