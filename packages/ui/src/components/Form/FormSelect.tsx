import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import * as SelectPrimitive from '@radix-ui/react-select'
import React from 'react'
import {cx} from '../../utils'

export interface FormSelectProps extends HTMLProperties<HTMLElement> {
  /**
   * Size variant for the select
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string
  /**
   * Whether the select is disabled
   */
  disabled?: boolean
  /**
   * Whether the select is required
   */
  required?: boolean
  /**
   * Select value
   */
  value?: string
  /**
   * Select change handler
   */
  onValueChange?: (value: string) => void
  /**
   * Select children (SelectItem components)
   */
  children: React.ReactNode
}

/**
 * Form select component with theme-aware styling using Radix UI Select primitives
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports validation states with semantic colors.
 */
export const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>((props, ref) => {
  const {
    className,
    size = 'md',
    validationState = 'default',
    placeholder,
    disabled = false,
    required = false,
    value,
    onValueChange,
    children,
    ...rest
  } = props

  // Base theme-aware classes for select trigger
  const baseClasses = [
    // Layout and appearance
    'w-full',
    'flex',
    'items-center',
    'justify-between',
    'rounded-md',
    'border',
    // Typography
    'font-medium',
    'text-left',
    // Transitions and focus
    'theme-transition',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    // Disabled state
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:bg-theme-surface-disabled',
  ]

  // Size-specific classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-4', 'py-3', 'text-base'],
  }

  // Validation state classes
  const getValidationClasses = () => {
    const validationClasses = {
      default: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-border',
        'focus:ring-theme-primary-500',
        'focus:border-theme-primary-500',
      ],
      error: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-error-500',
        'focus:ring-theme-error-500',
        'focus:border-theme-error-500',
      ],
      success: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-success-500',
        'focus:ring-theme-success-500',
        'focus:border-theme-success-500',
      ],
    }

    return validationClasses[validationState] || validationClasses.default
  }

  const triggerClasses = [...baseClasses, ...sizeClasses[size], ...getValidationClasses()]

  return (
    <FormPrimitive.Control asChild>
      <SelectPrimitive.Root disabled={disabled} required={required} value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          ref={ref}
          disabled={disabled}
          aria-invalid={validationState === 'error' ? true : undefined}
          aria-required={required}
          aria-placeholder={placeholder}
          className={cx(...triggerClasses, className)}
          {...rest}
        >
          <SelectPrimitive.Value placeholder={<span className="text-theme-text-secondary">{placeholder}</span>} />
          <SelectPrimitive.Icon aria-hidden="true" className="text-theme-text-secondary">
            ▼
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cx(
              'bg-theme-surface-primary',
              'border',
              'border-theme-border',
              'rounded-md',
              'shadow-lg',
              'z-50',
              'max-h-60',
              'overflow-auto',
              'theme-transition',
            )}
          >
            <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FormPrimitive.Control>
  )
})

FormSelect.displayName = 'FormSelect'

// Export SelectItem with theme-aware styling for convenience
export const FormSelectItem = React.forwardRef<HTMLDivElement, {value: string; children: React.ReactNode}>(
  (props, ref) => {
    const {children, value, ...rest} = props

    return (
      <SelectPrimitive.Item
        ref={ref}
        value={value}
        className={cx(
          'flex',
          'items-center',
          'justify-between',
          'px-3',
          'py-2',
          'text-sm',
          'rounded-sm',
          'cursor-pointer',
          'theme-transition',
          'text-theme-text-primary',
          'hover:bg-theme-surface-secondary',
          'focus:bg-theme-surface-secondary',
          'focus:outline-none',
          'data-[highlighted]:bg-theme-surface-secondary',
        )}
        {...rest}
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className={cx('text-theme-primary-500', 'ml-2', 'font-bold')}>
          ✓
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    )
  },
)

FormSelectItem.displayName = 'FormSelectItem'
