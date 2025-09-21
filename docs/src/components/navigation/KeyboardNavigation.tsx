import React, {useEffect, useRef} from 'react'
import {useFocusManagement, useSkipNavigation} from '../../hooks/use-focus-management'

/**
 * Skip navigation target configuration
 */
interface SkipTarget {
  /** Unique identifier for the target element */
  id: string
  /** Human-readable label for the skip link */
  label: string
}

/**
 * Props for the SkipNavigation component
 */
interface SkipNavigationProps {
  /** Array of skip navigation targets with IDs and labels */
  targets: SkipTarget[]
}

/**
 * Skip navigation component providing keyboard accessibility shortcuts.
 *
 * Renders visually hidden links that become visible when focused via keyboard
 * navigation, allowing users to bypass repetitive content and jump directly
 * to main content areas. Implements WCAG 2.1 AA requirements for skip navigation.
 *
 * The component automatically handles both click and keyboard activation,
 * managing focus transitions and scroll behavior for optimal user experience.
 *
 * @param props - Component configuration
 * @param props.targets - Array of skip navigation targets with IDs and labels
 * @returns JSX element containing accessible skip navigation links
 *
 * @example
 * ```tsx
 * <SkipNavigation
 *   targets={[
 *     {id: 'main', label: 'Skip to main content'},
 *     {id: 'nav', label: 'Skip to navigation'},
 *     {id: 'sidebar', label: 'Skip to sidebar'}
 *   ]}
 * />
 * ```
 */
export function SkipNavigation({targets}: SkipNavigationProps): React.JSX.Element {
  const {skipToContent} = useSkipNavigation()

  /**
   * Handle click events on skip navigation links
   */
  const handleSkipClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string): void => {
    event.preventDefault()
    skipToContent(targetId)
  }

  /**
   * Handle keyboard events on skip navigation links
   */
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

/**
 * Direction options for roving tabindex navigation
 */
type RovingDirection = 'horizontal' | 'vertical' | 'grid'

/**
 * Props for the FocusableWrapper component
 */
interface FocusableWrapperProps {
  /** Child elements to wrap with focus management capabilities */
  children: React.ReactNode
  /** Whether to apply roving tabindex behavior for keyboard navigation */
  useRovingTabindex?: boolean
  /** Direction for arrow key navigation */
  direction?: RovingDirection
  /** Whether to loop to opposite end when reaching boundaries */
  loop?: boolean
  /** ARIA role for semantic meaning (e.g., 'tablist', 'menu', 'toolbar') */
  role?: string
  /** ARIA label for accessibility */
  ariaLabel?: string
  /** Additional CSS classes for styling */
  className?: string
}

/**
 * Wrapper component providing keyboard navigation capabilities to child elements.
 *
 * Adds roving tabindex functionality for complex interactive widgets like
 * tab lists, menus, toolbars, and grids. Implements WAI-ARIA keyboard
 * navigation patterns with arrow key support and optional wrapping behavior.
 *
 * When roving tabindex is enabled, only one child element maintains tabindex="0"
 * while others have tabindex="-1", with arrow keys managing focus transitions.
 * This provides optimal keyboard accessibility for widget collections.
 *
 * @param props - Component configuration
 * @param props.children - Child elements to wrap with focus management
 * @param props.useRovingTabindex - Enable roving tabindex behavior
 * @param props.direction - Arrow key navigation direction
 * @param props.loop - Whether to wrap around at boundaries
 * @param props.role - ARIA role for semantic context
 * @param props.ariaLabel - Accessibility label
 * @param props.className - Additional styling classes
 * @returns JSX element with enhanced keyboard navigation
 *
 * @example
 * ```tsx
 * <FocusableWrapper
 *   useRovingTabindex
 *   direction="horizontal"
 *   role="tablist"
 *   ariaLabel="Main navigation tabs"
 * >
 *   <button role="tab">Tab 1</button>
 *   <button role="tab">Tab 2</button>
 *   <button role="tab">Tab 3</button>
 * </FocusableWrapper>
 * ```
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

  /**
   * Initialize roving tabindex behavior for focusable elements
   */
  useEffect(() => {
    if (!useRovingTabindex || !containerRef.current) return

    const container = containerRef.current
    const focusableItems = getFocusableElements(container)

    // Initialize tabindex attributes - first element is focusable
    focusableItems.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1
      item.dataset.rovingTabindex = 'true'
    })

    /**
     * Calculate new focus index based on direction and key pressed
     */
    const calculateNewIndex = (currentIndex: number, key: string, itemCount: number): number | null => {
      switch (direction) {
        case 'horizontal':
          if (key === 'ArrowLeft') {
            return loop && currentIndex === 0 ? itemCount - 1 : Math.max(0, currentIndex - 1)
          }
          if (key === 'ArrowRight') {
            return loop && currentIndex === itemCount - 1 ? 0 : Math.min(itemCount - 1, currentIndex + 1)
          }
          break

        case 'vertical':
          if (key === 'ArrowUp') {
            return loop && currentIndex === 0 ? itemCount - 1 : Math.max(0, currentIndex - 1)
          }
          if (key === 'ArrowDown') {
            return loop && currentIndex === itemCount - 1 ? 0 : Math.min(itemCount - 1, currentIndex + 1)
          }
          break

        case 'grid':
          // Basic grid navigation - would need customization for specific layouts
          if (key === 'ArrowLeft' || key === 'ArrowRight') {
            const delta = key === 'ArrowLeft' ? -1 : 1
            return loop
              ? (currentIndex + delta + itemCount) % itemCount
              : Math.max(0, Math.min(itemCount - 1, currentIndex + delta))
          }
          break
      }

      // Handle Home/End keys for all directions
      if (key === 'Home') return 0
      if (key === 'End') return itemCount - 1

      return null
    }

    /**
     * Handle keyboard navigation events within the container
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!container.contains(event.target as HTMLElement)) return

      const items = getFocusableElements(container).filter(item => 'rovingTabindex' in item.dataset)
      const currentIndex = items.indexOf(event.target as HTMLElement)

      if (currentIndex === -1) return

      const newIndex = calculateNewIndex(currentIndex, event.key, items.length)

      if (newIndex !== null) {
        event.preventDefault()

        // Update tabindex attributes for all items
        items.forEach((item, index) => {
          item.tabIndex = index === newIndex ? 0 : -1
        })

        // Move focus to the new element
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

/**
 * Keyboard instruction item configuration
 */
interface KeyboardInstruction {
  /** Key combination or key name (e.g., 'Enter', 'Ctrl+C', 'Arrow Keys') */
  key: string
  /** Human-readable description of what the key does */
  description: string
}

/**
 * Props for the KeyboardInstructions component
 */
interface KeyboardInstructionsProps {
  /** Array of keyboard instructions to display */
  instructions: KeyboardInstruction[]
  /** Whether to show the instructions by default */
  visible?: boolean
  /** Custom title for the instructions panel */
  title?: string
}

/**
 * Component displaying contextual keyboard navigation instructions.
 *
 * Provides an expandable panel showing keyboard shortcuts and navigation
 * patterns for complex interactive components. Includes proper ARIA
 * attributes for screen reader accessibility and semantic markup.
 *
 * The component renders as a collapsible section with a toggle button,
 * making it easy for users to access help when needed without cluttering
 * the interface when not required.
 *
 * @param props - Component configuration
 * @param props.instructions - Array of keyboard shortcuts to document
 * @param props.visible - Whether to show instructions initially
 * @param props.title - Custom title for the instruction panel
 * @returns JSX element with expandable keyboard help
 *
 * @example
 * ```tsx
 * <KeyboardInstructions
 *   title="Tab Navigation Help"
 *   instructions={[
 *     {key: 'Tab', description: 'Move to next tab'},
 *     {key: 'Shift+Tab', description: 'Move to previous tab'},
 *     {key: 'Space/Enter', description: 'Activate selected tab'}
 *   ]}
 * />
 * ```
 */
export function KeyboardInstructions({
  instructions,
  visible = false,
  title = 'Keyboard Navigation',
}: KeyboardInstructionsProps): React.JSX.Element {
  const [isVisible, setIsVisible] = React.useState(visible)

  /**
   * Toggle visibility of keyboard instructions
   */
  const toggleVisibility = (): void => {
    setIsVisible(!isVisible)
  }

  return (
    <div className="keyboard-instructions">
      <button
        type="button"
        onClick={toggleVisibility}
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

/**
 * Props for the AccessibleModal component
 */
export interface AccessibleModalProps {
  /** Whether the modal is currently open and visible */
  isOpen: boolean
  /** Callback function called when modal should be closed */
  onClose: () => void
  /** Modal title for screen readers and visual display */
  title: string
  /** Modal content to be rendered inside the dialog */
  children: React.ReactNode
  /** Whether to restore focus to the triggering element when modal closes */
  restoreFocus?: boolean
  /** Additional CSS classes for custom styling */
  className?: string
}

/**
 * Accessible modal dialog component with comprehensive focus management.
 *
 * Implements WCAG 2.1 AA requirements for modal dialogs including:
 * - Focus trapping within the modal when open
 * - Escape key handling for dismissal
 * - Focus restoration to triggering element
 * - Proper ARIA attributes for screen readers
 * - Click outside to close functionality
 *
 * The modal automatically manages focus transitions, stores the previously
 * focused element, and restores focus when closed. Supports both keyboard
 * and mouse interaction patterns.
 *
 * @param props - Component configuration
 * @param props.isOpen - Controls modal visibility
 * @param props.onClose - Handler for close events
 * @param props.title - Modal title for accessibility
 * @param props.children - Content to display in modal
 * @param props.restoreFocus - Whether to restore focus on close
 * @param props.className - Additional styling classes
 * @returns JSX element with accessible modal or null when closed
 *
 * @example
 * ```tsx
 * function App() {
 *   const [isModalOpen, setIsModalOpen] = useState(false)
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsModalOpen(true)}>
 *         Open Settings
 *       </button>
 *       <AccessibleModal
 *         isOpen={isModalOpen}
 *         onClose={() => setIsModalOpen(false)}
 *         title="Settings"
 *         restoreFocus
 *       >
 *         <p>Modal content here</p>
 *       </AccessibleModal>
 *     </>
 *   )
 * }
 * ```
 */
export const AccessibleModal = React.forwardRef<HTMLDivElement, AccessibleModalProps>(
  ({isOpen, onClose, title, children, restoreFocus = true, className = ''}, ref) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const {storeFocus, restoreFocus: doRestoreFocus} = useFocusManagement()

    /**
     * Handle focus management and keyboard events when modal state changes
     */
    useEffect(() => {
      if (!isOpen || !modalRef.current) return

      // Store current focus before opening modal
      if (restoreFocus) {
        storeFocus()
      }

      // Focus the modal container for screen readers
      modalRef.current.focus()

      /**
       * Handle escape key press to close modal
       */
      const handleEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('keydown', handleEscape)

        // Restore focus to original element when modal closes
        if (restoreFocus) {
          doRestoreFocus()
        }
      }
    }, [isOpen, onClose, restoreFocus, storeFocus, doRestoreFocus])

    /**
     * Handle click on modal overlay to close modal
     */
    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>): void => {
      // Only close if clicking directly on overlay, not modal content
      if (event.target === event.currentTarget) {
        onClose()
      }
    }

    /**
     * Handle click on close button
     */
    const handleCloseClick = (): void => {
      onClose()
    }

    if (!isOpen) return null

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div
          ref={ref || modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          className={`modal ${className}`.trim()}
        >
          <div className="modal__header">
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
            <button type="button" onClick={handleCloseClick} aria-label="Close modal" className="modal__close">
              ×
            </button>
          </div>
          <div className="modal__content">{children}</div>
        </div>
      </div>
    )
  },
)

AccessibleModal.displayName = 'AccessibleModal'
