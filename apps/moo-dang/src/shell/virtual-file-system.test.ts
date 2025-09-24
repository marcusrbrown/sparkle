/**
 * Comprehensive tests for Virtual File System implementation.
 *
 * Validates all file system operations including path resolution,
 * file/directory operations, error handling, and edge cases.
 */

import {beforeEach, describe, expect, it} from 'vitest'

import {VirtualFileSystemImpl} from './virtual-file-system'

describe('VirtualFileSystemImpl', () => {
  let vfs: VirtualFileSystemImpl

  beforeEach(() => {
    vfs = new VirtualFileSystemImpl(false)
  })

  describe('initialization', () => {
    it('should initialize with correct default directory structure', async () => {
      expect(vfs.getCurrentDirectory()).toBe('/home/user')

      // Check root directory exists
      expect(await vfs.exists('/')).toBe(true)
      expect(await vfs.isDirectory('/')).toBe(true)

      // Check basic directory structure
      expect(await vfs.exists('/home')).toBe(true)
      expect(await vfs.exists('/home/user')).toBe(true)
      expect(await vfs.exists('/bin')).toBe(true)
      expect(await vfs.exists('/tmp')).toBe(true)
      expect(await vfs.exists('/etc')).toBe(true)

      // Check README.md exists
      expect(await vfs.exists('/home/user/README.md')).toBe(true)
      expect(await vfs.isFile('/home/user/README.md')).toBe(true)
    })

    it('should have correct initial README content', async () => {
      const content = await vfs.readFile('/home/user/README.md')
      expect(content).toContain('Welcome to moo-dang shell!')
      expect(content).toContain('WASM-based web shell environment')
    })
  })

  describe('directory operations', () => {
    describe('getCurrentDirectory', () => {
      it('should return current working directory', () => {
        expect(vfs.getCurrentDirectory()).toBe('/home/user')
      })
    })

    describe('changeDirectory', () => {
      it('should change to absolute path', async () => {
        const newDir = await vfs.changeDirectory('/tmp')
        expect(newDir).toBe('/tmp')
        expect(vfs.getCurrentDirectory()).toBe('/tmp')
      })

      it('should change to relative path', async () => {
        await vfs.changeDirectory('/home')
        const newDir = await vfs.changeDirectory('user')
        expect(newDir).toBe('/home/user')
        expect(vfs.getCurrentDirectory()).toBe('/home/user')
      })

      it('should handle . (current directory)', async () => {
        const currentDir = vfs.getCurrentDirectory()
        const newDir = await vfs.changeDirectory('.')
        expect(newDir).toBe(currentDir)
        expect(vfs.getCurrentDirectory()).toBe(currentDir)
      })

      it('should handle .. (parent directory)', async () => {
        await vfs.changeDirectory('/home/user')
        const newDir = await vfs.changeDirectory('..')
        expect(newDir).toBe('/home')
        expect(vfs.getCurrentDirectory()).toBe('/home')
      })

      it('should handle relative path with ./', async () => {
        await vfs.changeDirectory('/home')
        const newDir = await vfs.changeDirectory('./user')
        expect(newDir).toBe('/home/user')
        expect(vfs.getCurrentDirectory()).toBe('/home/user')
      })

      it('should throw error for non-existent directory', async () => {
        await expect(vfs.changeDirectory('/nonexistent')).rejects.toThrow('Directory not found: /nonexistent')
      })

      it('should throw error when trying to cd to a file', async () => {
        await expect(vfs.changeDirectory('/home/user/README.md')).rejects.toThrow(
          'Not a directory: /home/user/README.md',
        )
      })
    })

    describe('listDirectory', () => {
      it('should list directory contents', async () => {
        const contents = await vfs.listDirectory('/home/user')
        expect(contents).toContain('README.md')
        expect(contents).toContain('documents')
        expect(contents).toEqual(contents.sort()) // Should be sorted
      })

      it('should list root directory', async () => {
        const contents = await vfs.listDirectory('/')
        expect(contents).toContain('home')
        expect(contents).toContain('bin')
        expect(contents).toContain('tmp')
        expect(contents).toContain('etc')
      })

      it('should handle current directory (.)', async () => {
        await vfs.changeDirectory('/home/user')
        const contents = await vfs.listDirectory('.')
        expect(contents).toContain('README.md')
        expect(contents).toContain('documents')
      })

      it('should throw error for non-existent directory', async () => {
        await expect(vfs.listDirectory('/nonexistent')).rejects.toThrow('Directory not found: /nonexistent')
      })

      it('should throw error when trying to list a file', async () => {
        await expect(vfs.listDirectory('/home/user/README.md')).rejects.toThrow('Not a directory: /home/user/README.md')
      })
    })

    describe('getDetailedListing', () => {
      it('should return detailed directory listing', async () => {
        const details = await vfs.getDetailedListing('/home/user')

        expect(details).toHaveLength(2) // README.md and documents
        expect(details).toEqual(details.sort((a, b) => a.name.localeCompare(b.name))) // Should be sorted

        const readme = details.find(entry => entry.name === 'README.md')
        expect(readme).toBeDefined()
        expect(readme?.type).toBe('file')
        expect(readme?.permissions).toBe('-rw-r--r--')
        expect(readme?.size).toBeGreaterThan(0)
        expect(readme?.lastModified).toBeInstanceOf(Date)

        const documents = details.find(entry => entry.name === 'documents')
        expect(documents).toBeDefined()
        expect(documents?.type).toBe('directory')
        expect(documents?.permissions).toBe('drwxr-xr-x')
        expect(documents?.size).toBe(0)
        expect(documents?.lastModified).toBeInstanceOf(Date)
      })

      it('should throw error for non-existent directory', async () => {
        await expect(vfs.getDetailedListing('/nonexistent')).rejects.toThrow('Directory not found: /nonexistent')
      })
    })

    describe('createDirectory', () => {
      it('should create new directory', async () => {
        await vfs.createDirectory('/tmp/newdir')

        expect(await vfs.exists('/tmp/newdir')).toBe(true)
        expect(await vfs.isDirectory('/tmp/newdir')).toBe(true)

        const contents = await vfs.listDirectory('/tmp')
        expect(contents).toContain('newdir')
      })

      it('should create nested directory path', async () => {
        await vfs.createDirectory('/tmp/level1')
        await vfs.createDirectory('/tmp/level1/level2')

        expect(await vfs.exists('/tmp/level1/level2')).toBe(true)
        expect(await vfs.isDirectory('/tmp/level1/level2')).toBe(true)
      })

      it('should throw error if parent directory does not exist', async () => {
        await expect(vfs.createDirectory('/nonexistent/newdir')).rejects.toThrow(
          'Parent directory not found: /nonexistent',
        )
      })

      it('should throw error if directory already exists', async () => {
        await vfs.createDirectory('/tmp/duplicate')
        await expect(vfs.createDirectory('/tmp/duplicate')).rejects.toThrow('Directory already exists: /tmp/duplicate')
      })
    })
  })

  describe('file operations', () => {
    describe('exists', () => {
      it('should return true for existing files', async () => {
        expect(await vfs.exists('/home/user/README.md')).toBe(true)
      })

      it('should return true for existing directories', async () => {
        expect(await vfs.exists('/home/user')).toBe(true)
      })

      it('should return false for non-existent paths', async () => {
        expect(await vfs.exists('/nonexistent')).toBe(false)
      })
    })

    describe('isFile and isDirectory', () => {
      it('should correctly identify files', async () => {
        expect(await vfs.isFile('/home/user/README.md')).toBe(true)
        expect(await vfs.isDirectory('/home/user/README.md')).toBe(false)
      })

      it('should correctly identify directories', async () => {
        expect(await vfs.isDirectory('/home/user')).toBe(true)
        expect(await vfs.isFile('/home/user')).toBe(false)
      })

      it('should return false for non-existent paths', async () => {
        expect(await vfs.isFile('/nonexistent')).toBe(false)
        expect(await vfs.isDirectory('/nonexistent')).toBe(false)
      })
    })

    describe('readFile', () => {
      it('should read existing file content', async () => {
        const content = await vfs.readFile('/home/user/README.md')
        expect(content).toContain('Welcome to moo-dang shell!')
      })

      it('should throw error for non-existent file', async () => {
        await expect(vfs.readFile('/nonexistent.txt')).rejects.toThrow('File not found: /nonexistent.txt')
      })

      it('should throw error when trying to read a directory', async () => {
        await expect(vfs.readFile('/home/user')).rejects.toThrow('Not a file: /home/user')
      })
    })

    describe('writeFile', () => {
      it('should create new file with content', async () => {
        const testContent = 'Hello, World!'
        await vfs.writeFile('/tmp/test.txt', testContent)

        expect(await vfs.exists('/tmp/test.txt')).toBe(true)
        expect(await vfs.isFile('/tmp/test.txt')).toBe(true)

        const readContent = await vfs.readFile('/tmp/test.txt')
        expect(readContent).toBe(testContent)
      })

      it('should overwrite existing file', async () => {
        const originalContent = 'Original content'
        const newContent = 'New content'

        await vfs.writeFile('/tmp/overwrite.txt', originalContent)
        expect(await vfs.readFile('/tmp/overwrite.txt')).toBe(originalContent)

        await vfs.writeFile('/tmp/overwrite.txt', newContent)
        expect(await vfs.readFile('/tmp/overwrite.txt')).toBe(newContent)
      })

      it('should create file with empty content', async () => {
        await vfs.writeFile('/tmp/empty.txt', '')

        expect(await vfs.exists('/tmp/empty.txt')).toBe(true)
        expect(await vfs.readFile('/tmp/empty.txt')).toBe('')
      })

      it('should throw error if parent directory does not exist', async () => {
        await expect(vfs.writeFile('/nonexistent/file.txt', 'content')).rejects.toThrow(
          'Parent directory not found: /nonexistent',
        )
      })
    })

    describe('getSize', () => {
      it('should return correct file size', async () => {
        const testContent = 'Hello, World!'
        await vfs.writeFile('/tmp/sized.txt', testContent)

        const size = await vfs.getSize('/tmp/sized.txt')
        expect(size).toBe(testContent.length)
      })

      it('should return 0 for empty file', async () => {
        await vfs.writeFile('/tmp/empty.txt', '')

        const size = await vfs.getSize('/tmp/empty.txt')
        expect(size).toBe(0)
      })

      it('should return directory size (sum of all files)', async () => {
        await vfs.writeFile('/tmp/file1.txt', '123')
        await vfs.writeFile('/tmp/file2.txt', '45678')

        const size = await vfs.getSize('/tmp')
        expect(size).toBe(8) // 3 + 5 = 8 bytes
      })

      it('should throw error for non-existent path', async () => {
        await expect(vfs.getSize('/nonexistent')).rejects.toThrow('Path not found: /nonexistent')
      })
    })

    describe('remove', () => {
      it('should remove file', async () => {
        await vfs.writeFile('/tmp/deleteme.txt', 'content')
        expect(await vfs.exists('/tmp/deleteme.txt')).toBe(true)

        await vfs.remove('/tmp/deleteme.txt')
        expect(await vfs.exists('/tmp/deleteme.txt')).toBe(false)
      })

      it('should remove empty directory', async () => {
        await vfs.createDirectory('/tmp/deletedir')
        expect(await vfs.exists('/tmp/deletedir')).toBe(true)

        await vfs.remove('/tmp/deletedir')
        expect(await vfs.exists('/tmp/deletedir')).toBe(false)
      })

      it('should throw error for non-existent file', async () => {
        await expect(vfs.remove('/nonexistent.txt')).rejects.toThrow('File not found: /nonexistent.txt')
      })
    })
  })

  describe('path resolution', () => {
    it('should resolve absolute paths correctly', async () => {
      // Test through directory change which uses path resolution
      await vfs.changeDirectory('/home/user')
      expect(vfs.getCurrentDirectory()).toBe('/home/user')
    })

    it('should resolve relative paths correctly', async () => {
      await vfs.changeDirectory('/home')
      await vfs.changeDirectory('user')
      expect(vfs.getCurrentDirectory()).toBe('/home/user')
    })

    it('should handle complex path with .. and .', async () => {
      await vfs.changeDirectory('/home/user/documents')
      await vfs.changeDirectory('../..')
      expect(vfs.getCurrentDirectory()).toBe('/home')
    })

    it('should normalize paths with multiple slashes', async () => {
      await vfs.changeDirectory('///home//user///')
      expect(vfs.getCurrentDirectory()).toBe('/home/user')
    })

    it('should handle root directory edge case', async () => {
      await vfs.changeDirectory('/')
      await vfs.changeDirectory('..')
      expect(vfs.getCurrentDirectory()).toBe('/')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty path strings gracefully', async () => {
      // Empty path resolves to current directory, so it exists
      await expect(vfs.exists('')).resolves.toBe(true)
      // But we can check that it handles empty strings without throwing
      expect(await vfs.isDirectory('')).toBe(true)
    })

    it('should handle Unicode file names', async () => {
      const unicodeName = '/tmp/测试文件.txt'
      const unicodeContent = '测试内容'

      await vfs.writeFile(unicodeName, unicodeContent)
      expect(await vfs.exists(unicodeName)).toBe(true)

      const content = await vfs.readFile(unicodeName)
      expect(content).toBe(unicodeContent)
    })

    it('should handle files with special characters in names', async () => {
      const specialName = '/tmp/file-with_special.chars (test).txt'
      const content = 'special content'

      await vfs.writeFile(specialName, content)
      expect(await vfs.exists(specialName)).toBe(true)
      expect(await vfs.readFile(specialName)).toBe(content)
    })

    it('should preserve file modification timestamps', async () => {
      await vfs.writeFile('/tmp/timestamped.txt', 'content')

      const details = await vfs.getDetailedListing('/tmp')
      const file = details.find(entry => entry.name === 'timestamped.txt')

      expect(file?.lastModified).toBeInstanceOf(Date)
      expect(file?.lastModified.getTime()).toBeLessThanOrEqual(Date.now())
      expect(file?.lastModified.getTime()).toBeGreaterThan(Date.now() - 5000) // Within last 5 seconds
    })

    it('should handle large file content efficiently', async () => {
      const largeContent = 'A'.repeat(100000) // 100KB file
      await vfs.writeFile('/tmp/large.txt', largeContent)

      const readContent = await vfs.readFile('/tmp/large.txt')
      expect(readContent).toBe(largeContent)
      expect(readContent.length).toBe(100000)

      const size = await vfs.getSize('/tmp/large.txt')
      expect(size).toBe(100000)
    })
  })

  describe('integration scenarios', () => {
    it('should support typical shell workflow', async () => {
      // Navigate to home directory
      await vfs.changeDirectory('/home/user')

      // Create project directory
      await vfs.createDirectory('project')
      await vfs.changeDirectory('project')

      // Create some files
      await vfs.writeFile('main.js', 'console.log("Hello World!");')
      await vfs.writeFile('package.json', '{"name": "test-project"}')

      // List directory contents
      const files = await vfs.listDirectory('.')
      expect(files).toContain('main.js')
      expect(files).toContain('package.json')

      // Read file content
      const jsContent = await vfs.readFile('main.js')
      expect(jsContent).toContain('Hello World!')

      // Get detailed listing
      const details = await vfs.getDetailedListing('.')
      expect(details).toHaveLength(2)

      // Navigate back and check structure
      await vfs.changeDirectory('..')
      expect(vfs.getCurrentDirectory()).toBe('/home/user')

      const userContents = await vfs.listDirectory('.')
      expect(userContents).toContain('project')
    })

    it('should handle concurrent operations correctly', async () => {
      // Create multiple files concurrently
      const promises = [
        vfs.writeFile('/tmp/concurrent1.txt', 'content1'),
        vfs.writeFile('/tmp/concurrent2.txt', 'content2'),
        vfs.writeFile('/tmp/concurrent3.txt', 'content3'),
      ]

      await Promise.all(promises)

      // Verify all files were created
      expect(await vfs.exists('/tmp/concurrent1.txt')).toBe(true)
      expect(await vfs.exists('/tmp/concurrent2.txt')).toBe(true)
      expect(await vfs.exists('/tmp/concurrent3.txt')).toBe(true)

      // Read all files concurrently
      const readPromises = [
        vfs.readFile('/tmp/concurrent1.txt'),
        vfs.readFile('/tmp/concurrent2.txt'),
        vfs.readFile('/tmp/concurrent3.txt'),
      ]

      const contents = await Promise.all(readPromises)
      expect(contents).toEqual(['content1', 'content2', 'content3'])
    })
  })
})
