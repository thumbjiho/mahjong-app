import { useEffect, useState } from 'react'
import { loadEngine } from '../domain/engine'

type Engine = Awaited<ReturnType<typeof loadEngine>>

export function useEngine() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadEngine()
      .then((e) => {
        if (!cancelled) setEngine(e)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { engine, error, loading: !engine && !error }
}
