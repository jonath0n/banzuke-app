import { describe, expect, it } from 'vitest'
import { behind, siteProgress } from './watch-results.ts'
import { makeResultsFile } from '../src/test/fixtures'

describe('watch-results', () => {
  it('counts a day on the site by decided bouts over bouts on the card', () => {
    expect(siteProgress(makeResultsFile(), 12)).toEqual({ decided: 1, total: 2 })
    expect(siteProgress(makeResultsFile(), 13)).toEqual({ decided: 0, total: 0 })
    expect(siteProgress(null, 12)).toEqual({ decided: 0, total: 0 })
  })

  it('deploys only when upstream has more than the site shows', () => {
    expect(behind({ decided: 1, total: 2 }, { decided: 2, total: 2 })).toBe(true)
    // The card itself is news before any bout is fought
    expect(behind({ decided: 0, total: 0 }, { decided: 0, total: 21 })).toBe(true)
    expect(behind({ decided: 2, total: 2 }, { decided: 2, total: 2 })).toBe(false)
    // A sumo-api hiccup serving less than the site has is not a reason to deploy
    expect(behind({ decided: 2, total: 2 }, { decided: 0, total: 0 })).toBe(false)
  })
})
