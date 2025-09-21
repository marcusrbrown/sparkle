import {useEffect, useRef, type RefObject} from 'react'

/**
 * Configuration options for focus management behavior
 */
interface FocusManagementOptions {
  /** Whether to fallback to document.body when target element is not found */
  fallbackToBody?: boolean
}

/**
 * Focusable element selectors following WCAG guidelines
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
] as const

/**
 * Hook for managing focus within a component following WCAG 2.1 AA guidelines.
 *
 * Provides utilities for storing, restoring, and managing focus state with
 * proper fallback handling and type safety.
 *
 * @example
 * ```tsx
 * const {storeFocus, restoreFocus, moveFocusTo} = useFocusManagement()
 *
 * // Store focus before opening modal
 * const openModal = () => {
 *   storeFocus()
 *   setModalOpen(true)
 * }
 *
 * // Restore focus when closing modal
 * const closeModal = () => {
 *   setModalOpen(false)
 *   restoreFocus()
 * }
 * ```
 */
export function useFocusManagement(options: FocusManagementOptions = {}) {
  const {fallbackToBody = true} = options
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  /**
   * Stores the currently focused element for later restoration.
   *
   * This should be called before any action that will move focus away
   * from the current element (e.g., opening a modal or dialog).
   */
  const storeFocus = (): void => {
    lastFocusedElement.current = document.activeElement as HTMLElement
  }

  /**
   * Restores focus to the previously stored element.
   *
   * Falls back to document.body if no element was stored or if the
   * stored element is no longer in the document.
   */
  const restoreFocus = (): void => {
    const storedElement = lastFocusedElement.current

    if (storedElement && document.contains(storedElement)) {
      storedElement.focus()
      return
    }

    if (fallbackToBody) {
      document.body.focus()
    }
  }

  /**
   * Moves focus to the specified element with type safety.
   *
   * @param element - The element to focus, or a ref containing the element
   */
  const moveFocusTo = (element: HTMLElement | RefObject<HTMLElement>): void => {
    const targetElement = 'current' in element ? element.current : element

    if (targetElement) {
      targetElement.focus()
    }
  }

  /**
   * Gets all focusable elements within a container using WCAG-compliant selectors.
   *
   * Filters out elements that are not visible or interactive, ensuring only
   * truly focusable elements are returned.
   *
   * @param container - The container to search within
   * @returns Array of focusable HTMLElements
   */
  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = FOCUSABLE_SELECTORS.join(',')

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(element => {
      const htmlElement = element as HTMLElement
      // Element must be visible and have dimensions to be considered focusable
      return htmlElement.offsetWidth > 0 || htmlElement.offsetHeight > 0 || htmlElement.getClientRects().length > 0
    }) as HTMLElement[]
  }

  return {
    storeFocus,
    restoreFocus,
    moveFocusTo,
    getFocusableElements,
    lastFocusedElement,
  }
}

/**
 * Hook for implementing focus trap within a container for modal dialogs and overlays.
 *
 * Implements WCAG 2.1 guidelines for focus management by ensuring focus remains
 * within the specified container when active. Handles Tab and Shift+Tab navigation
 * to cycle between focusable elements.
 *
 * @param containerRef - Ref to the container element that should trap focus
 * @param isActive - Whether the focus trap should be active
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * useFocusTrap(modalRef, isModalOpen)
 *
 * return (
 *   <div ref={modalRef} role="dialog" aria-modal="true">
 *     <button>First focusable</button>
 *     <input />
 *     <button>Last focusable</button>
 *   </div>
 * )
 * ```
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive = true): void {
  const {getFocusableElements} = useFocusManagement()

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return

      // Get current focusable elements (refreshed each time for dynamic content)
      const focusableElements = getFocusableElements(container)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      const activeElement = document.activeElement as HTMLElement

      if (event.shiftKey) {
        // Shift + Tab - moving backwards
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else if (activeElement === lastElement || !container.contains(activeElement)) {
        // Tab - moving forwards
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef, getFocusableElements])
}

/**
 * Direction options for roving tabindex navigation
 */
type RovingTabindexDirection = 'horizontal' | 'vertical' | 'grid'

/**
 * Configuration options for roving tabindex behavior
 */
interface RovingTabindexOptions {
  /** Navigation direction for arrow keys */
  direction?: RovingTabindexDirection
  /** Whether to loop to the opposite end when reaching boundaries */
  loop?: boolean
  /** Whether to allow no element to have focus initially */
  allowEmptySelection?: boolean
}

/**
 * Return type for useRovingTabindex hook
 */
interface RovingTabindexControls {
  /** Move focus to a specific index */
  moveToIndex: (newIndex: number) => void
  /** Current focused element index */
  currentFocusIndex: number
}

/**
 * ARIA role selectors for roving tabindex elements
 */
const ROVING_TABINDEX_SELECTORS = [
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="option"]',
  '[data-roving-tabindex]',
] as const

/**
 * Hook for implementing roving tabindex pattern for keyboard navigation.
 *
 * Implements WAI-ARIA best practices for navigation lists, toolbars, and grid-like
 * structures. Only one element maintains tabindex="0" while others have tabindex="-1",
 * with arrow keys used to move focus between elements.
 *
 * @param containerRef - Ref to the container holding the navigable elements
 * @param options - Configuration options for navigation behavior
 * @returns Controls for programmatic focus management
 *
 * @example
 * ```tsx
 * const navRef = useRef<HTMLDivElement>(null)
 * const {moveToIndex} = useRovingTabindex(navRef, {
 *   direction: 'horizontal',
 *   loop: true
 * })
 *
 * return (
 *   <div ref={navRef} role="tablist">
 *     <button role="tab" data-roving-tabindex>Tab 1</button>
 *     <button role="tab" data-roving-tabindex>Tab 2</button>
 *   </div>
 * )
 * ```
 */
export function useRovingTabindex(
  containerRef: RefObject<HTMLElement>,
  options: RovingTabindexOptions = {},
): RovingTabindexControls {
  const {direction = 'horizontal', loop = true, allowEmptySelection = false} = options

  const currentFocusIndex = useRef<number>(allowEmptySelection ? -1 : 0)

  /**
   * Get all roving tabindex elements within the container
   */
  const getRovingElements = (): HTMLElement[] => {
    if (!containerRef.current) return []

    const selectors = ROVING_TABINDEX_SELECTORS.join(', ')
    return Array.from(containerRef.current.querySelectorAll(selectors)) as HTMLElement[]
  }

  /**
   * Update tabindex attributes for all roving elements
   */
  const updateTabindices = (activeIndex: number): void => {
    const items = getRovingElements()

    items.forEach((item, index) => {
      item.tabIndex = index === activeIndex ? 0 : -1
    })
  }

  /**
   * Move focus to element at specified index with boundary checking
   */
  const moveToIndex = (newIndex: number): void => {
    const items = getRovingElements()

    if (items.length === 0) return

    let targetIndex = newIndex

    if (loop) {
      // Wrap around at boundaries
      targetIndex = ((newIndex % items.length) + items.length) % items.length
    } else {
      // Clamp to valid range
      targetIndex = Math.max(0, Math.min(newIndex, items.length - 1))
    }

    currentFocusIndex.current = targetIndex
    updateTabindices(targetIndex)
    items[targetIndex]?.focus()
  }

  /**
   * Calculate new index based on direction and key pressed
   */
  const calculateNewIndex = (currentIndex: number, key: string): number | null => {
    switch (direction) {
      case 'horizontal':
        if (key === 'ArrowLeft') return currentIndex - 1
        if (key === 'ArrowRight') return currentIndex + 1
        break

      case 'vertical':
        if (key === 'ArrowUp') return currentIndex - 1
        if (key === 'ArrowDown') return currentIndex + 1
        break

      case 'grid':
        // Basic grid implementation - would need customization for specific layouts
        if (key === 'ArrowLeft') return currentIndex - 1
        if (key === 'ArrowRight') return currentIndex + 1
        // Note: Up/Down navigation requires knowledge of grid dimensions
        break
    }

    // Handle Home/End keys for all directions
    if (key === 'Home') return 0
    if (key === 'End') {
      const items = getRovingElements()
      return items.length - 1
    }

    return null
  }

  /**
   * Handle keyboard navigation events
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!containerRef.current?.contains(event.target as HTMLElement)) return

    const items = getRovingElements()
    const currentIndex = items.indexOf(event.target as HTMLElement)

    if (currentIndex === -1) return

    const newIndex = calculateNewIndex(currentIndex, event.key)

    if (newIndex !== null) {
      event.preventDefault()
      moveToIndex(newIndex)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize tabindices on mount
    updateTabindices(currentFocusIndex.current)

    const container = containerRef.current
    container.addEventListener('keydown', handleKeyDown)

    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [direction, loop, allowEmptySelection])

  return {
    moveToIndex,
    currentFocusIndex: currentFocusIndex.current,
  }
}

/**
 * Configuration options for skip navigation behavior
 */
interface SkipNavigationOptions {
  /** Whether to enable debug logging */
  debug?: boolean
}

/**
 * Return type for useSkipNavigation hook
 */
interface SkipNavigationControls {
  /** Skip to element with the specified selector */
  skipTo: (selector: string) => void
  /** Check if a skip target exists on the page */
  hasSkipTarget: (selector: string) => boolean
  /** Legacy method for ID-based skipping (deprecated) */
  skipToContent: (targetId: string) => void
}

/**
 * Common skip navigation target selectors in order of priority
 */
const SKIP_TARGET_SELECTORS = [
  'main',
  '[role="main"]',
  '#main',
  '#content',
  '.main-content',
  'article',
  '[data-skip-target]',
] as const

/**
 * Hook for implementing skip navigation functionality.
 *
 * Provides accessible skip links that allow users to bypass repetitive navigation
 * content and jump directly to main content areas. Implements WCAG 2.1 requirements
 * for keyboard navigation efficiency.
 *
 * @param options - Configuration options for skip navigation behavior
 * @returns Controls for programmatic skip navigation
 *
 * @example
 * ```tsx
 * function SkipLinks() {
 *   const {skipTo, hasSkipTarget} = useSkipNavigation({debug: true})
 *
 *   return (
 *     <nav aria-label="Skip navigation">
 *       <button
 *         onClick={() => skipTo('main')}
 *         className="skip-link"
 *       >
 *         Skip to main content
 *       </button>
 *       {hasSkipTarget('#sidebar') && (
 *         <button onClick={() => skipTo('#sidebar')}>
 *           Skip to sidebar
 *         </button>
 *       )}
 *     </nav>
 *   )
 * }
 * ```
 */
export function useSkipNavigation(options: SkipNavigationOptions = {}): SkipNavigationControls {
  const {debug = false} = options

  /**
   * Find the best skip target element on the page
   */
  const findSkipTarget = (selector?: string): HTMLElement | null => {
    // If specific selector provided, try that first
    if (selector) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) return element
    }

    // Fall back to common skip targets
    for (const targetSelector of SKIP_TARGET_SELECTORS) {
      const element = document.querySelector(targetSelector) as HTMLElement
      if (element) return element
    }

    if (debug) {
      console.warn('No skip navigation target found on page')
    }

    return null
  }

  /**
   * Check if a skip target exists for the given selector
   */
  const hasSkipTarget = (selector: string): boolean => {
    return Boolean(findSkipTarget(selector))
  }

  /**
   * Skip to the specified target element with smooth scrolling and focus management
   */
  const skipTo = (selector: string): void => {
    const target = findSkipTarget(selector)

    if (!target) {
      if (debug) {
        console.warn(`Skip target not found: ${selector}`)
      }
      return
    }

    try {
      // Ensure target is focusable
      if (target.tabIndex === undefined || target.tabIndex < 0) {
        target.tabIndex = -1
      }

      // Smooth scroll to target
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })

      // Focus the target after scrolling completes
      // Small delay to allow smooth scroll to finish
      setTimeout(() => {
        target.focus({preventScroll: true})

        if (debug) {
          console.warn(`Skipped to element: ${selector}`)
        }
      }, 150)
    } catch (error) {
      if (debug) {
        console.error('Error during skip navigation:', error)
      }
    }
  }

  /**
   * Legacy method for ID-based skip navigation
   * @deprecated Use skipTo() with selector instead
   */
  const skipToContent = (targetId: string): void => {
    const target = document.querySelector(`#${CSS.escape(targetId)}`)
    if (target instanceof HTMLElement) {
      // Make the target focusable if it isn't already
      if (target.tabIndex < 0) {
        target.tabIndex = -1
      }
      target.focus()

      // Remove tabindex after a short delay to restore normal behavior
      setTimeout(() => {
        if (target.tabIndex === -1) {
          target.removeAttribute('tabindex')
        }
      }, 100)
    }
  }

  return {
    skipTo,
    hasSkipTarget,
    skipToContent, // Keep for backward compatibility
  }
}
