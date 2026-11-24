// Lets node:test import the engine without React, icons or game components installed.
import { register } from 'node:module'
register('./stub-loader.mjs', import.meta.url)
const mem = new Map()
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear() }
