/**
 * After `vite build`: writes the share pages (r/<id>/, heya/<id>/), the
 * sitemap and the tournament's JSON-LD into dist/, from the snapshot the
 * build shipped. See scripts/lib/stubs.ts.
 *
 * Usage: tsx scripts/build-stubs.ts [--dist <dir>] [--snapshot <path>]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { normalizeSnapshot } from '../src/data/normalize.ts'
import { validateSnapshot } from '../src/data/schema.ts'
import { renderJsonLd, renderSitemap, renderStub, stableStub, wrestlerStub } from './lib/stubs.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values: args } = parseArgs({
  options: {
    dist: { type: 'string', default: resolve(rootDir, 'dist') },
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
  },
})

async function main(): Promise<number> {
  const dist = resolve(args.dist as string)
  const validation = validateSnapshot(
    JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8'))
  )
  if (!validation.ok) {
    console.error(`Cannot read snapshot: ${validation.errors[0]}`)
    return 2
  }
  const data = normalizeSnapshot(validation.snapshot, 'live')
  const bashoName = data.makuuchi.basho.name.en
  const everyone = [...data.makuuchi.rikishi, ...(data.juryo?.rikishi ?? [])]
  const stubs = everyone.map((r) => wrestlerStub(r, bashoName))
  const heyaIds = [...new Set(everyone.map((r) => r.heya.id).filter((id) => id > 0))].sort(
    (a, b) => a - b
  )
  for (const id of heyaIds) {
    const stub = stableStub(data, id, bashoName)
    if (stub) stubs.push(stub)
  }
  for (const stub of stubs) {
    const dir = join(dist, stub.path)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), renderStub(stub), 'utf8')
  }
  await writeFile(join(dist, 'sitemap.xml'), renderSitemap(stubs), 'utf8')

  const indexPath = join(dist, 'index.html')
  const index = await readFile(indexPath, 'utf8')
  if (!index.includes('application/ld+json')) {
    await writeFile(
      indexPath,
      index.replace('</head>', `    ${renderJsonLd(data)}\n  </head>`),
      'utf8'
    )
  }
  console.log(
    `Wrote ${everyone.length} wrestler and ${stubs.length - everyone.length} stable share pages, the sitemap and the JSON-LD`
  )
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
