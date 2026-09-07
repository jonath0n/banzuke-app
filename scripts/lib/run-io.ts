/**
 * Small pieces every fetch script needs: reporting an output to the deploy
 * job, reading a JSON file that may not exist, and pausing between requests.
 */
import { appendFile, readFile } from 'node:fs/promises'

/** Prints `name=value` and, in GitHub Actions, appends it to $GITHUB_OUTPUT. */
export async function setOutput(name: string, value: string): Promise<void> {
  console.log(`${name}=${value}`)
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
  }
}

/** The parsed file, or null when it is missing or not JSON. */
export async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}
