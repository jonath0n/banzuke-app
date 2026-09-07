/**
 * JSA basho ids are consecutive integers, one per tournament, six a year in
 * the odd months. The anchor below is read off the September 2026 snapshot;
 * the ids 632–637 in this repo's history all agree with it. Ids before 2025
 * have not been checked against the JSA (the cancelled May 2020 tournament
 * may or may not hold a number) — extend the archive backwards with care.
 */
const ANCHOR = { id: 637, year: 2026, month: 9 }

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

/** Calendar year and month (1–12) of a tournament. */
export function bashoYearMonth(id: number): { year: number; month: number } {
  const index = monthIndex(ANCHOR.year, ANCHOR.month) + (id - ANCHOR.id) * 2
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** The id of the tournament held in a given month, or null when none is (even months). */
export function bashoIdFor(year: number, month: number): number | null {
  if (month % 2 === 0) return null
  return ANCHOR.id + (monthIndex(year, month) - monthIndex(ANCHOR.year, ANCHOR.month)) / 2
}

/** sumo-api.com addresses tournaments as YYYYMM. */
export function sumoApiBashoId(id: number): string {
  const { year, month } = bashoYearMonth(id)
  return `${year}${String(month).padStart(2, '0')}`
}

export function bashoIdFromSumoApi(yyyymm: string): number | null {
  if (!/^\d{6}$/.test(yyyymm)) return null
  return bashoIdFor(Number(yyyymm.slice(0, 4)), Number(yyyymm.slice(4)))
}
