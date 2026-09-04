import { useEffect, useState } from 'react'
import { validateProfiles, type RikishiProfile } from '../data/profiles'

const PROFILES_URL = `${import.meta.env.BASE_URL}rikishi-profiles.json`

type ProfileMap = Record<string, RikishiProfile>

let pending: Promise<ProfileMap> | null = null

/**
 * Loads the profiles file once per page and shares it between callers.
 * Any failure resolves to an empty map: profiles are optional enrichment.
 */
export function loadProfiles(): Promise<ProfileMap> {
  if (!pending) {
    pending = fetch(PROFILES_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((parsed) => {
        const result = validateProfiles(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.file.profiles
      })
      .catch((error: unknown) => {
        console.warn(
          'Wrestler profiles unavailable:',
          error instanceof Error ? error.message : error
        )
        return {}
      })
  }
  return pending
}

/** Forgets the loaded file so the next call fetches again (tests). */
export function resetProfilesCache(): void {
  pending = null
}

/** The profile for a wrestler, once the file has loaded; null until then or if unknown. */
export function useProfile(id: number | null): RikishiProfile | null {
  const [profiles, setProfiles] = useState<ProfileMap | null>(null)

  useEffect(() => {
    if (id == null) return
    let cancelled = false
    loadProfiles().then((map) => {
      if (!cancelled) setProfiles(map)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (id == null || !profiles) return null
  return profiles[String(id)] ?? null
}
