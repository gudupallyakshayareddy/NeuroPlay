// Multiplayer client: one socket connection shared across pages, room state
// behind a tiny external store (navigation never drops the connection).
import { useSyncExternalStore } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api'

let socket = null
let state = { connected: false, myId: null, room: null, chat: [], gameState: null, priv: null, results: null, error: null }
const listeners = new Set()
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }

function ensureSocket() {
  if (socket) return socket
  socket = io(SOCKET_URL, { autoConnect: true, reconnectionAttempts: 5, timeout: 8000 })
  socket.on('connect', () => set({ connected: true, myId: socket.id, error: null }))
  socket.on('disconnect', () => set({ connected: false }))
  socket.on('connect_error', () => set({ connected: false, error: 'Cannot reach the multiplayer server. Is the backend running?' }))
  socket.on('room:update', (room) => {
    // A rematch resets the room to the lobby: drop stale roles/results.
    if (room.phase === 'lobby') set({ room, error: null, gameState: null, priv: null, results: null })
    else set({ room, error: null })
  })
  socket.on('room:chat', (m) => set({ chat: [...state.chat, m].slice(-80) }))
  socket.on('room:error', ({ error }) => set({ error }))
  socket.on('game:private', (p) => set({ priv: { ...state.priv, ...p } }))
  socket.on('game:state', (gameState) => set({ gameState }))
  socket.on('game:round', (r) => set({ gameState: { ...state.gameState, roundResult: r, judging: false } }))
  socket.on('game:results', (results) => set({ results }))
  return socket
}

const call = (event, payload) => new Promise((resolve) => {
  const s = ensureSocket()
  if (!s.connected) {
    // wait briefly for the connection before giving up
    const t = setTimeout(() => resolve({ error: 'Not connected to the multiplayer server.' }), 6000)
    s.once('connect', () => { clearTimeout(t); s.emit(event, payload, resolve) })
    return
  }
  s.emit(event, payload, resolve)
})

export async function createRoom(game, name, avatar) {
  set({ chat: [], gameState: null, priv: null, results: null, error: null })
  const r = await call('room:create', { game, name, avatar })
  if (r?.error) set({ error: r.error })
  return r
}
export async function joinRoom(code, name, avatar) {
  set({ chat: [], gameState: null, priv: null, results: null, error: null })
  const r = await call('room:join', { code, name, avatar })
  if (r?.error) set({ error: r.error })
  return r
}
export const setReady = (ready) => ensureSocket().emit('room:ready', { ready })
export const startRoom = () => ensureSocket().emit('room:start')
export const rematchRoom = () => ensureSocket().emit('room:rematch')
export const sendChat = (text) => ensureSocket().emit('room:chat', { text })
export const gameAction = (a) => ensureSocket().emit('game:action', a)
export function leaveRoom() {
  if (socket) socket.emit('room:leave')
  set({ room: null, chat: [], gameState: null, priv: null, results: null, error: null })
}
export const clearRoomError = () => set({ error: null })
export const connectSocket = () => ensureSocket()

export function useRoom() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}