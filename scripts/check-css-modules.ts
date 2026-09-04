/**
 * Reports CSS Module classes that no component references.
 *
 * For every `*.module.css` under src/, collect the class names it defines and
 * check that the sibling `.tsx` files reference each one as `styles.name`,
 * `styles['name']`, or `styles[name]` via a lookup table (dynamic lookups are
 * approximated by allowing any class that appears as a string literal).
 *
 * Usage: tsx scripts/check-css-modules.ts   (exit code 1 when dead classes exist)
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

const ROOT = new URL('../src/', import.meta.url).pathname

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? walk(path) : Promise.resolve([path])
    })
  )
  return files.flat()
}

function classNames(css: string): Set<string> {
  // Strip comments, then collect `.name` tokens outside of property values.
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const names = new Set<string>()
  for (const match of noComments.matchAll(/\.([A-Za-z_][\w-]*)(?=[\s,.:[>+~{)])/g)) {
    names.add(match[1])
  }
  return names
}

async function main(): Promise<number> {
  const files = await walk(ROOT)
  const cssModules = files.filter((f) => f.endsWith('.module.css'))
  let dead = 0

  for (const cssPath of cssModules) {
    const dir = dirname(cssPath)
    const tsxSources = await Promise.all(
      files
        .filter((f) => dirname(f) === dir && /\.tsx?$/.test(f) && !/\.test\./.test(f))
        .map((f) => readFile(f, 'utf8'))
    )
    const source = tsxSources.join('\n')
    const css = await readFile(cssPath, 'utf8')
    const unused = [...classNames(css)].filter((name) => {
      const dotted = new RegExp(`styles\\.${name}\\b`)
      const bracket = new RegExp(`styles\\[['"\`]${name}['"\`]\\]`)
      const literal = new RegExp(`['"\`]${name}['"\`]`)
      return !dotted.test(source) && !bracket.test(source) && !literal.test(source)
    })
    if (unused.length > 0) {
      dead += unused.length
      console.log(`${relative(process.cwd(), cssPath)}: ${unused.join(', ')}`)
    }
  }

  if (dead === 0) {
    console.log(`All CSS Module classes are referenced (${cssModules.length} files).`)
    return 0
  }
  console.error(`\n${dead} unreferenced CSS Module class(es).`)
  return 1
}

main().then((code) => {
  process.exitCode = code
})
