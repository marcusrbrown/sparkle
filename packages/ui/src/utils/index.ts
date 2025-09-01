/**
 * Common utility functions for UI components
 */

import type {As, PropsWithAs} from '../types'

/**
 * Combines multiple class names into a single string
 */
export const cx = (...args: (string | Record<string, boolean> | undefined | null | false)[]) =>
  args
    .flatMap(arg => {
      if (!arg) return []
      if (typeof arg === 'string') return [arg]
      return Object.entries(arg)
        .filter(([, value]) => value)
        .map(([key]) => key)
    })
    .join(' ')

/**
 * Creates a type-safe component factory
 */
export function createComponent<Props extends object, DefaultElement extends As>(
  render: (props: PropsWithAs<Props, DefaultElement>) => React.ReactElement | null,
  defaultElement: DefaultElement,
): ((props: PropsWithAs<Props, DefaultElement>) => React.ReactElement | null) & {displayName?: string} {
  return Object.assign(
    (props: PropsWithAs<Props, DefaultElement>) => {
      const Element = (props.as ?? defaultElement) as DefaultElement
      return render({...props, as: Element})
    },
    {displayName: render.name},
  )
}

// Re-export types needed by utils
export type {As, PropsWithAs}
