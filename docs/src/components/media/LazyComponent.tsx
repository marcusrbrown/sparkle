import React from 'react'

/**
 * Props for the LazyComponent wrapper
 */
export interface LazyComponentProps {
  /** Child component to render lazily */
  children: React.ReactNode
  /** Placeholder content while loading */
  fallback?: React.ReactNode
  /** Intersection observer root margin */
  rootMargin?: string
  /** Intersection observer threshold */
  threshold?: number
  /** Additional CSS classes for the container */
  className?: string
  /** Minimum height to reserve for the component */
  minHeight?: string
}

/**
 * LazyComponent - Intersection Observer-based lazy loader
 *
 * Renders a component only when it enters the viewport, reducing initial
 * JavaScript bundle execution and improving Time to Interactive (TTI).
 *
 * Uses the Intersection Observer API for efficient viewport detection.
 *
 * @example
 * ```tsx
 * <LazyComponent fallback={<div>Loading...</div>} minHeight="400px">
 *   <HeavyComponent />
 * </LazyComponent>
 * ```
 */
export function LazyComponent({
  children,
  fallback = null,
  rootMargin = '50px',
  threshold = 0.01,
  className = '',
  minHeight = 'auto',
}: LazyComponentProps): React.JSX.Element {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin,
        threshold,
      },
    )

    if (containerRef.current != null) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [rootMargin, threshold])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        minHeight: isIntersecting ? 'auto' : minHeight,
        transition: 'min-height 0.3s ease-out',
      }}
    >
      {isIntersecting ? children : fallback}
    </div>
  )
}
