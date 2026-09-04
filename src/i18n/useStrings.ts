import { useLanguage } from '../contexts/LanguageContext'
import { STRINGS, type Strings } from './strings'

/** The UI string table for the current language. */
export function useStrings(): Strings {
  const { language } = useLanguage()
  return STRINGS[language]
}
