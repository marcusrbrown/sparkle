/**
 * Common type definitions for UI components
 */

export type As<Props = any> = React.ElementType<Props>

export type PropsWithAs<Props extends object, Type extends As = As> = Props & {
  as?: Type
} & Omit<React.ComponentProps<Type>, keyof Props | 'as'>

export type HTMLProperties<T = HTMLElement> = Omit<React.HTMLAttributes<T>, 'as' | 'color' | 'height' | 'width'>
