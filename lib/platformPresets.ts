// NO framework imports — plain TypeScript only. This file is used by both Next.js and Express.

export interface PlatformPreset {
  id: string
  platform: string
  name: string
  width: number
  height: number
  maxDurationSecs: number | null
  codec: 'libx264' | 'libx265'
  fps: number
  aspectLabel: string
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'youtube-short',
    platform: 'YouTube',
    name: 'YouTube Short',
    width: 1080,
    height: 1920,
    maxDurationSecs: 60,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '9:16',
  },
  {
    id: 'youtube-long',
    platform: 'YouTube',
    name: 'YouTube Long',
    width: 1920,
    height: 1080,
    maxDurationSecs: null,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '16:9',
  },
  {
    id: 'youtube-4k',
    platform: 'YouTube',
    name: 'YouTube 4K',
    width: 3840,
    height: 2160,
    maxDurationSecs: null,
    codec: 'libx265',
    fps: 30,
    aspectLabel: '16:9',
  },
  {
    id: 'instagram-reel',
    platform: 'Instagram',
    name: 'Instagram Reel',
    width: 1080,
    height: 1920,
    maxDurationSecs: 90,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '9:16',
  },
  {
    id: 'instagram-post',
    platform: 'Instagram',
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    maxDurationSecs: 60,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '1:1',
  },
  {
    id: 'instagram-story',
    platform: 'Instagram',
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    maxDurationSecs: 15,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '9:16',
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    name: 'TikTok',
    width: 1080,
    height: 1920,
    maxDurationSecs: 600,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '9:16',
  },
  {
    id: 'twitter-x',
    platform: 'Twitter/X',
    name: 'Twitter/X',
    width: 1280,
    height: 720,
    maxDurationSecs: 140,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '16:9',
  },
  {
    id: 'linkedin',
    platform: 'LinkedIn',
    name: 'LinkedIn',
    width: 1920,
    height: 1080,
    maxDurationSecs: 600,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '16:9',
  },
  {
    id: 'pinterest',
    platform: 'Pinterest',
    name: 'Pinterest',
    width: 1000,
    height: 1500,
    maxDurationSecs: 900,
    codec: 'libx264',
    fps: 30,
    aspectLabel: '2:3',
  },
  {
    id: 'custom',
    platform: 'Custom',
    name: 'Custom',
    width: 1080,
    height: 1920,
    maxDurationSecs: null,
    codec: 'libx264',
    fps: 30,
    aspectLabel: 'free',
  },
]

export const DEFAULT_PRESET: PlatformPreset = PLATFORM_PRESETS[0]
