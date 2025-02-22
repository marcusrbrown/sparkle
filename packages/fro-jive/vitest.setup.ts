import '@testing-library/jest-dom'
import {cleanup} from '@testing-library/react-native'
import {afterEach, vi} from 'vitest'

// Mock React Native
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => (Array.isArray(styles) ? Object.assign({}, ...styles) : styles),
  },
  Text: ({style, children, ...props}: any) => {
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style
    return {
      type: 'span',
      props: {
        style: flatStyle,
        children,
        ...props,
      },
    }
  },
  View: ({style, children, ...props}: any) => {
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style
    return {
      type: 'div',
      props: {
        style: flatStyle,
        children,
        ...props,
      },
    }
  },
}))

// Mock useColorScheme
vi.mock('./components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}))

// Mock Colors
vi.mock('@/constants/Colors', () => ({
  default: {
    light: {
      text: '#000',
      background: '#fff',
    },
    dark: {
      text: '#fff',
      background: '#000',
    },
  },
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
