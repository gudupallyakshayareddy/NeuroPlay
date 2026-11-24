import { test } from 'node:test'
import assert from 'node:assert/strict'
import { callGemini, geminiEnabled, parseJson } from '../src/gemini.js'
import { triviaBank } from '../src/data/trivia.js'

test('parseJson strips markdown fences', () => {
  assert.deepEqual(parseJson('```json\n[{"a":1}]\n```'), [{ a: 1 }])
  assert.deepEqual(parseJson('{"x":2}'), { x: 2 })
})

test('without GEMINI_API_KEY Gemini is disabled and calls throw (callers use fallbacks)', async () => {
  const old = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  assert.equal(geminiEnabled(), false)
  await assert.rejects(callGemini({ prompt: 'hi' }), /GEMINI_API_KEY/)
  if (old) process.env.GEMINI_API_KEY = old
})

test('key is sent only as a request header, never in the URL or body; HTTP errors throw', async () => {
  process.env.GEMINI_API_KEY = 'SECRET-TEST-KEY'
  const realFetch = globalThis.fetch
  let seen
  globalThis.fetch = async (url, opts) => { seen = { url, opts }; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }) } }
  assert.equal(await callGemini({ prompt: 'x' }), 'hello')
  assert.ok(!String(seen.url).includes('SECRET-TEST-KEY'))
  assert.ok(!seen.opts.body.includes('SECRET-TEST-KEY'))
  assert.equal(seen.opts.headers['x-goog-api-key'], 'SECRET-TEST-KEY')
  globalThis.fetch = async () => ({ ok: false, status: 429 })
  await assert.rejects(callGemini({ prompt: 'x' }), /429/)
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ candidates: [] }) })
  await assert.rejects(callGemini({ prompt: 'x' }), /Empty/)
  globalThis.fetch = realFetch
  delete process.env.GEMINI_API_KEY
})

test('offline trivia bank is well formed', () => {
  for (const q of triviaBank) {
    assert.equal(q.options.length, 4, q.question)
    assert.equal(new Set(q.options).size, 4, q.question)
    assert.ok(q.answerIndex >= 0 && q.answerIndex <= 3, q.question)
  }
})
