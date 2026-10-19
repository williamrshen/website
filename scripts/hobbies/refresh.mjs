import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const configPath = new URL('../../config/hobbies.json', import.meta.url)

/**
 * Replaces a generated snapshot only when the whole refresh succeeds, so a flaky API
 * leaves the last-good data in place. Failures warn rather than fail, so one hobby's
 * API outage never blocks the other weekly refreshes.
 */
export async function refreshHobby({ name, file, load }) {
  const target = new URL(`../../src/data/generated/${file}`, import.meta.url)
  try {
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    const snapshot = await load(config, new Date().toISOString())
    const temporary = fileURLToPath(target) + '.tmp'
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n')
    await rename(temporary, fileURLToPath(target))
    console.log(`Updated src/data/generated/${file}`)
  } catch (error) {
    console.warn(`${process.env.GITHUB_ACTIONS ? '::warning::' : ''}Kept last-good ${name} data: ${error.message}`)
  }
}
