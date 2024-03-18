import fs from 'fs'
import crypto from 'crypto'
import path from 'path'

export interface TmpDataCache {
  path: string
  delete: () => void
}

export function getDataDirectory (): string {
  return path.join(__dirname + '../../data')
}

export function createTmpDataCache (): TmpDataCache {
  const newDir = path.join(__dirname, '../../', `data-${crypto.randomUUID()}`)

  if (fs.existsSync(newDir)) {
    fs.rmSync(newDir)
  }

  fs.cpSync(getDataDirectory(), newDir, { recursive: true })

  return {
    path: newDir,
    delete: (): void => {
      fs.rmSync(newDir, { recursive: true })
    }
  }
}
