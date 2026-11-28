import { useEffect } from 'react'
import type { Banzuke, Language, Rikishi } from '../types/banzuke'
import { pick } from '../i18n/pick'
import type { Strings } from '../i18n/strings'
import type { StableRoster } from '../utils/stables'
import { bashoLabel } from '../utils/formatting'

/** The tab reads what is on screen: the open dialog's subject first, then the app. */
export function useDocumentTitle(
  banzuke: Banzuke | null,
  selectedRikishi: Rikishi | null,
  roster: StableRoster | null,
  language: Language,
  strings: Strings
): void {
  useEffect(() => {
    const subject = selectedRikishi
      ? pick(selectedRikishi.shikona, language)
      : roster
        ? strings.openStable(pick(roster.name, language))
        : ''
    document.title = subject
      ? `${subject} · ${strings.appTitle}`
      : banzuke
        ? strings.homeTitle(bashoLabel(banzuke.basho, language))
        : strings.appTitle
  }, [banzuke, language, roster, selectedRikishi, strings])
}
