import { spawn } from 'child_process'

const TIMEOUT_MS = 30 * 60 * 1000
// Maximum bytes kept in the stderr/stdout accumulation buffer.
// Callers using onStdout/onStderr callbacks receive full streaming data regardless.
// The buffer is only used for the final error message and resolve value.
const MAX_BUF_BYTES = 512 * 1024 // 512KB

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
      if (stdout.length < MAX_BUF_BYTES) stdout += t
      opts.onStdout?.(t)
    })
    child.stderr.on('data', (d: Buffer) => {
      const t = d.toString()
      if (stderr.length < MAX_BUF_BYTES) stderr += t
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
        reject(new Error(`'${cmd}' timed out after 30 minutes`))
      } else if (code !== 0) {
        const cmdStr = `${cmd} ${args.join(' ')}`
        console.error(`[spawnJob] FAILED (code ${code}): ${cmdStr}`)
        console.error(`[spawnJob] stderr: ${stderr}`)
        reject(new Error(`'${cmd}' exited with code ${code}.\n${stderr.slice(-2000)}`))
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}
