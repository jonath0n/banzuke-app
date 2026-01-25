import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Rikishi } from '../../types/banzuke'
import { SideCell } from './SideCell'

const rikishi: Rikishi = {
  banzuke_name: 'Yokozuna',
  ew: 1,
  banzuke_id: 1,
  kakuzuke_id: '1',
  rikishi_id: 1,
  rikishi_banzuke_id: 1,
  rank: 100,
  rank_new: '',
  seat_order: 1,
  number: 1,
  numberKanji: '1',
  photo: 'sample.jpg',
  pref_id: 1,
  pref_name: 'Tokyo',
  heya_id: 1,
  heya_name: 'Test',
  shikona: 'Test',
}

describe('SideCell', () => {
  it('renders rikishi name and avatar', () => {
    render(<SideCell rikishi={rikishi} side="east" rankLevel="yokozuna" />)

    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByAltText('Portrait of Test from Test stable')).toBeInTheDocument()
  })
})
