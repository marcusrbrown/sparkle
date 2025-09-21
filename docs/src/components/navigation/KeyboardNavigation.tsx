import React, {useEffect, useRef} from 'react'
import {useFocusManagement, useSkipNavigation} from '../../hooks/use-focus-management'

interface SkipNavigationProps {
  /** Array of skip navigation targets */
  targets: {
    id: string
    label: string
  }[]
}

/**
 * Skip navigation component that provides keyboard accessibility
 * Renders hidden links that become visible when focused via keyboard
 * Follows WCAG 2.1 AA guidelines for skip navigation
 */
export function SkipNavigation({targets}: SkipNavigationProps): React.JSX.Element {
  const {skipToContent} = useSkipNavigation()

  const handleSkipClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string): void => {
    event.preventDefault()
    skipToContent(targetId)
  }

  const handleSkipKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, targetId: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      skipToContent(targetId)
    }
  }

  return (
    <nav aria-label="Skip navigation" className="skip-navigation">
      {targets.map(({id, label}) => (
        <a
          key={id}
          href={`#${id}`}
          className="skip-link"
          onClick={event => handleSkipClick(event, id)}
          onKeyDown={event => handleSkipKeyDown(event, id)}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}

interface FocusableWrapperProps {
  children: React.ReactNode
  /** Whether to apply roving tabindex behavior */
  useRovingTabindex?: boolean
  /** Direction for roving tabindex */
  direction?: 'horizontal' | 'vertical' | 'grid'
  /** Whether to loop when reaching end of items */
  loop?: boolean
  /** ARIA role for the container */
  role?: string
  /** ARIA label for the container */
  ariaLabel?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Wrapper component that adds keyboard navigation capabilities to its children
 * Provides roving tabindex functionality for complex widgets
 */
export function FocusableWrapper({
  children,
  useRovingTabindex = false,
  direction = 'horizontal',
  loop = true,
  role,
  ariaLabel,
  className = '',
}: FocusableWrapperProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const {getFocusableElements} = useFocusManagement()

  // Initialize roving tabindex if enabled
  useEffect(() => {
    if (!useRovingTabindex || !containerRef.current) return

    const container = containerRef.current
    const focusableItems = getFocusableElements(container)

    // Set initial tabindices - first item is focusable, others are not
    focusableItems.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1
      item.dataset.rovingTabindex = 'true'
    })

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!container.contains(event.target as HTMLElement)) return

      const items = getFocusableElements(container).filter(item => 'rovingTabindex' in item.dataset)
      const currentIndex = items.indexOf(event.target as HTMLElement)
      if (currentIndex === -1) return

      let newIndex = currentIndex
      let shouldPreventDefault = false

      switch (direction) {
        case 'horizontal':
          if (event.key === 'ArrowLeft') {
            newIndex = loop && currentIndex === 0 ? items.length - 1 : Math.max(0, currentIndex - 1)
            shouldPreventDefault = true
          } else if (event.key === 'ArrowRight') {
            newIndex = loop && currentIndex === items.length - 1 ? 0 : Math.min(items.length - 1, currentIndex + 1)
            shouldPreventDefault = true
          }
          break

        case 'vertical':
          if (event.key === 'ArrowUp') {
            newIndex = loop && currentIndex === 0 ? items.length - 1 : Math.max(0, currentIndex - 1)
            shouldPreventDefault = true
          } else if (event.key === 'ArrowDown') {
            newIndex = loop && currentIndex === items.length - 1 ? 0 : Math.min(items.length - 1, currentIndex + 1)
            shouldPreventDefault = true
          }
          break

        case 'grid':
          // Basic grid implementation - would need customization for specific layouts
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const delta = event.key === 'ArrowLeft' ? -1 : 1
            newIndex = loop
              ? (currentIndex + delta + items.length) % items.length
              : Math.max(0, Math.min(items.length - 1, currentIndex + delta))
            shouldPreventDefault = true
          }
          break
      }

      // Handle Home/End keys
      if (event.key === 'Home') {
        newIndex = 0
        shouldPreventDefault = true
      } else if (event.key === 'End') {
        newIndex = items.length - 1
        shouldPreventDefault = true
      }

      if (shouldPreventDefault) {
        event.preventDefault()

        // Update tabindices
        items.forEach((item, index) => {
          item.tabIndex = index === newIndex ? 0 : -1
        })

        // Focus the new item
        items[newIndex]?.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [useRovingTabindex, direction, loop, getFocusableElements])

  return (
    <div ref={containerRef} role={role} aria-label={ariaLabel} className={`focusable-wrapper ${className}`.trim()}>
      {children}
    </div>
  )
}

interface KeyboardInstructionsProps {
  /** Instructions to display */
  instructions: {
    key: string
    description: string
  }[]
  /** Whether to show the instructions by default */
  visible?: boolean
  /** Custom title for the instructions */
  title?: string
}

/**
 * Component that displays keyboard navigation instructions
 * Can be shown/hidden and provides context for keyboard users
 */
export function KeyboardInstructions({
  instructions,
  visible = false,
  title = 'Keyboard Navigation',
}: KeyboardInstructionsProps): React.JSX.Element {
  const [isVisible, setIsVisible] = React.useState(visible)

  return (
    <div className="keyboard-instructions">
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        aria-expanded={isVisible}
        aria-controls="keyboard-instructions-content"
        className="keyboard-instructions__toggle"
      >
        {title} {isVisible ? '▲' : '▼'}
      </button>

      {isVisible && (
        <div id="keyboard-instructions-content" className="keyboard-instructions__content">
          <h3 className="keyboard-instructions__title sr-only">{title}</h3>
          <dl className="keyboard-instructions__list">
            {instructions.map(({key, description}) => (
              <div key={`${key}-${description}`} className="keyboard-instructions__item">
                <dt className="keyboard-instructions__key">
                  <kbd>{key}</kbd>
                </dt>
                <dd className="keyboard-instructions__description">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

export interface AccessibleModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to close the modal */
  onClose: () => void
  /** Modal title for screen readers */
  title: string
  /** Modal content */
  children: React.ReactNode
  /** Whether to restore focus when modal closes */
  restoreFocus?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Accessible modal component with focus management
 * Implements focus trapping and keyboard accessibility patterns
 */
export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  restoreFocus = true,
  className = '',
}: AccessibleModalProps): React.JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null)
  const {storeFocus, restoreFocus: doRestoreFocus} = useFocusManagement()

  // Focus trap when modal is open
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    // Store focus before opening modal
    if (restoreFocus) {
      storeFocus()
    }

    // Focus the modal
    modalRef.current.focus()

    // Handle escape key
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)

      // Restore focus when modal closes
      if (restoreFocus) {
        doRestoreFocus()
      }
    }
  }, [isOpen, onClose, restoreFocus, storeFocus, doRestoreFocus])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`modal ${className}`.trim()}
        onClick={event => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close modal" className="modal__close">
            ×
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  )
}
