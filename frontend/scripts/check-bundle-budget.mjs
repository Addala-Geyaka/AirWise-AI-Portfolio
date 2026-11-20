import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const outputDirectory = new URL('../dist/assets/', import.meta.url)
const entryFiles = readdirSync(outputDirectory).filter((name) => /^index-.*\.js$/.test(name))
const maximumGzipBytes = 250 * 1024

if (entryFiles.length === 0) throw new Error('No Vite entry JavaScript bundle was found.')

const gzipBytes = entryFiles.reduce((sum, name) => {
  const fileUrl = new URL(name, outputDirectory)
  return sum + gzipSync(readFileSync(fileUrl)).byteLength
}, 0)

console.log(`Entry JavaScript: ${(gzipBytes / 1024).toFixed(1)} KB gzipped`)
if (gzipBytes > maximumGzipBytes) {
  throw new Error(`Entry bundle exceeds ${(maximumGzipBytes / 1024).toFixed(0)} KB gzipped.`)
}
