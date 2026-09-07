/**
 * Arrow-key travel between wrestler buttons. Every button carries data-side
 * ('east' | 'west') and data-pair (the rank position key, shared by the two
 * sides of one rank). DOM order within a side is banzuke order in both
 * layouts, so "next in side" is the next lower rank.
 *
 * The keys are spatial: on the Sheet, each half reads right to left, so →
 * climbs the ranks and ← descends; ↑ ↓ cross to the East/West partner. On
 * the List a row holds both sides, so ↑ ↓ walk the ranks and ← → cross to
 * the partner (East is on the right of a row).
 */
export type Layout = 'sheet' | 'list'

type Move = 'prev' | 'next' | 'partner' | 'first' | 'last'

const MOVES: Record<Layout, Record<string, Move | ((side: string) => Move | null)>> = {
  sheet: {
    ArrowRight: 'prev',
    ArrowLeft: 'next',
    ArrowUp: 'partner',
    ArrowDown: 'partner',
    Home: 'first',
    End: 'last',
  },
  list: {
    ArrowUp: 'prev',
    ArrowDown: 'next',
    ArrowLeft: (side) => (side === 'east' ? 'partner' : null),
    ArrowRight: (side) => (side === 'west' ? 'partner' : null),
    Home: 'first',
    End: 'last',
  },
}

export function keyTarget(
  root: HTMLElement,
  current: HTMLElement,
  key: string,
  layout: Layout
): HTMLElement | null {
  const side = current.dataset.side
  const pair = current.dataset.pair
  if (!side || !pair) return null
  const rule = MOVES[layout][key]
  const move = typeof rule === 'function' ? rule(side) : rule
  if (!move) return null

  if (move === 'partner') {
    const other = side === 'east' ? 'west' : 'east'
    return root.querySelector<HTMLElement>(`button[data-side="${other}"][data-pair="${pair}"]`)
  }

  const inSide = [...root.querySelectorAll<HTMLElement>(`button[data-side="${side}"][data-pair]`)]
  const index = inSide.indexOf(current)
  if (index === -1) return null
  if (move === 'first') return inSide[0] === current ? null : inSide[0]
  if (move === 'last') return inSide.at(-1) === current ? null : (inSide.at(-1) ?? null)
  return inSide[move === 'prev' ? index - 1 : index + 1] ?? null
}

/** Handles one keydown over a set of wrestler buttons: moves focus when a target exists. */
export function handleRovingKey(
  root: HTMLElement,
  event: { key: string; target: EventTarget | null; preventDefault(): void },
  layout: Layout
): void {
  const current = (event.target as HTMLElement | null)?.closest<HTMLElement>('button[data-pair]')
  if (!current) return
  const target = keyTarget(root, current, event.key, layout)
  if (target) {
    event.preventDefault()
    target.focus()
  }
}
