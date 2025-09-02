import type {ThemeMode} from '../context/ThemeContext.js'

/**
 * Default storage key for theme persistence
 */
export const DEFAULT_THEME_STORAGE_KEY = 'sparkle-theme'

/**
 * Web-specific theme persistence using localStorage
 */
export const webPersistence = {
  /**
   * Loads theme preference from localStorage
   * @param storageKey - The key to use for localStorage
   * @returns The stored theme mode or null if not found
   */
  load(storageKey: string = DEFAULT_THEME_STORAGE_KEY): ThemeMode | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }

    return null
  },

  /**
   * Saves theme preference to localStorage
   * @param theme - The theme mode to save
   * @param storageKey - The key to use for localStorage
   */
  save(theme: ThemeMode, storageKey: string = DEFAULT_THEME_STORAGE_KEY): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(storageKey, theme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  },

  /**
   * Removes theme preference from localStorage
   * @param storageKey - The key to use for localStorage
   */
  remove(storageKey: string = DEFAULT_THEME_STORAGE_KEY): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to remove theme from localStorage:', error)
    }
  },

  /**
   * Checks if localStorage is available
   * @returns true if localStorage is supported and accessible
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const testKey = '__sparkle_storage_test__'
      window.localStorage.setItem(testKey, 'test')
      window.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  },
}

/**
 * React Native-specific theme persistence using AsyncStorage
 */
export const nativePersistence = {
  /**
   * Loads theme preference from AsyncStorage
   * @param storageKey - The key to use for AsyncStorage
   * @returns Promise resolving to the stored theme mode or null if not found
   */
  async load(storageKey: string = DEFAULT_THEME_STORAGE_KEY): Promise<ThemeMode | null> {
    try {
      // Dynamic import to avoid bundling React Native modules on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const stored = await AsyncStorage.getItem(storageKey)

      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode
      }
    } catch (error) {
      console.warn('Failed to load theme from AsyncStorage:', error)
    }

    return null
  },

  /**
   * Saves theme preference to AsyncStorage
   * @param theme - The theme mode to save
   * @param storageKey - The key to use for AsyncStorage
   */
  async save(theme: ThemeMode, storageKey: string = DEFAULT_THEME_STORAGE_KEY): Promise<void> {
    try {
      // Dynamic import to avoid bundling React Native modules on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.setItem(storageKey, theme)
    } catch (error) {
      console.warn('Failed to save theme to AsyncStorage:', error)
    }
  },

  /**
   * Removes theme preference from AsyncStorage
   * @param storageKey - The key to use for AsyncStorage
   */
  async remove(storageKey: string = DEFAULT_THEME_STORAGE_KEY): Promise<void> {
    try {
      // Dynamic import to avoid bundling React Native modules on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to remove theme from AsyncStorage:', error)
    }
  },

  /**
   * Checks if AsyncStorage is available
   * @returns Promise resolving to true if AsyncStorage is supported and accessible
   */
  async isSupported(): Promise<boolean> {
    try {
      // Dynamic import to avoid bundling React Native modules on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const testKey = '__sparkle_storage_test__'
      await AsyncStorage.setItem(testKey, 'test')
      await AsyncStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  },
}

/**
 * Platform-agnostic theme persistence interface
 * Automatically detects the environment and uses appropriate storage method
 */
export const themePersistence = {
  /**
   * Loads theme preference from appropriate storage
   * @param storageKey - The key to use for storage
   * @returns Theme mode or Promise<ThemeMode> depending on platform
   */
  load(storageKey?: string): ThemeMode | null | Promise<ThemeMode | null> {
    // Web environment
    if (typeof window !== 'undefined') {
      return webPersistence.load(storageKey)
    }

    // React Native environment
    return nativePersistence.load(storageKey)
  },

  /**
   * Saves theme preference to appropriate storage
   * @param theme - The theme mode to save
   * @param storageKey - The key to use for storage
   * @returns void or Promise<void> depending on platform
   */
  save(theme: ThemeMode, storageKey?: string): void | Promise<void> {
    // Web environment
    if (typeof window !== 'undefined') {
      return webPersistence.save(theme, storageKey)
    }

    // React Native environment
    return nativePersistence.save(theme, storageKey)
  },

  /**
   * Removes theme preference from appropriate storage
   * @param storageKey - The key to use for storage
   * @returns void or Promise<void> depending on platform
   */
  remove(storageKey?: string): void | Promise<void> {
    // Web environment
    if (typeof window !== 'undefined') {
      return webPersistence.remove(storageKey)
    }

    // React Native environment
    return nativePersistence.remove(storageKey)
  },

  /**
   * Checks if storage is available
   * @returns boolean or Promise<boolean> depending on platform
   */
  isSupported(): boolean | Promise<boolean> {
    // Web environment
    if (typeof window !== 'undefined') {
      return webPersistence.isSupported()
    }

    // React Native environment
    return nativePersistence.isSupported()
  },
}

/**
 * Utility for migrating theme data between storage keys
 * Useful for updating storage keys while preserving user preferences
 */
export const persistenceMigration = {
  /**
   * Migrates theme preference from old key to new key
   * @param oldKey - The old storage key
   * @param newKey - The new storage key
   * @param removeOld - Whether to remove the old key after migration
   * @returns Promise<boolean> indicating success of migration
   */
  async migrate(oldKey: string, newKey: string, removeOld = true): Promise<boolean> {
    try {
      const oldTheme = await Promise.resolve(themePersistence.load(oldKey))

      if (oldTheme) {
        await Promise.resolve(themePersistence.save(oldTheme, newKey))

        if (removeOld) {
          await Promise.resolve(themePersistence.remove(oldKey))
        }

        return true
      }

      return false
    } catch (error) {
      console.warn('Failed to migrate theme preference:', error)
      return false
    }
  },

  /**
   * Validates that a stored value is a valid theme mode
   * @param value - The value to validate
   * @returns true if the value is a valid ThemeMode
   */
  isValidThemeMode(value: unknown): value is ThemeMode {
    return typeof value === 'string' && ['light', 'dark', 'system'].includes(value)
  },
}
