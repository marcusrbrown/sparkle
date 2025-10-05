import type {HTMLProperties} from '../../types'
import React from 'react'
import {cx} from '../../utils'

export interface ButtonProps extends HTMLProperties<HTMLButtonElement> {
  /**
   * The visual style variant of the button
   * @default "primary"
   *
   * - `primary`: High emphasis for main call-to-action
   * - `secondary`: Medium emphasis for supporting actions
   * - `outline`: Low emphasis for alternative choices
   * - `ghost`: Minimal styling for subtle actions
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  /**
   * The size of the button
   * @default "md"
   *
   * - `sm`: Compact size for inline actions or tight spaces
   * - `md`: Standard size for most use cases
   * - `lg`: Large size for hero sections or primary CTAs
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * The semantic color variant for contextual styling
   * @default "default"
   *
   * - `default`: Uses primary theme colors
   * - `success`: Positive actions (confirm, approve, submit)
   * - `warning`: Cautionary actions (archive, proceed with care)
   * - `error`: Destructive actions (delete, remove, cancel)
   */
  semantic?: 'default' | 'success' | 'warning' | 'error'
}

/**
 * Button component with theme-aware styling and semantic color variants
 *
 * @description
 * A versatile button component that provides theme-aware styling, semantic color variants,
 * multiple size options, and comprehensive accessibility features. Fully integrated with
 * the `@sparkle/theme` system for consistent styling across light/dark modes.
 *
 * @features
 * - **Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes
 * - **Semantic Colors**: Support for success, warning, and error variants for contextual actions
 * - **Accessibility**: Full WCAG 2.1 AA compliance with proper focus states and keyboard navigation
 * - **Size Variants**: Small (sm), medium (md), and large (lg) sizes
 * - **Style Variants**: Primary, secondary, outline, and ghost appearances
 * - **Cross-Platform**: Compatible with both web and React Native environments
 *
 * @example Basic usage
 * ```tsx
 * import { Button } from '@sparkle/ui'
 *
 * function Example() {
 *   return (
 *     <Button onClick={() => console.log('Clicked!')}>
 *       Click Me
 *     </Button>
 *   )
 * }
 * ```
 *
 * @example Style variants
 * ```tsx
 * <>
 *   // High emphasis primary button
 *   <Button variant="primary">Save Changes</Button>
 *
 *   // Medium emphasis secondary button
 *   <Button variant="secondary">Cancel</Button>
 *
 *   // Low emphasis outline button
 *   <Button variant="outline">Learn More</Button>
 *
 *   // Minimal ghost button
 *   <Button variant="ghost">Dismiss</Button>
 * </>
 * ```
 *
 * @example Semantic colors for contextual actions
 * ```tsx
 * <>
 *   // Success action (positive outcome)
 *   <Button variant="primary" semantic="success">
 *     Approve Request
 *   </Button>
 *
 *   // Warning action (proceed with caution)
 *   <Button variant="primary" semantic="warning">
 *     Archive Item
 *   </Button>
 *
 *   // Error action (destructive)
 *   <Button variant="primary" semantic="error">
 *     Delete Account
 *   </Button>
 * </>
 * ```
 *
 * @example Size variants
 * ```tsx
 * <>
 *   // Small button for compact UI
 *   <Button size="sm">Small</Button>
 *
 *   // Default medium size
 *   <Button size="md">Medium</Button>
 *
 *   // Large button for hero sections
 *   <Button size="lg">Large CTA</Button>
 * </>
 * ```
 *
 * @example Form submission
 * ```tsx
 * function ContactForm() {
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault()
 *     // Handle form submission
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Button type="submit" variant="primary" size="lg">
 *         Send Message
 *       </Button>
 *     </form>
 *   )
 * }
 * ```
 *
 * @example Loading state
 * ```tsx
 * function SaveButton() {
 *   const [isSaving, setIsSaving] = useState(false)
 *
 *   const handleSave = async () => {
 *     setIsSaving(true)
 *     try {
 *       await saveData()
 *     } finally {
 *       setIsSaving(false)
 *     }
 *   }
 *
 *   return (
 *     <Button onClick={handleSave} disabled={isSaving} semantic="success">
 *       {isSaving ? 'Saving...' : 'Save Changes'}
 *     </Button>
 *   )
 * }
 * ```
 *
 * @example Button with icons
 * ```tsx
 * import { PlusIcon } from '@your-icon-library'
 *
 * <>
 *   // Icon + Text
 *   <Button variant="primary">
 *     <PlusIcon className="w-4 h-4 mr-2" />
 *     Add Item
 *   </Button>
 *
 *   // Icon only (with proper aria-label)
 *   <Button variant="ghost" aria-label="Delete item">
 *     <TrashIcon className="w-5 h-5" />
 *   </Button>
 * </>
 * ```
 *
 * @example Confirmation dialog
 * ```tsx
 * function DeleteConfirmation({ onConfirm, onCancel }) {
 *   return (
 *     <div className="flex gap-2">
 *       <Button variant="outline" onClick={onCancel}>
 *         Cancel
 *       </Button>
 *       <Button variant="primary" semantic="error" onClick={onConfirm}>
 *         Delete
 *       </Button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @accessibility
 * - Keyboard navigation: Enter/Space to activate, Tab to focus
 * - Focus indicators: Visible focus ring for keyboard navigation
 * - Screen readers: Properly announced with role="button"
 * - Disabled state: Not keyboard-navigable when disabled
 * - ARIA support: Use aria-label for icon-only buttons, aria-busy for loading states
 *
 * @theme-tokens
 * - `--theme-primary-*`: Primary button variants
 * - `--theme-success-*`: Success semantic variants
 * - `--theme-warning-*`: Warning semantic variants
 * - `--theme-error-*`: Error semantic variants
 * - `--theme-surface-*`: Secondary and ghost variants
 * - `--theme-border`: Outline variant
 *
 * @best-practices
 * - Use semantic variants for contextual actions (success, warning, error)
 * - Provide descriptive text or aria-label for all buttons
 * - Use appropriate variant hierarchy (primary for main action)
 * - Include loading states for async actions
 * - Disable buttons during processing to prevent double-submission
 *
 * @see {@link https://storybook.sparkle.mrbro.dev/?path=/docs/components-button--docs | Storybook Documentation}
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref): React.JSX.Element => {
  const {variant = 'primary', size = 'md', semantic = 'default', className, children, ...rest} = props

  // Base theme-aware classes for all buttons
  const baseClasses = [
    // Transition and focus states
    'theme-transition',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-theme-primary-500',
    // Typography and layout
    'font-medium',
    'rounded-md',
    'inline-flex',
    'items-center',
    'justify-center',
    // Disabled state
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ]

  // Size-specific classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-6', 'py-3', 'text-base'],
  }

  // Semantic color overrides for non-default variants
  const getSemanticClasses = () => {
    if (semantic === 'default') return []

    const semanticColors = {
      success: {
        primary: ['bg-theme-success-500', 'text-white', 'hover:bg-theme-success-600', 'focus:ring-theme-success-500'],
        secondary: [
          'bg-theme-success-50',
          'text-theme-success-700',
          'hover:bg-theme-success-100',
          'focus:ring-theme-success-500',
        ],
        outline: [
          'border-theme-success-500',
          'text-theme-success-600',
          'hover:bg-theme-success-50',
          'focus:ring-theme-success-500',
        ],
        ghost: ['text-theme-success-600', 'hover:bg-theme-success-50', 'focus:ring-theme-success-500'],
      },
      warning: {
        primary: ['bg-theme-warning-500', 'text-white', 'hover:bg-theme-warning-600', 'focus:ring-theme-warning-500'],
        secondary: [
          'bg-theme-warning-50',
          'text-theme-warning-700',
          'hover:bg-theme-warning-100',
          'focus:ring-theme-warning-500',
        ],
        outline: [
          'border-theme-warning-500',
          'text-theme-warning-600',
          'hover:bg-theme-warning-50',
          'focus:ring-theme-warning-500',
        ],
        ghost: ['text-theme-warning-600', 'hover:bg-theme-warning-50', 'focus:ring-theme-warning-500'],
      },
      error: {
        primary: ['bg-theme-error-500', 'text-white', 'hover:bg-theme-error-600', 'focus:ring-theme-error-500'],
        secondary: [
          'bg-theme-error-50',
          'text-theme-error-700',
          'hover:bg-theme-error-100',
          'focus:ring-theme-error-500',
        ],
        outline: [
          'border-theme-error-500',
          'text-theme-error-600',
          'hover:bg-theme-error-50',
          'focus:ring-theme-error-500',
        ],
        ghost: ['text-theme-error-600', 'hover:bg-theme-error-50', 'focus:ring-theme-error-500'],
      },
    }

    return semanticColors[semantic]?.[variant] || []
  }

  // Default variant classes (when semantic is 'default')
  const getDefaultVariantClasses = () => {
    if (semantic !== 'default') return []

    const variantClasses = {
      primary: ['bg-theme-primary-500', 'text-white', 'hover:bg-theme-primary-600', 'focus:ring-theme-primary-500'],
      secondary: [
        'bg-theme-secondary-100',
        'text-theme-secondary-900',
        'hover:bg-theme-secondary-200',
        'focus:ring-theme-secondary-500',
      ],
      outline: [
        'border',
        'border-theme-primary-500',
        'text-theme-primary-600',
        'hover:bg-theme-primary-50',
        'focus:ring-theme-primary-500',
      ],
      ghost: ['text-theme-primary-600', 'hover:bg-theme-primary-50', 'focus:ring-theme-primary-500'],
    }

    return variantClasses[variant] || []
  }

  const allClasses = [...baseClasses, ...sizeClasses[size], ...getDefaultVariantClasses(), ...getSemanticClasses()]

  return (
    <button ref={ref} className={cx(...allClasses, className)} {...rest}>
      {children}
    </button>
  )
})

// Re-export needed utilities
