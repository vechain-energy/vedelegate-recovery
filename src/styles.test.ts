import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync('src/styles.css', 'utf8')

describe('style isolation', () => {
  it('keeps app theme tokens away from document root', () => {
    expect(styles).not.toMatch(/:root\s*{/)
    expect(styles).toContain('.app-shell {\n  color-scheme: dark;')
  })

  it('keeps global body styles minimal so VeChain Kit modals stay isolated', () => {
    expect(styles).toMatch(/body\s*{\s*margin:\s*0;\s*}/)
    expect(styles).not.toMatch(/body\s*{[^}]*background:/s)
    expect(styles).not.toMatch(/body\s*{[^}]*font/s)
    expect(styles).not.toMatch(/body\s*{[^}]*color-scheme/s)
  })
})
