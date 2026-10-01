import { describe, expect, it } from 'vitest'
import { kadobanIds } from './stakes'
import { makeArchivedBanzuke, makeRikishi } from '../test/fixtures'

describe('kadobanIds', () => {
  const ozekiNow = (id: number) =>
    makeRikishi({ id, rankCode: 200, rankLevel: 'ozeki', rankName: { en: 'Ozeki', jp: '大関' } })
  const archived = (id: number, rankCode: number) => ({
    ...makeArchivedBanzuke().rikishi[0],
    id,
    rankCode,
  })
  const previous = makeArchivedBanzuke({
    rikishi: [archived(1, 200), archived(2, 200), archived(3, 300), archived(4, 200)],
  })
  const records = {
    '1': { wins: 7, losses: 8, absences: 0, bouts: [] },
    '2': { wins: 9, losses: 6, absences: 0, bouts: [] },
    '3': { wins: 5, losses: 10, absences: 0, bouts: [] },
    '4': { wins: 2, losses: 3, absences: 10, bouts: [] },
  }

  it('marks an Ozeki who was Ozeki last time and made make-koshi, absences counted', () => {
    const current = [ozekiNow(1), ozekiNow(2), ozekiNow(3), ozekiNow(4), makeRikishi({ id: 5 })]
    expect([...kadobanIds(current, previous, records)]).toEqual([1, 4])
  })

  it('never marks a newly promoted Ozeki, a demoted one, or anyone without the data', () => {
    // 3 was Sekiwake: his 5–10 is not a kadoban. 1 at Sekiwake now is not an Ozeki.
    const demoted = makeRikishi({ id: 1, rankCode: 300, rankLevel: 'sekiwake' })
    expect(kadobanIds([demoted, ozekiNow(3)], previous, records).size).toBe(0)
    expect(kadobanIds([ozekiNow(1)], null, records).size).toBe(0)
    expect(kadobanIds([ozekiNow(1)], previous, null).size).toBe(0)
  })
})
