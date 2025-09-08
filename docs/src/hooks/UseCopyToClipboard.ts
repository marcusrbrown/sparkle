import {useCallback, useState} from 'react'

/**
 * State of the copy operation
 */
export type CopyState = 'idle' | 'copying' | 'copied' | 'error'

/**
 * Options for the copy-to-clipboard hook
 */
export interface UseCopyToClipboardOptions {
  /** Duration in milliseconds to show "copied" state before returning to idle */
  resetDelay?: number
  /** Custom error message to display on copy failure */
  errorMessage?: string
  /** Whether to use the legacy execCommand fallback if Clipboard API is unavailable */
  useFallback?: boolean
}

/**
 * Return type for the copy-to-clipboard hook
 */
export interface UseCopyToClipboardResult {
  /** Current state of the copy operation */
  state: CopyState
  /** Function to copy text to clipboard */
  copyToClipboard: (text: string) => Promise<boolean>
  /** Error message if copy operation failed */
  error: string | null
  /** Whether the copy operation is currently in progress */
  isCopying: boolean
  /** Whether the copy operation was successful */
  isCopied: boolean
  /** Whether the copy operation failed */
  isError: boolean
}

/**
 * Custom hook for copying text to clipboard with visual feedback states.
 *
 * This hook provides a comprehensive clipboard copy functionality with proper
 * error handling, fallback support, and state management for UI feedback.
 * It uses the modern Clipboard API when available and falls back to the
 * legacy execCommand method for broader browser support.
 *
 * @param options Configuration options for the copy behavior
 * @returns Object containing copy function and state information
 *
 * @example
 * ```tsx
 * function CopyExample() {
 *   const { copyToClipboard, state, error } = useCopyToClipboard({
 *     resetDelay: 2000,
 *     useFallback: true
 *   })
 *
 *   const handleCopy = async () => {
 *     const success = await copyToClipboard('Hello, World!')
 *     if (!success) {
 *       console.error('Failed to copy:', error)
 *     }
 *   }
 *
 *   return (
 *     <button onClick={handleCopy} disabled={state === 'copying'}>
 *       {state === 'copied' ? 'Copied!' : 'Copy'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const {resetDelay = 2000, errorMessage = 'Failed to copy to clipboard', useFallback = true} = options

  const [state, setState] = useState<CopyState>('idle')
  const [error, setError] = useState<string | null>(null)

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) {
        setError('No text provided to copy')
        setState('error')
        return false
      }

      setState('copying')
      setError(null)

      try {
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
          setState('copied')

          // Reset to idle state after delay
          setTimeout(() => {
            setState('idle')
          }, resetDelay)

          return true
        }

        // Fallback to legacy execCommand method
        if (useFallback && typeof document.execCommand === 'function') {
          const success = await copyWithExecCommand(text)
          if (success) {
            setState('copied')

            // Reset to idle state after delay
            setTimeout(() => {
              setState('idle')
            }, resetDelay)

            return true
          }
        }

        throw new Error('Clipboard API not available and fallback disabled')
      } catch (error_) {
        const errorMsg = error_ instanceof Error ? error_.message : errorMessage
        setError(errorMsg)
        setState('error')

        // Reset to idle state after delay
        setTimeout(() => {
          setState('idle')
          setError(null)
        }, resetDelay)

        return false
      }
    },
    [resetDelay, errorMessage, useFallback],
  )

  return {
    state,
    copyToClipboard,
    error,
    isCopying: state === 'copying',
    isCopied: state === 'copied',
    isError: state === 'error',
  }
}

/**
 * Legacy fallback method using execCommand for copying text.
 * This method creates a temporary textarea element, selects the text,
 * and uses document.execCommand('copy') to copy it to the clipboard.
 *
 * @param text The text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
async function copyWithExecCommand(text: string): Promise<boolean> {
  return new Promise(resolve => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.setAttribute('aria-hidden', 'true')
    textarea.setAttribute('tabindex', '-1')

    document.body.append(textarea)

    try {
      textarea.select()
      textarea.setSelectionRange(0, text.length)
      const success = document.execCommand('copy')
      resolve(success)
    } catch {
      resolve(false)
    } finally {
      textarea.remove()
    }
  })
}
