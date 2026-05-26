import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync('src/App.tsx', 'utf8')

describe('VeChain Kit provider config', () => {
  it('enables Kit-owned dark mode for wallet modals', () => {
    expect(appSource).toMatch(/<VeChainKitProvider[\s\S]*\bdarkMode\b[\s\S]*>/)
  })
})
