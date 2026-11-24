import { useCallback, useEffect, useState } from 'react'

const KEY = 'neuroplay:favorites'

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

/**
 * Favorites are saved in this browser only (localStorage).
 * In Phase 2 they will move to the user's account in the database.
 */
export default function useFavorites() {
  const [favs, setFavs] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favs))
    } catch {
      /* storage can be blocked (private mode); the app still works */
    }
  }, [favs])

  const toggle = useCallback(
    (slug) => setFavs((f) => (f.includes(slug) ? f.filter((s) => s !== slug) : [...f, slug])),
    [],
  )
  const isFav = useCallback((slug) => favs.includes(slug), [favs])

  return { favs, toggle, isFav }
}
