import {createComponent, cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
export const Button = createComponent<ButtonProps, 'button'>(props => {
  const {variant = 'primary', size = 'md', className, children, ...rest} = props
  return (
    <button className={cx('btn', `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {children}
    </button>
  )
}, 'button')

// Re-export needed utilities
