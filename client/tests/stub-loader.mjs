import { readFileSync } from 'node:fs'
const iconNames = (() => {
  const src = readFileSync(new URL('../src/data/games.js', import.meta.url), 'utf8')
  const m = src.match(/import\s*\{([^}]+)\}\s*from 'lucide-react'/)
  return m[1].split(',').map((s) => s.trim()).filter(Boolean)
})()
export async function resolve(spec, ctx, next) {
  if (spec === 'react' || spec === 'lucide-react') return { url: `stub:${spec}`, shortCircuit: true }
  if (/games\/registry(\.js)?$/.test(spec)) return { url: 'stub:registry', shortCircuit: true }
  try { return await next(spec, ctx) } catch (e) {
    if (spec.startsWith('.') && !/\.\w+$/.test(spec.split('?')[0])) return next(spec + '.js', ctx) // Vite allows extension-less imports
    throw e
  }
}
export async function load(url, ctx, next) {
  if (url === 'stub:react') return { format: 'module', shortCircuit: true, source: 'export const useSyncExternalStore = () => null' }
  if (url === 'stub:lucide-react') return { format: 'module', shortCircuit: true, source: iconNames.map((n) => `export const ${n} = () => null`).join('\n') }
  if (url === 'stub:registry') return { format: 'module', shortCircuit: true, source: `const r = {${['memory-matrix','code-breaker','stair-jump','one-minute-challenge','two-doors','mind-games','trivia-party'].map((s) => `'${s}': 1`).join(',')}}; export const registry = r; export const isPlayable = (s) => s in r; export const playableSlugs = () => Object.keys(r)` }
  return next(url, ctx)
}
