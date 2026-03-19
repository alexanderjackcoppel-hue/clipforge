import { rm, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { TMP_DIR } from '../index.js'
import { jobManager, isValidJobId } from './jobManager.js'

const TWO_HOURS = 2 * 60 * 60 * 1000

export async function cleanupOldJobs(): Promise<void> {
  try {
    const entries = await readdir(TMP_DIR)
    const now = Date.now()
    const activeJobIds = jobManager.getActiveJobIds()
    for (const entry of entries) {
      // Never delete directories for jobs that are currently queued or running
      if (isValidJobId(entry) && activeJobIds.has(entry)) continue
      const dir = join(TMP_DIR, entry)
      const s = await stat(dir).catch(() => null)
      if (s && s.isDirectory() && (now - s.mtimeMs) > TWO_HOURS) {
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        if (isValidJobId(entry)) jobManager.pruneJob(entry)
      }
    }
  } catch {
    // silently ignore errors (e.g. TMP_DIR doesn't exist yet)
  }
}
