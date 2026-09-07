import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  archiveFileName,
  buildIndex,
  validateArchive,
  type ArchivedBanzuke,
  type ArchiveIndex,
} from '../../src/data/archive.ts'

const INDEX = 'index.json'

/** Every archive in `dir`, validated. Throws naming the first file that is not one. */
export async function readArchives(dir: string): Promise<ArchivedBanzuke[]> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const archives: ArchivedBanzuke[] = []
  for (const name of names.filter((n) => n.endsWith('.json') && n !== INDEX).sort()) {
    const parsed: unknown = JSON.parse(await readFile(join(dir, name), 'utf8'))
    const result = validateArchive(parsed)
    if (!result.ok) throw new Error(`${join(dir, name)}: ${result.error}`)
    archives.push(result.archive)
  }
  return archives
}

export async function writeArchive(dir: string, archive: ArchivedBanzuke): Promise<string> {
  await mkdir(dir, { recursive: true })
  const path = join(dir, archiveFileName(archive.bashoId))
  await writeFile(path, `${JSON.stringify(archive, null, 1)}\n`, 'utf8')
  return path
}

/** Writes index.json for `archives` and returns the index that was written. */
export async function writeIndex(
  dir: string,
  archives: ArchivedBanzuke[],
  now = new Date()
): Promise<ArchiveIndex> {
  const index = buildIndex(archives, now.toISOString())
  const path = join(dir, INDEX)
  await writeFile(path, `${JSON.stringify(index, null, 1)}\n`, 'utf8')
  return index
}

/** Rebuilds index.json from the archive files actually present. */
export async function refreshIndex(dir: string): Promise<ArchiveIndex> {
  return writeIndex(dir, await readArchives(dir))
}
