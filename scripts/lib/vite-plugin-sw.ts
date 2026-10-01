/**
 * Emits dist/sw.js from src/sw/sw.ts after the build, with the list of files
 * Vite produced (the shell: index.html, the hashed bundles, the fonts and the
 * manifest) filled in as the precache list, and a version derived from those
 * names so a new deploy installs a new shell cache. No runtime dependency:
 * the worker is compiled with the esbuild Vite already carries.
 */
import { createHash } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { build as esbuild } from 'esbuild'
import type { Plugin } from 'vite'

/** Everything the shell needs offline; data files are cached as they are read. */
const SHELL_FILE = /\.(html|js|css|woff2|otf|webmanifest|svg)$/

export function serviceWorker(): Plugin {
  let base = '/'
  let outDir = 'dist'
  let root = process.cwd()
  const emitted: string[] = []
  return {
    name: 'banzuke:service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base
      outDir = config.build.outDir
      root = config.root
    },
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (SHELL_FILE.test(name) && !name.endsWith('.map')) emitted.push(name)
      }
    },
    async closeBundle() {
      // index.html and the static files Vite copies from public/ are not in the
      // bundle: name the ones the shell needs.
      const files = [
        ...emitted,
        'index.html',
        'assets/FranSans-Solid.otf',
        'assets/fonts/Archivo-latin.woff2',
        'assets/fonts/NotoSerifJP-700-core.woff2',
        'manifest.webmanifest',
        'favicon.svg',
      ]
      // Only what is really in the output: a renamed font must not break the install.
      const present: string[] = []
      for (const file of new Set(files)) {
        try {
          await access(join(resolve(root, outDir), file))
          present.push(file)
        } catch {
          this.warn(`sw: ${file} is not in ${outDir}; left out of the precache`)
        }
      }
      const precache = present.sort().map((f) => `${base}${f}`)
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)
      const result = await esbuild({
        entryPoints: [resolve(root, 'src/sw/sw.ts')],
        bundle: true,
        write: false,
        format: 'iife',
        target: 'es2020',
        minify: true,
        define: {
          __PRECACHE__: JSON.stringify(precache),
          __VERSION__: JSON.stringify(version),
          __BASE__: JSON.stringify(base),
        },
      })
      const out = join(resolve(root, outDir), 'sw.js')
      await writeFile(out, result.outputFiles[0].text)
      const list = join(resolve(root, outDir), 'sw-precache.json')
      await writeFile(list, `${JSON.stringify({ version, precache }, null, 2)}\n`)
      console.log(`sw.js: ${precache.length} files precached, version ${version}`)
    },
  }
}
