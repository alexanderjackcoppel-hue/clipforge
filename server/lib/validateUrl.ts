const ALLOWED_HOSTNAMES = new Set([
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'm.youtube.com', 'music.youtube.com',
  'instagram.com', 'www.instagram.com',
  'tiktok.com', 'www.tiktok.com', 'm.tiktok.com',
  'vm.tiktok.com',
])

export function validateUrl(input: string): string {
  let parsed: URL
  try {
    parsed = new URL(input.trim())
  } catch {
    throw new Error('Invalid URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must use http or https')
  }
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(`Unsupported platform. Paste a YouTube, Instagram, or TikTok URL.`)
  }
  return parsed.toString()
}
