import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { fetchBackup, normalizePractice } from './cstimer.mjs'
import { fetchOfficial, normalizeOfficial } from './wca.mjs'
import { refreshSnapshot } from './snapshot.mjs'

const configPath = new URL('../../config/cubing.json', import.meta.url)
const snapshotPath = new URL('../../src/data/generated/cubing.json', import.meta.url)
const config = JSON.parse(await readFile(configPath, 'utf8'))
const previous = JSON.parse(await readFile(snapshotPath, 'utf8'))
const now = new Date().toISOString()
const id = process.env.CSTIMER_ID

try {
  const { snapshot, warnings } = await refreshSnapshot({
    config, previous, now,
    loadOfficial: async () => normalizeOfficial(await fetchOfficial(config.wcaId), config, now),
    loadPractice: id ? async () => normalizePractice(await fetchBackup(id), config, now) : null,
  })
  const temporaryPath = fileURLToPath(snapshotPath) + '.tmp'
  await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2) + '\n')
  await rename(temporaryPath, snapshotPath)
  console.log('Updated src/data/generated/cubing.json')
  for (const warning of warnings) console.warn(`Kept last-good data for ${warning}`)
  if (!id) console.log('Practice refresh skipped: set CSTIMER_ID in .env.local or the workflow secret.')
  const officialEvents = Object.keys(snapshot.sources.official.events).length
  const practiceEvents = Object.keys(snapshot.sources.unofficial.events).length
  console.log(`Published ${officialEvents} official events and ${practiceEvents} practice events.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
