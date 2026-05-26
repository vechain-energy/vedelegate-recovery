export const VECHAIN_KIT_LANGUAGE = 'en'
export const VECHAIN_KIT_LANGUAGE_STORAGE_KEY = 'i18nextLng'

type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'>

export const forceVechainKitEnglish = (storage?: LanguageStorage): void => {
  const targetStorage = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage)

  if (!targetStorage) {
    return
  }

  try {
    if (targetStorage.getItem(VECHAIN_KIT_LANGUAGE_STORAGE_KEY) !== VECHAIN_KIT_LANGUAGE) {
      targetStorage.setItem(VECHAIN_KIT_LANGUAGE_STORAGE_KEY, VECHAIN_KIT_LANGUAGE)
    }
  } catch {
    return
  }
}
