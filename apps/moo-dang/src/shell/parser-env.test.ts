/* eslint-disable no-template-curly-in-string */
/**
 * Tests for shell parser environment variable expansion functionality.
 *
 * Validates variable substitution, quote handling, and edge cases
 * in command parsing with environment variable support.
 */

import {beforeEach, describe, expect, it} from 'vitest'

import {expandVariables, parseCommand} from './parser'

describe('Environment Variable Expansion', () => {
  let testEnvironmentVariables: Record<string, string>

  beforeEach(() => {
    testEnvironmentVariables = {
      HOME: '/home/user',
      PATH: '/bin:/usr/bin:/usr/local/bin',
      USER: 'testuser',
      SHELL: '/bin/moo-dang',
      EMPTY_VAR: '',
      SPECIAL_CHARS: 'hello world!@#$%',
    }
  })

  describe('expandVariables function', () => {
    it('should expand simple $VAR syntax', () => {
      expect(expandVariables('$HOME/docs', testEnvironmentVariables)).toBe('/home/user/docs')
      expect(expandVariables('$USER is here', testEnvironmentVariables)).toBe('testuser is here')
    })

    it('should expand $\{VAR} syntax', () => {
      expect(expandVariables('$\{HOME}/documents', testEnvironmentVariables)).toBe('/home/user/documents')
      expect(expandVariables('User: $\{USER}', testEnvironmentVariables)).toBe('User: testuser')
    })

    it('should handle multiple variables', () => {
      expect(expandVariables('$USER lives in $HOME', testEnvironmentVariables)).toBe('testuser lives in /home/user')
      expect(expandVariables('${USER} uses ${SHELL}', testEnvironmentVariables)).toBe('testuser uses /bin/moo-dang')
    })

    it('should handle undefined variables', () => {
      expect(expandVariables('$UNDEFINED_VAR/test', testEnvironmentVariables)).toBe('/test')
      expect(expandVariables('${UNDEFINED}/test', testEnvironmentVariables)).toBe('/test')
    })

    it('should handle empty variables', () => {
      expect(expandVariables('$EMPTY_VAR/test', testEnvironmentVariables)).toBe('/test')
      expect(expandVariables('prefix-${EMPTY_VAR}-suffix', testEnvironmentVariables)).toBe('prefix--suffix')
    })

    it('should handle variables with special characters', () => {
      expect(expandVariables('Value: $SPECIAL_CHARS', testEnvironmentVariables)).toBe('Value: hello world!@#$%')
    })

    it('should not expand invalid variable names', () => {
      expect(expandVariables('$123invalid', testEnvironmentVariables)).toBe('$123invalid')
      expect(expandVariables('${123invalid}', testEnvironmentVariables)).toBe('${123invalid}')
    })

    it('should handle variables at word boundaries', () => {
      expect(expandVariables('$HOME_BACKUP', testEnvironmentVariables)).toBe('') // Variable doesn't exist, expands to empty
      expect(expandVariables('$HOME.backup', testEnvironmentVariables)).toBe('/home/user.backup')
      expect(expandVariables('$HOME/', testEnvironmentVariables)).toBe('/home/user/')
    })

    it('should handle consecutive variables', () => {
      expect(expandVariables('$USER$SHELL', testEnvironmentVariables)).toBe('testuser/bin/moo-dang')
      expect(expandVariables('${USER}${SHELL}', testEnvironmentVariables)).toBe('testuser/bin/moo-dang')
    })
  })

  describe('parseCommand with environment variables', () => {
    it('should expand variables in unquoted arguments', () => {
      expect(parseCommand('ls $HOME', testEnvironmentVariables)).toEqual(['ls', '/home/user'])
      expect(parseCommand('cd $HOME/docs', testEnvironmentVariables)).toEqual(['cd', '/home/user/docs'])
    })

    it('should expand variables in double-quoted strings', () => {
      expect(parseCommand('echo "Welcome $USER"', testEnvironmentVariables)).toEqual(['echo', 'Welcome testuser'])
      expect(parseCommand('cat "$HOME/file.txt"', testEnvironmentVariables)).toEqual(['cat', '/home/user/file.txt'])
    })

    it('should not expand variables in single-quoted strings', () => {
      expect(parseCommand("echo '$HOME is not expanded'", testEnvironmentVariables)).toEqual([
        'echo',
        '$HOME is not expanded',
      ])
      expect(parseCommand("ls '$USER/docs'", testEnvironmentVariables)).toEqual(['ls', '$USER/docs'])
    })

    it('should handle mixed quoting styles', () => {
      expect(parseCommand('echo "Hello $USER" and \'$HOME not expanded\'', testEnvironmentVariables)).toEqual([
        'echo',
        'Hello testuser',
        'and',
        '$HOME not expanded',
      ])
    })

    it('should handle complex variable patterns', () => {
      expect(parseCommand('echo ${HOME}/docs $USER.txt', testEnvironmentVariables)).toEqual([
        'echo',
        '/home/user/docs',
        'testuser.txt',
      ])
    })

    it('should handle variables in command names', () => {
      // Note: This is unusual but theoretically possible
      testEnvironmentVariables.CMD = 'echo'
      expect(parseCommand('$CMD hello', testEnvironmentVariables)).toEqual(['echo', 'hello'])
    })

    it('should handle environment assignment syntax', () => {
      expect(parseCommand('PATH=$PATH:/new/bin some_command', testEnvironmentVariables)).toEqual([
        'PATH=/bin:/usr/bin:/usr/local/bin:/new/bin',
        'some_command',
      ])
    })

    it('should preserve original behavior without environment variables', () => {
      expect(parseCommand('echo $HOME')).toEqual(['echo', '$HOME'])
      expect(parseCommand('ls "${USER}"')).toEqual(['ls', '${USER}'])
    })

    it('should handle empty environment variables', () => {
      const emptyEnv: Record<string, string> = {}
      expect(parseCommand('echo $UNDEFINED', emptyEnv)).toEqual(['echo', ''])
      expect(parseCommand('echo "${UNDEFINED}"', emptyEnv)).toEqual(['echo', ''])
    })

    it('should handle special shell characters in variable values', () => {
      const specialEnv = {
        SPACES: 'hello world',
        QUOTES: 'say "hello"',
        BACKSLASH: String.raw`path\to\file`,
      }

      expect(parseCommand('echo $SPACES', specialEnv)).toEqual(['echo', 'hello world'])
      expect(parseCommand('echo "$QUOTES"', specialEnv)).toEqual(['echo', 'say "hello"'])
      expect(parseCommand('echo $BACKSLASH', specialEnv)).toEqual(['echo', String.raw`path\to\file`])
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle malformed variable syntax', () => {
      expect(expandVariables('$', testEnvironmentVariables)).toBe('$')
      expect(expandVariables('${', testEnvironmentVariables)).toBe('${')
      expect(expandVariables('${}', testEnvironmentVariables)).toBe('${}')
    })

    it('should handle nested braces (simplified behavior)', () => {
      // Note: Real shells don't support nested ${} syntax, and our implementation
      // expands variables from inside-out, which is acceptable behavior
      expect(expandVariables('${HOME${USER}}', testEnvironmentVariables)).toBe('${HOMEtestuser}')
    })

    it('should handle long variable names', () => {
      const longVar = 'A'.repeat(100)
      const longEnv = {[longVar]: 'long_value'}
      expect(expandVariables(`$${longVar}`, longEnv)).toBe('long_value')
    })

    it('should handle unicode in variable values', () => {
      const unicodeEnv = {UNICODE: '🚀 Hello 世界'}
      expect(expandVariables('$UNICODE', unicodeEnv)).toBe('🚀 Hello 世界')
    })
  })

  describe('Performance and security considerations', () => {
    it('should handle many variables efficiently', () => {
      const manyVars: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        manyVars[`VAR_${i}`] = `value_${i}`
      }

      const text = Object.keys(manyVars)
        .map(key => `$${key}`)
        .join(' ')

      const result = expandVariables(text, manyVars)
      expect(result).toContain('value_0')
      expect(result).toContain('value_99')
    })

    it('should handle large variable values', () => {
      const largeValue = 'x'.repeat(10000)
      const largeEnv = {LARGE_VAR: largeValue}
      expect(expandVariables('prefix $LARGE_VAR suffix', largeEnv)).toBe(`prefix ${largeValue} suffix`)
    })

    it('should not be vulnerable to injection attacks', () => {
      const maliciousEnv = {
        MALICIOUS: '"; rm -rf / #',
      }
      expect(expandVariables('echo $MALICIOUS', maliciousEnv)).toBe('echo "; rm -rf / #')
    })
  })
})
