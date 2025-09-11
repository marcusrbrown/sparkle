import {useEffect, useState} from 'react'

/**
 * Responsive breakpoints matching Sparkle design tokens
 */
export const breakpoints = {
  mobile: 320,
  mobileLarge: 480,
  tablet: 768,
  desktop: 1024,
  desktopLarge: 1280,
} as const

export type BreakpointKey = keyof typeof breakpoints

/**
 * Screen size information
 */
export interface ScreenSize {
  /** Current screen width in pixels */
  width: number
  /** Current screen height in pixels */
  height: number
  /** Whether the screen is mobile-sized (< 768px) */
  isMobile: boolean
  /** Whether the screen is tablet-sized (768px - 1023px) */
  isTablet: boolean
  /** Whether the screen is desktop-sized (>= 1024px) */
  isDesktop: boolean
  /** Whether the screen is large desktop-sized (>= 1280px) */
  isDesktopLarge: boolean
  /** Current breakpoint key */
  breakpoint: BreakpointKey
}

/**
 * Custom hook for responsive design patterns in Sparkle documentation.
 *
 * Provides current screen size information and responsive breakpoint detection
 * that matches the CSS breakpoints defined in sparkle-theme.css.
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { isMobile, isTablet, isDesktop, width } = useResponsive()
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *       <p>Screen width: {width}px</p>
 *     </div>
 *   )
 * }
 * ```
 *
 * @returns Screen size information and breakpoint helpers
 */
export function useResponsive(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    // Server-side rendering safe defaults
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isDesktopLarge: false,
        breakpoint: 'desktop' as BreakpointKey,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight

    return {
      width,
      height,
      isMobile: width < breakpoints.tablet,
      isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
      isDesktop: width >= breakpoints.desktop,
      isDesktopLarge: width >= breakpoints.desktopLarge,
      breakpoint: getBreakpoint(width),
    }
  })

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight

      setScreenSize({
        width,
        height,
        isMobile: width < breakpoints.tablet,
        isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
        isDesktop: width >= breakpoints.desktop,
        isDesktopLarge: width >= breakpoints.desktopLarge,
        breakpoint: getBreakpoint(width),
      })
    }

    // Use passive event listener for better performance
    window.addEventListener('resize', handleResize, {passive: true})

    // Call once to set initial values
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return screenSize
}

/**
 * Determines the current breakpoint based on screen width
 */
function getBreakpoint(width: number): BreakpointKey {
  if (width >= breakpoints.desktopLarge) return 'desktopLarge'
  if (width >= breakpoints.desktop) return 'desktop'
  if (width >= breakpoints.tablet) return 'tablet'
  if (width >= breakpoints.mobileLarge) return 'mobileLarge'
  return 'mobile'
}

/**
 * Media query helper for specific breakpoints
 *
 * @example
 * ```tsx
 * const isMobileOrTablet = useMediaQuery('(max-width: 1023px)')
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [query])

  return matches
}
