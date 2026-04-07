import { Router } from 'express'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'

const DRAFTS_DIR = join(homedir(), '.clipforge-drafts')
mkdirSync(DRAFTS_DIR, { recursive: true })

const router = Router()

// List all drafts (metadata only)
router.get('/', (_req, res) => {
  try {
    const files = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json')).sort().reverse()
    const drafts = files.map(f => {
      try {
        const raw = readFileSync(join(DRAFTS_DIR, f), 'utf-8')
        const data = JSON.parse(raw)
        return {
          id: data.id ?? f.replace('.json', ''),
          name: data.name ?? 'Untitled',
          savedAt: data.savedAt ?? null,
          sourceVideoUrl: data.sourceVideoUrl ?? null,
          sourceVideoDuration: data.sourceVideoDuration ?? null,
          clipCount: data.state?.clips?.length ?? 0,
        }
      } catch { return null }
    }).filter(Boolean)
    res.json({ drafts })
  } catch {
    res.json({ drafts: [] })
  }
})

// Load a specific draft
router.get('/:id', (req, res) => {
  const { id } = req.params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    res.status(400).json({ error: 'Invalid draft ID' })
    return
  }
  const filePath = join(DRAFTS_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'Draft not found' })
    return
  }
  try {
    const raw = readFileSync(filePath, 'utf-8')
    res.json(JSON.parse(raw))
  } catch {
    res.status(500).json({ error: 'Failed to read draft' })
  }
})

// Save a draft (create or update)
router.post('/', (req, res) => {
  const { id, name, sourceVideoUrl, sourceVideoDuration, state } = req.body
  if (!state) {
    res.status(400).json({ error: 'state is required' })
    return
  }
  const draftId = id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : randomUUID()
  const draft = {
    id: draftId,
    name: name ?? 'Untitled',
    savedAt: new Date().toISOString(),
    sourceVideoUrl: sourceVideoUrl ?? null,
    sourceVideoDuration: sourceVideoDuration ?? null,
    state,
  }
  try {
    writeFileSync(join(DRAFTS_DIR, `${draftId}.json`), JSON.stringify(draft, null, 2))
    res.json({ id: draftId, savedAt: draft.savedAt })
  } catch {
    res.status(500).json({ error: 'Failed to save draft' })
  }
})

// Delete a draft
router.delete('/:id', (req, res) => {
  const { id } = req.params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    res.status(400).json({ error: 'Invalid draft ID' })
    return
  }
  const filePath = join(DRAFTS_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'Draft not found' })
    return
  }
  try {
    unlinkSync(filePath)
    res.json({ deleted: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete draft' })
  }
})

export default router
