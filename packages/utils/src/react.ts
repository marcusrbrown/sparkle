import {useCallback, useEffect, useRef, useState} from 'react'

/**
 * Custom hook for debouncing values
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for handling click outside events
 * @param handler The callback to execute when clicking outside
 * @returns Ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement>(handler: () => void): React.RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [handler])

  return ref
}

/**
 * Custom hook for handling async operations safely
 * @param asyncFn The async function to execute
 * @returns Tuple containing loading state, error state, and memoized callback
 */
export function useAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
): [boolean, Error | null, (...args: Parameters<T>) => Promise<ReturnType<T>>] {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      try {
        setLoading(true)
        setError(null)
        return await asyncFn(...args)
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error(String(error_)))
        throw error_
      } finally {
        setLoading(false)
      }
    },
    [asyncFn],
  )

  return [loading, error, execute]
}
