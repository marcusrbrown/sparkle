import type {HTMLProperties} from '../../types'
import React from 'react'
import {cx} from '../../utils'

export interface ButtonProps extends HTMLProperties<HTMLButtonElement> {
  /**
   * The variant style of the button
   */
  variant?: 'primary' | 'secondary' | 'outline'
  /**
   * The size of the button
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Button component with multiple variants and sizes
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {variant = 'primary', size = 'md', className, children, ...rest} = props
  return (
    <button ref={ref} className={cx('btn', `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {children}
    </button>
  )
})

// Re-export needed utilities
