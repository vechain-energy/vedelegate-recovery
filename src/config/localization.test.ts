import { describe, expect, it } from 'vitest'
import { forceVechainKitEnglish, VECHAIN_KIT_LANGUAGE_STORAGE_KEY } from './localization'

describe('VeChain Kit localization', () => {
  it('forces the persisted Kit language to English', () => {
    const values = new Map<string, string>([[VECHAIN_KIT_LANGUAGE_STORAGE_KEY, 'de']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }

    forceVechainKitEnglish(storage)

    expect(values.get(VECHAIN_KIT_LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('does not block app start when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    }

    expect(() => forceVechainKitEnglish(storage)).not.toThrow()
  })
})
