/**
 * Arrow-key travel between wrestler buttons. Every button carries data-side
 * ('east' | 'west') and data-pair (the rank position key, shared by the two
 * sides of one rank). DOM order within a side is banzuke order, so "next in
 * side" is the next lower rank.
 *
 * The keys are spatial: a row holds both sides, so ↑ ↓ walk the ranks and
 * ← → cross to the partner (East is on the right of a row).
 */
type Move = 'prev' | 'next' | 'partner' | 'first' | 'last'

const MOVES: Record<string, Move | ((side: string) => Move | null)> = {
  ArrowUp: 'prev',
  ArrowDown: 'next',
  ArrowLeft: (side) => (side === 'east' ? 'partner' : null),
  ArrowRight: (side) => (side === 'west' ? 'partner' : null),
  Home: 'first',
  End: 'last',
}

/** Which move (if any) this key resolves to for a button on the given side. */
function resolveMove(side: string, key: string): Move | null {
  const rule = MOVES[key]
  if (!rule) return null
  return typeof rule === 'function' ? rule(side) : rule
}

export function keyTarget(
  root: HTMLElement,
  current: HTMLElement,
  key: string
): HTMLElement | null {
  const side = current.dataset.side
  const pair = current.dataset.pair
  if (!side || !pair) return null
  const move = resolveMove(side, key)
  if (!move) return null

  if (move === 'partner') {
    const other = side === 'east' ? 'west' : 'east'
    return root.querySelector<HTMLElement>(`button[data-side="${other}"][data-pair="${pair}"]`)
  }

  const inSide = [...root.querySelectorAll<HTMLElement>(`button[data-side="${side}"][data-pair]`)]
  const index = inSide.indexOf(current)
  if (index === -1) return null
  const last = inSide[inSide.length - 1]
  if (move === 'first') return inSide[0] === current ? null : inSide[0]
  if (move === 'last') return last === current ? null : last
  return inSide[move === 'prev' ? index - 1 : index + 1] ?? null
}

/**
 * Handles one keydown over a set of wrestler buttons. Any key assigned a move
 * is ours to swallow — Home/End at an end of the side, or an arrow with no
 * partner, still calls preventDefault, just with no target to focus. Any
 * other key (Tab included) passes through.
 */
export function handleRovingKey(
  root: HTMLElement,
  event: { key: string; target: EventTarget | null; preventDefault(): void }
): void {
  const current = (event.target as HTMLElement | null)?.closest<HTMLElement>('button[data-pair]')
  if (!current) return
  const side = current.dataset.side
  if (!side) return
  const move = resolveMove(side, event.key)
  if (!move) return
  event.preventDefault()
  const target = keyTarget(root, current, event.key)
  target?.focus()
}
