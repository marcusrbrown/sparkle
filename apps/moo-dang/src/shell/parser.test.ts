/**
 * Tests for shell command parsing functionality.
 *
 * Validates command parsing, argument handling, quote processing,
 * and edge cases for the shell command parser.
 */

/* eslint-disable no-template-curly-in-string */

import {describe, expect, it} from 'vitest'

import {expandVariables, parseCommand, parseCommandPipeline} from './parser.js'

describe('expandVariables', () => {
  describe('basic variable expansion', () => {
    it('should expand simple variables using $VAR syntax', () => {
      expect(expandVariables('$HOME/documents', {HOME: '/home/user'})).toBe('/home/user/documents')
      expect(expandVariables('$PATH:/usr/local/bin', {PATH: '/usr/bin:/bin'})).toBe('/usr/bin:/bin:/usr/local/bin')
    })

    it('should expand variables using ${VAR} syntax', () => {
      expect(expandVariables('${HOME}/documents', {HOME: '/home/user'})).toBe('/home/user/documents')
      expect(expandVariables('prefix${VAR}suffix', {VAR: 'middle'})).toBe('prefixmiddlesuffix')
    })

    it('should handle multiple variables in one string', () => {
      const result = expandVariables('$HOME/bin:$PATH', {
        HOME: '/home/user',
        PATH: '/usr/bin:/bin',
      })
      expect(result).toBe('/home/user/bin:/usr/bin:/bin')
    })

    it('should expand undefined variables to empty strings', () => {
      expect(expandVariables('$UNDEFINED/path', {})).toBe('/path')
      expect(expandVariables('prefix$MISSING', {})).toBe('prefix')
    })

    it('should preserve text without variables', () => {
      expect(expandVariables('plain text without variables', {HOME: '/home/user'})).toBe('plain text without variables')
    })

    it('should be case sensitive for variable names', () => {
      // Variables are case-sensitive in shell environments
      expect(expandVariables('$home/$HOME', {HOME: '/user', home: '/lower'})).toBe('/lower//user')
    })
  })

  describe('complex expansion scenarios', () => {
    it('should handle mixed ${VAR} and $VAR syntax', () => {
      const result = expandVariables('${HOME}/bin:$PATH/local', {
        HOME: '/home/user',
        PATH: '/usr/bin',
      })
      expect(result).toBe('/home/user/bin:/usr/bin/local')
    })

    it('should handle variables at different positions', () => {
      expect(expandVariables('$VAR', {VAR: 'value'})).toBe('value')
      expect(expandVariables('prefix$VAR', {VAR: 'value'})).toBe('prefixvalue')
      expect(expandVariables('$VARsuffix', {VAR: 'value'})).toBe('') // $VARsuffix matches whole variable name (not found)
      expect(expandVariables('prefix$VARsuffix', {VAR: 'value'})).toBe('prefix') // $VARsuffix matches as whole variable
    })

    it('should handle braced variables correctly', () => {
      expect(expandVariables('${VAR}name', {VAR: 'test'})).toBe('testname')
      expect(expandVariables('name${VAR}', {VAR: 'test'})).toBe('nametest')
    })

    it('should handle empty variables', () => {
      expect(expandVariables('prefix$EMPTY', {EMPTY: ''})).toBe('prefix')
      expect(expandVariables('${EMPTY}suffix', {EMPTY: ''})).toBe('suffix')
    })
  })

  describe('edge cases', () => {
    it('should handle variables with underscores and numbers', () => {
      expect(expandVariables('$VAR_1 $VAR2', {VAR_1: 'first', VAR2: 'second'})).toBe('first second')
      expect(expandVariables('${TEST_VAR_123}', {TEST_VAR_123: 'complex'})).toBe('complex')
    })

    it('should handle special characters in variable values', () => {
      expect(expandVariables('$SPECIAL', {SPECIAL: '!@#$%^&*()'})).toBe('!@#$%^&*()')
      expect(expandVariables('${PATH}', {PATH: '/usr/bin:/bin:/usr/local/bin'})).toBe('/usr/bin:/bin:/usr/local/bin')
    })

    it('should handle empty input', () => {
      expect(expandVariables('', {HOME: '/home/user'})).toBe('')
    })

    it('should have correct type signature', () => {
      const result: string = expandVariables('$TEST', {TEST: 'value'})
      expect(typeof result).toBe('string')
    })
  })
})

describe('parseCommand', () => {
  describe('basic command parsing', () => {
    it('should parse simple commands without arguments', () => {
      expect(parseCommand('pwd')).toEqual(['pwd'])
      expect(parseCommand('clear')).toEqual(['clear'])
      expect(parseCommand('help')).toEqual(['help'])
    })

    it('should parse commands with single arguments', () => {
      expect(parseCommand('echo hello')).toEqual(['echo', 'hello'])
      expect(parseCommand('cat file.txt')).toEqual(['cat', 'file.txt'])
      expect(parseCommand('cd /home')).toEqual(['cd', '/home'])
    })

    it('should parse commands with multiple arguments', () => {
      expect(parseCommand('echo hello world')).toEqual(['echo', 'hello', 'world'])
      expect(parseCommand('ls -la /home')).toEqual(['ls', '-la', '/home'])
      expect(parseCommand('cat file1.txt file2.txt file3.txt')).toEqual(['cat', 'file1.txt', 'file2.txt', 'file3.txt'])
    })
  })

  describe('whitespace handling', () => {
    it('should handle leading and trailing spaces in commands', () => {
      expect(parseCommand('  echo hello')).toEqual(['echo', 'hello'])
      expect(parseCommand('echo hello  ')).toEqual(['echo', 'hello'])
    })

    it('should handle multiple spaces between arguments', () => {
      expect(parseCommand('echo  hello   world')).toEqual(['echo', 'hello', 'world'])
      expect(parseCommand('ls   -la    /home')).toEqual(['ls', '-la', '/home'])
    })

    it('should handle empty commands', () => {
      expect(parseCommand('')).toEqual([])
      expect(parseCommand('   ')).toEqual([])
    })

    it('should preserve tabs as literal characters when not used as separators', () => {
      // The current parser treats tabs as literal characters, not whitespace
      expect(parseCommand('\t\tpwd')).toEqual(['\t\tpwd'])
      expect(parseCommand('pwd\t\t')).toEqual(['pwd\t\t'])
      expect(parseCommand('\t\t\t')).toEqual(['\t\t\t'])
    })
  })

  describe('quote handling', () => {
    it('should handle double quotes with spaces', () => {
      expect(parseCommand('echo "hello world"')).toEqual(['echo', 'hello world'])
      expect(parseCommand('cat "file with spaces.txt"')).toEqual(['cat', 'file with spaces.txt'])
    })

    it('should handle single quotes with spaces', () => {
      expect(parseCommand("echo 'hello world'")).toEqual(['echo', 'hello world'])
      expect(parseCommand("cat 'file with spaces.txt'")).toEqual(['cat', 'file with spaces.txt'])
    })

    it('should handle mixed quotes', () => {
      expect(parseCommand('echo "hello" world \'test\'')).toEqual(['echo', 'hello', 'world', 'test'])
      expect(parseCommand('echo \'first arg\' "second arg" third')).toEqual([
        'echo',
        'first arg',
        'second arg',
        'third',
      ])
    })

    it('should handle nested quotes', () => {
      expect(parseCommand('echo "He said \'hello\'"')).toEqual(['echo', "He said 'hello'"])
      expect(parseCommand('echo \'She said "goodbye"\'')).toEqual(['echo', 'She said "goodbye"'])
    })

    it('should handle empty quotes', () => {
      // The current parser implementation doesn't add empty strings for empty quotes
      expect(parseCommand('echo ""')).toEqual(['echo'])
      expect(parseCommand("echo ''")).toEqual(['echo'])
      expect(parseCommand('echo "" world')).toEqual(['echo', 'world'])
    })
  })

  describe('special characters', () => {
    it('should handle special characters in quotes', () => {
      expect(parseCommand('echo "!@#$%^&*()"')).toEqual(['echo', '!@#$%^&*()'])
      expect(parseCommand("echo 'path/to/file.txt'")).toEqual(['echo', 'path/to/file.txt'])
    })

    it('should handle equals signs and assignments', () => {
      expect(parseCommand('echo var=value')).toEqual(['echo', 'var=value'])
      expect(parseCommand('echo "PATH=/usr/bin:/bin"')).toEqual(['echo', 'PATH=/usr/bin:/bin'])
    })

    it('should handle dashes and flags', () => {
      expect(parseCommand('ls -la --all')).toEqual(['ls', '-la', '--all'])
      expect(parseCommand('grep -r --exclude-dir=node_modules')).toEqual(['grep', '-r', '--exclude-dir=node_modules'])
    })
  })

  describe('edge cases', () => {
    it('should handle commands with only spaces and quotes', () => {
      expect(parseCommand('"   "')).toEqual(['   '])
      expect(parseCommand(String.raw`'\t\n'`)).toEqual([String.raw`\t\n`])
    })

    it('should handle unclosed quotes gracefully', () => {
      // The current parser implementation removes quote characters when they start quoting
      expect(parseCommand('echo "unclosed')).toEqual(['echo', 'unclosed'])
      expect(parseCommand("echo 'unclosed")).toEqual(['echo', 'unclosed'])
    })

    it('should handle complex file paths', () => {
      expect(parseCommand('cat "/path/with spaces/file.txt"')).toEqual(['cat', '/path/with spaces/file.txt'])
      expect(parseCommand("cd '/home/user/My Documents'")).toEqual(['cd', '/home/user/My Documents'])
    })

    it('should handle commands with unicode characters', () => {
      expect(parseCommand('echo "🚀 Hello World 🌟"')).toEqual(['echo', '🚀 Hello World 🌟'])
      expect(parseCommand('cat "文件.txt"')).toEqual(['cat', '文件.txt'])
    })
  })

  describe('real-world command examples', () => {
    it('should parse common git commands', () => {
      expect(parseCommand('git commit -m "Initial commit"')).toEqual(['git', 'commit', '-m', 'Initial commit'])
      expect(parseCommand('git log --oneline --graph')).toEqual(['git', 'log', '--oneline', '--graph'])
    })

    it('should parse find commands with complex arguments', () => {
      expect(parseCommand('find /path -name "*.js" -type f')).toEqual(['find', '/path', '-name', '*.js', '-type', 'f'])
      expect(parseCommand("find . -path './node_modules' -prune")).toEqual([
        'find',
        '.',
        '-path',
        './node_modules',
        '-prune',
      ])
    })

    it('should parse commands with environment variables', () => {
      expect(parseCommand('NODE_ENV=production npm start')).toEqual(['NODE_ENV=production', 'npm', 'start'])
      expect(parseCommand('PATH="/usr/local/bin:$PATH" which node')).toEqual([
        'PATH=/usr/local/bin:$PATH',
        'which',
        'node',
      ])
    })
  })
})

describe('parseCommandPipeline', () => {
  describe('single command pipelines', () => {
    it('should parse single commands without pipes', () => {
      const result = parseCommandPipeline('echo hello')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should parse single commands with multiple arguments', () => {
      const result = parseCommandPipeline('ls -la /home')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'ls',
          args: ['-la', '/home'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should parse single commands with quoted arguments', () => {
      const result = parseCommandPipeline('echo "hello world"')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello world'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })
  })

  describe('piped command pipelines', () => {
    it('should parse simple two-command pipelines', () => {
      const result = parseCommandPipeline('ls -la | grep test')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'ls',
          args: ['-la'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['test'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should parse multiple command pipelines', () => {
      const result = parseCommandPipeline('cat file.txt | grep pattern | wc -l')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'cat',
          args: ['file.txt'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['pattern'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'wc',
          args: ['-l'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should handle whitespace around pipe separators', () => {
      const result = parseCommandPipeline('echo hello|grep h')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['h'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])

      const resultWithSpaces = parseCommandPipeline('echo hello | grep h | wc -l')
      expect(resultWithSpaces.background).toBe(false)
      expect(resultWithSpaces.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['h'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'wc',
          args: ['-l'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })
  })

  describe('commands with I/O redirection', () => {
    it('should parse commands with output redirection', () => {
      const result = parseCommandPipeline('echo hello > output.txt')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [
            {
              operator: '>',
              target: 'output.txt',
            },
          ],
        },
      ])
    })

    it('should parse commands with input redirection', () => {
      const result = parseCommandPipeline('sort < input.txt')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'sort',
          args: [],
          inputRedirections: [
            {
              operator: '<',
              target: 'input.txt',
            },
          ],
          outputRedirections: [],
        },
      ])
    })

    it('should parse commands with error redirection', () => {
      const result = parseCommandPipeline('make 2> errors.log')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'make',
          args: [],
          inputRedirections: [],
          outputRedirections: [
            {
              operator: '2>',
              target: 'errors.log',
            },
          ],
        },
      ])
    })

    it('should parse commands with append redirection', () => {
      const result = parseCommandPipeline('echo line >> file.log')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['line'],
          inputRedirections: [],
          outputRedirections: [
            {
              operator: '>>',
              target: 'file.log',
            },
          ],
        },
      ])
    })

    it('should parse commands with multiple redirections', () => {
      const result = parseCommandPipeline('command < input.txt > output.txt 2> error.log')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'command',
          args: [],
          inputRedirections: [
            {
              operator: '<',
              target: 'input.txt',
            },
          ],
          outputRedirections: [
            {
              operator: '2>',
              target: 'error.log',
            },
            {
              operator: '>',
              target: 'output.txt',
            },
          ],
        },
      ])
    })
  })

  describe('complex pipeline combinations', () => {
    it('should parse pipelines with redirection', () => {
      const result = parseCommandPipeline('cat input.txt | grep pattern > results.txt')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'cat',
          args: ['input.txt'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['pattern'],
          inputRedirections: [],
          outputRedirections: [
            {
              operator: '>',
              target: 'results.txt',
            },
          ],
        },
      ])
    })

    it('should parse complex real-world pipelines', () => {
      const result = parseCommandPipeline('ps aux | grep node | grep -v grep | awk "{print $2}" | head -5')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'ps',
          args: ['aux'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['node'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['-v', 'grep'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'awk',
          args: ['{print $2}'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'head',
          args: ['-5'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should parse pipelines with quoted strings containing spaces', () => {
      const result = parseCommandPipeline('echo "hello world" | grep "hello"')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello world'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })
  })

  describe('edge cases and error conditions', () => {
    it('should handle empty input', () => {
      const result = parseCommandPipeline('')
      expect(result).toEqual({
        background: false,
        commands: [],
      })
    })

    it('should handle whitespace-only input', () => {
      const result = parseCommandPipeline('   ')
      expect(result).toEqual({
        background: false,
        commands: [],
      })
    })

    it('should handle trailing pipes gracefully', () => {
      const result = parseCommandPipeline('echo hello |')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should handle leading pipes gracefully', () => {
      const result = parseCommandPipeline('| grep pattern')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'grep',
          args: ['pattern'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should handle multiple consecutive pipes', () => {
      const result = parseCommandPipeline('echo hello || grep h')
      expect(result.background).toBe(false)
      expect(result.commands).toEqual([
        {
          command: 'echo',
          args: ['hello'],
          inputRedirections: [],
          outputRedirections: [],
        },
        {
          command: 'grep',
          args: ['h'],
          inputRedirections: [],
          outputRedirections: [],
        },
      ])
    })

    it('should have correct type signature for return value', () => {
      const result = parseCommandPipeline('echo test')
      expect(typeof result).toBe('object')
      expect(result).toHaveProperty('commands')
      expect(result).toHaveProperty('background')
      expect(Array.isArray(result.commands)).toBe(true)
      expect(typeof result.background).toBe('boolean')
      if (result.commands.length > 0) {
        const firstCommand = result.commands[0]
        if (firstCommand) {
          expect(typeof firstCommand.command).toBe('string')
          expect(Array.isArray(firstCommand.args)).toBe(true)
        }
      }
    })
  })
})
