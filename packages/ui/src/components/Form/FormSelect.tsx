import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import * as SelectPrimitive from '@radix-ui/react-select'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
   * Select children (SelectItem components)
   */
  children: React.ReactNode
}

/**
 * Form select component using Radix UI Select primitives
 */
export const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>((props, ref) => {
  const {className, size = 'md', validationState = 'default', placeholder, children, ...rest} = props

  return (
    <FormPrimitive.Control asChild>
      <SelectPrimitive.Root>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cx('form-select', `form-select-${size}`, `form-select-${validationState}`, className)}
          {...rest}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content>
            <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FormPrimitive.Control>
  )
})

FormSelect.displayName = 'FormSelect'

// Export SelectItem for convenience
export const FormSelectItem = React.forwardRef<HTMLDivElement, {value: string; children: React.ReactNode}>(
  (props, ref) => {
    const {children, ...rest} = props

    return (
      <SelectPrimitive.Item ref={ref} {...rest}>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    )
  },
)

FormSelectItem.displayName = 'FormSelectItem'
