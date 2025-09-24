/**
 * Tests for shell command parsing functionality.
 *
 * Validates command parsing, argument handling, quote processing,
 * and edge cases for the shell command parser.
 */

import {describe, expect, it} from 'vitest'

/**
 * Parse command string into command and arguments with quote handling.
 *
 * Supports basic shell quoting with single and double quotes to handle arguments
 * containing spaces or special characters.
 */
function parseCommand(command: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  const chars = Array.from(command)

  for (const char of chars) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

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
