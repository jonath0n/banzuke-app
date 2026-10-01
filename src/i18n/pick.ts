import type { Language, Localized } from '../types/banzuke'

/** The text in the UI language, or the English when the Japanese is missing. */
export function pick(text: Localized, language: Language): string {
  return text[language] || text.en
}
