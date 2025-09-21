import {useEffect, useRef, type RefObject} from 'react'

/**
 * Hook for managing focus within a component
 * Provides utilities for focus management following WCAG 2.1 AA guidelines
 */
export function useFocusManagement() {
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  /**
   * Stores the currently focused element for later restoration
   */
  const storeFocus = (): void => {
    lastFocusedElement.current = document.activeElement as HTMLElement
  }

  /**
   * Restores focus to the previously stored element
   * Falls back to document.body if no element was stored
   */
  const restoreFocus = (): void => {
    if (lastFocusedElement.current && document.contains(lastFocusedElement.current)) {
      lastFocusedElement.current.focus()
    } else {
      // Fallback to document.body if stored element no longer exists
      document.body.focus()
    }
  }

  /**
   * Moves focus to the specified element
   * @param element - The element to focus, or a ref containing the element
   */
  const moveFocusTo = (element: HTMLElement | RefObject<HTMLElement>): void => {
    const targetElement = 'current' in element ? element.current : element
    if (targetElement) {
      targetElement.focus()
    }
  }

  /**
   * Gets all focusable elements within a container
   * @param container - The container to search within
   * @returns Array of focusable elements
   */
  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(',')

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(element => {
      const htmlElement = element as HTMLElement
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
 * Hook for implementing focus trap within a container
 * Useful for modal dialogs and other overlay components
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive = true): void {
  const {getFocusableElements} = useFocusManagement()

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    let focusableElements = getFocusableElements(container)

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return

      // Refresh focusable elements in case DOM changed
      focusableElements = getFocusableElements(container)

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
 * Hook for implementing roving tabindex pattern
 * Useful for navigation lists, toolbars, and grid-like structures
 */
export function useRovingTabindex(
  containerRef: RefObject<HTMLElement>,
  {
    direction = 'horizontal',
    loop = true,
    allowEmptySelection = false,
  }: {
    direction?: 'horizontal' | 'vertical' | 'grid'
    loop?: boolean
    allowEmptySelection?: boolean
  } = {},
) {
  const currentFocusIndex = useRef<number>(allowEmptySelection ? -1 : 0)

  const updateTabindices = (activeIndex: number): void => {
    if (!containerRef.current) return

    const items = Array.from(
      containerRef.current.querySelectorAll('[role="menuitem"], [role="tab"], [role="option"], [data-roving-tabindex]'),
    ) as HTMLElement[]

    items.forEach((item, index) => {
      item.tabIndex = index === activeIndex ? 0 : -1
    })
  }

  const moveToIndex = (newIndex: number): void => {
    if (!containerRef.current) return

    const items = Array.from(
      containerRef.current.querySelectorAll('[role="menuitem"], [role="tab"], [role="option"], [data-roving-tabindex]'),
    ) as HTMLElement[]

    if (items.length === 0) return

    let targetIndex = newIndex

    if (loop) {
      targetIndex = ((newIndex % items.length) + items.length) % items.length
    } else {
      targetIndex = Math.max(0, Math.min(newIndex, items.length - 1))
    }

    currentFocusIndex.current = targetIndex
    updateTabindices(targetIndex)
    items[targetIndex]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!containerRef.current || !containerRef.current.contains(event.target as HTMLElement)) {
      return
    }

    const items = Array.from(
      containerRef.current.querySelectorAll('[role="menuitem"], [role="tab"], [role="option"], [data-roving-tabindex]'),
    ) as HTMLElement[]

    const currentIndex = items.indexOf(event.target as HTMLElement)
    if (currentIndex === -1) return

    let newIndex = currentIndex

    switch (direction) {
      case 'horizontal':
        if (event.key === 'ArrowLeft') {
          newIndex = currentIndex - 1
          event.preventDefault()
        } else if (event.key === 'ArrowRight') {
          newIndex = currentIndex + 1
          event.preventDefault()
        }
        break

      case 'vertical':
        if (event.key === 'ArrowUp') {
          newIndex = currentIndex - 1
          event.preventDefault()
        } else if (event.key === 'ArrowDown') {
          newIndex = currentIndex + 1
          event.preventDefault()
        }
        break

      case 'grid':
        // For grid, implement based on specific grid layout
        // This is a basic implementation - would need customization for specific grids
        if (event.key === 'ArrowLeft') {
          newIndex = currentIndex - 1
          event.preventDefault()
        } else if (event.key === 'ArrowRight') {
          newIndex = currentIndex + 1
          event.preventDefault()
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // Would need to know grid dimensions for proper up/down navigation
          event.preventDefault()
        }
        break
    }

    // Handle Home/End keys
    if (event.key === 'Home') {
      newIndex = 0
      event.preventDefault()
    } else if (event.key === 'End') {
      newIndex = items.length - 1
      event.preventDefault()
    }

    if (newIndex !== currentIndex) {
      moveToIndex(newIndex)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize tabindices
    updateTabindices(currentFocusIndex.current)

    containerRef.current.addEventListener('keydown', handleKeyDown)
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [direction, loop, allowEmptySelection])

  return {
    moveToIndex,
    currentFocusIndex: currentFocusIndex.current,
  }
}

/**
 * Hook for implementing skip navigation links
 * Automatically manages focus when skip links are activated
 */
export function useSkipNavigation() {
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

  return {skipToContent}
}
