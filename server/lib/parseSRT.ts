export function parseSRT(srt: string): Array<{ id: number; start: number; end: number; text: string }> {
  const blocks = srt.trim().split(/\n\n+/)
  return blocks.map((block, idx) => {
    const lines = block.split('\n')
    if (lines.length < 3) return null
    const tm = lines[1]?.match(/(\d+):(\d+):([\d,]+)\s*-->\s*(\d+):(\d+):([\d,]+)/)
    if (!tm) return null
    const parseT = (h: string, m: string, s: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s.replace(',', '.'))
    return {
      id: idx + 1,
      start: parseT(tm[1], tm[2], tm[3]),
      end: parseT(tm[4], tm[5], tm[6]),
      text: lines.slice(2).join(' ').trim(),
    }
  }).filter((item): item is { id: number; start: number; end: number; text: string } => item !== null)
}
