import {afterEach, vi} from 'vitest'
import '@testing-library/jest-dom'

// Mock react-native-web
// eslint-disable-next-line @typescript-eslint/no-require-imports
vi.mock('react-native', () => require('react-native-web'))

// Cleanup
afterEach(() => {
  vi.clearAllMocks()
})
