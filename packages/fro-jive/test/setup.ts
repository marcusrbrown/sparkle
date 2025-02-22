import '@testing-library/jest-dom'
import {vi} from 'vitest'
import {afterEach} from 'vitest'

// Mock react-native-web
vi.mock('react-native', () => require('react-native-web'))

// Cleanup
afterEach(() => {
  vi.clearAllMocks()
})
