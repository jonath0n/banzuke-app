import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readArchives, refreshIndex, writeArchive } from './archive-io.ts'
import { makeArchivedBanzuke } from '../../src/test/fixtures'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'banzuke-archive-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

describe('archive-io', () => {
  it('writes an archive by id and reads it back', async () => {
    const path = await writeArchive(dir, makeArchivedBanzuke())
    expect(path.endsWith('636.json')).toBe(true)
    expect(await readArchives(dir)).toEqual([makeArchivedBanzuke()])
  })

  it('rebuilds the index from the files present, ascending, ignoring index.json itself', async () => {
    await writeArchive(dir, makeArchivedBanzuke())
    await writeArchive(
      dir,
      makeArchivedBanzuke({ bashoId: 634, year: 2026, month: 3, startDate: '2026-03-08' })
    )
    const index = await refreshIndex(dir)
    expect(index.basho.map((b) => b.bashoId)).toEqual([634, 636])
    const onDisk = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8')) as typeof index
    expect(onDisk.basho).toEqual(index.basho)
    // A second refresh must not try to read index.json as an archive.
    expect((await refreshIndex(dir)).basho).toHaveLength(2)
  })

  it('refuses a directory holding an invalid archive', async () => {
    await writeFile(join(dir, '999.json'), '{"version":2}', 'utf8')
    await expect(readArchives(dir)).rejects.toThrow(/999\.json/)
  })
})
