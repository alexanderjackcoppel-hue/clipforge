import { spawn } from 'child_process'

const TIMEOUT_MS = 10 * 60 * 1000

export async function spawnJob(
  cmd: string,
  args: string[],
  opts: {
    onStdout?: (chunk: string) => void
    onStderr?: (chunk: string) => void
  } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Ensure Homebrew bin dirs are in PATH for child processes (ffmpeg, yt-dlp, whisper-cpp)
    const PATH = [
      process.env.PATH ?? '',
      '/opt/homebrew/bin',
      '/usr/local/bin',
    ].join(':')
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH } })
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        try { child.kill('SIGKILL') } catch { /* already dead */ }
      }, 3000)
    }, TIMEOUT_MS)

    child.stdout.on('data', (d: Buffer) => {
      const t = d.toString()
      stdout += t
      opts.onStdout?.(t)
    })
    child.stderr.on('data', (d: Buffer) => {
      const t = d.toString()
      stderr += t
      opts.onStderr?.(t)
    })
    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        reject(new Error(`'${cmd}' not found. Make sure it is installed and in your PATH.`))
      } else {
        reject(err)
      }
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) {
        reject(new Error(`'${cmd}' timed out after 10 minutes`))
      } else if (code !== 0) {
        reject(new Error(`'${cmd}' exited with code ${code}.\n${stderr.slice(-800)}`))
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}
