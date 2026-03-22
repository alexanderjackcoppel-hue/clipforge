import Anthropic from '@anthropic-ai/sdk'
import { join } from 'path'
import { readFile, rm } from 'fs/promises'
import { spawnJob } from './spawnJob.js'
import { TMP_DIR } from '../index.js'

export interface VideoHighlight {
  time: number
  description: string
}

export interface VideoAnalysis {
  summary: string
  mood: string
  highlights: VideoHighlight[]
  suggestedTitle: string | null
  suggestedDescription: string | null
  transcript: string | null
  frameCount: number
}

export async function analyseVideo(
  jobId: string,
  duration: number,
  userPrompt?: string
): Promise<VideoAnalysis> {
  const dir = join(TMP_DIR, jobId)
  const sourcePath = join(dir, 'source.mp4')

  // Adaptive frame count: short clips get fewer frames, long ones get more
  const frameCount = duration <= 15 ? 6 : duration <= 60 ? 10 : 14
  const framePaths = Array.from({ length: frameCount }, (_, i) =>
    join(dir, `af_${String(i + 1).padStart(3, '0')}.jpg`)
  )

  // Extract frames and transcribe in parallel
  const [, transcript] = await Promise.all([
    extractFrames(sourcePath, dir, frameCount, duration),
    transcribeForAnalysis(sourcePath, dir),
  ])

  const analysis = await analyseWithClaude(framePaths, transcript, duration, userPrompt)

  // Clean up temp frames
  await Promise.allSettled(framePaths.map(fp => rm(fp, { force: true })))

  return analysis
}

async function extractFrames(
  sourcePath: string,
  dir: string,
  frameCount: number,
  duration: number
): Promise<void> {
  const safeDuration = Math.max(1, Math.ceil(duration))
  await spawnJob('ffmpeg', [
    '-i', sourcePath,
    '-vf', `fps=${frameCount}/${safeDuration},scale=640:-2`,
    '-vframes', String(frameCount),
    '-q:v', '4',
    '-y',
    join(dir, 'af_%03d.jpg'),
  ])
}

async function transcribeForAnalysis(
  sourcePath: string,
  dir: string
): Promise<string | null> {
  try {
    // Prefer existing SRT if whisper already ran during trim/export
    const existingSrt = join(dir, 'subtitles.srt')
    try {
      const srt = await readFile(existingSrt, 'utf-8')
      return srt
        .replace(/^\d+$/gm, '')
        .replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '')
        .replace(/\n{3,}/g, '\n')
        .trim()
    } catch {
      // No existing SRT — skip transcription to keep analysis fast
      return null
    }
  } catch {
    return null
  }
}

async function analyseWithClaude(
  framePaths: string[],
  transcript: string | null,
  duration: number,
  userPrompt?: string
): Promise<VideoAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })

  const frameData = await Promise.all(
    framePaths.map(async (fp, i) => {
      try {
        const data = await readFile(fp)
        return { index: i, b64: data.toString('base64'), ok: true }
      } catch {
        return { index: i, b64: '', ok: false }
      }
    })
  )
  const validFrames = frameData.filter(f => f.ok)

  if (validFrames.length === 0) {
    throw new Error('Could not extract any frames from the video')
  }

  const imageBlocks: Anthropic.ImageBlockParam[] = validFrames.map(f => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: f.b64 },
  }))

  const secsPerFrame = (duration / validFrames.length).toFixed(1)

  const systemPrompt = `You are a video content analyst. You are shown ${validFrames.length} evenly-spaced frames from a ${duration.toFixed(0)}-second video (one frame every ~${secsPerFrame}s). Analyse the content and return ONLY a JSON object with this structure:
{
  "summary": "2-3 sentence description of what the video shows",
  "mood": "one word from: energetic, calm, funny, dramatic, informative, inspiring, suspenseful, emotional",
  "highlights": [
    { "time": <seconds as a number>, "description": "<what happens at this moment>" }
  ],
  "suggestedTitle": "<catchy short title or null>",
  "suggestedDescription": "<1-2 sentence social media caption or null>"
}
Include 1-5 highlights at interesting moments. Estimate timestamp as frame N ≈ N × ${secsPerFrame}s. Return ONLY valid JSON.`

  const textParts = [
    `Video duration: ${duration.toFixed(1)}s | Frames: ${validFrames.length}`,
  ]
  if (transcript) {
    textParts.push(`\nTranscript:\n"${transcript.slice(0, 1500)}"`)
  }
  if (userPrompt) {
    textParts.push(`\nUser's focus: "${userPrompt}"\nFocus your highlights and suggestions on this.`)
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: textParts.join('\n') },
      ],
    }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'

  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : text
    const result = JSON.parse(jsonStr.trim())

    const VALID_MOODS = ['energetic', 'calm', 'funny', 'dramatic', 'informative', 'inspiring', 'suspenseful', 'emotional']

    return {
      summary: String(result.summary ?? 'No summary available'),
      mood: VALID_MOODS.includes(result.mood) ? result.mood : 'informative',
      highlights: Array.isArray(result.highlights)
        ? result.highlights.slice(0, 5).map((h: { time?: unknown; description?: unknown }) => ({
            time: Math.max(0, Math.min(duration, Number(h.time) || 0)),
            description: String(h.description ?? ''),
          }))
        : [],
      suggestedTitle: result.suggestedTitle ? String(result.suggestedTitle).slice(0, 100) : null,
      suggestedDescription: result.suggestedDescription ? String(result.suggestedDescription).slice(0, 300) : null,
      transcript,
      frameCount: validFrames.length,
    }
  } catch {
    return {
      summary: text.slice(0, 300),
      mood: 'informative',
      highlights: [],
      suggestedTitle: null,
      suggestedDescription: null,
      transcript,
      frameCount: validFrames.length,
    }
  }
}
