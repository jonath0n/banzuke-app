import { useEffect } from 'react'
import type { Banzuke, Language, Rikishi } from '../types/banzuke'
import { pick } from '../i18n/pick'
import type { Strings } from '../i18n/strings'
import type { StableRoster } from '../utils/stables'

/** The tab reads what is on screen: the open dialog's subject first, then the app. */
export function useDocumentTitle(
  banzuke: Banzuke | null,
  selectedRikishi: Rikishi | null,
  roster: StableRoster | null,
  language: Language,
  strings: Strings
): void {
  useEffect(() => {
    const bashoName = banzuke ? pick(banzuke.basho.name, language) : ''
    const subject = selectedRikishi
      ? pick(selectedRikishi.shikona, language)
      : roster
        ? strings.openStable(pick(roster.name, language))
        : ''
    document.title = subject
      ? `${subject} · ${strings.appTitle}`
      : bashoName
        ? `${strings.appTitle} · ${bashoName}`
        : strings.appTitle
  }, [banzuke, language, roster, selectedRikishi, strings])
}
