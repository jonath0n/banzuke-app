import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BanzukePayload } from '../../types/banzuke'
import { Hero } from './Hero'

const payload: BanzukePayload = {
  BanzukeTable: [],
  basho_name: 'Hatsu',
  year_jp: 'Reiwa 6',
  lang: 'en',
  kakuzuke_id: '1',
  page: '1',
  Kakuzuke: 'Makuuchi',
  list_max: 42,
  basho_id: 1,
  BashoInfo: {
    today: '2024-01-01',
    basho_id: 1,
    start_date: '2024-01-14',
    end_date: '2024-01-28',
    year_jp: 'Reiwa 6',
    basho_name: 'Hatsu',
    basho_name_eng: 'Hatsu',
    start_datetime: '2024-01-14T00:00:00Z',
    end_datetime: '2024-01-28T00:00:00Z',
    ticket_advanceselling_start_datetime: '2024-01-01T00:00:00Z',
    ticket_advanceselling_end_datetime: '2024-01-02T00:00:00Z',
    ticket_preselling_datetime: '2024-01-03T00:00:00Z',
    year_eng: '2024',
    JpDate: 'Reiwa 6-01',
    BattleNow: 0,
    banzuke_announcement_datetime: '2023-12-25T00:00:00Z',
    day: '1',
    venue_id: 1,
  },
  Result: 'OK',
}

describe('Hero', () => {
  it('renders the title and basho info', () => {
    render(<Hero data={payload} language="en" onLanguageChange={() => undefined} />)

    expect(screen.getByText('Grand Sumo Banzuke')).toBeInTheDocument()
    expect(screen.getByText('Hatsu (Makuuchi)')).toBeInTheDocument()
  })
})
