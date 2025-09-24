/**
 * Virtual file system implementation for the shell environment.
 *
 * Provides a safe, isolated file system abstraction that simulates
 * basic Unix-like file system operations in the browser environment.
 */

import type {DirectoryEntry, VirtualFileSystem} from './types'

/**
 * File system operation error for path-related failures.
 *
 * Provides structured error information when file system operations fail
 * due to invalid paths, missing files, or permission issues.
 */
export class FileSystemError extends Error {
  readonly operation: string
  readonly path: string
  readonly code?: string

  constructor(operation: string, path: string, message: string, code?: string) {
    super(`${operation} failed for "${path}": ${message}`)
    this.name = 'FileSystemError'
    this.operation = operation
    this.path = path
    this.code = code
  }
}

/**
 * Directory operation error for directory-specific failures.
 *
 * Used when operations specifically require directory context but
 * encounter files or invalid directory states.
 */
export class DirectoryError extends FileSystemError {
  constructor(path: string, message: string) {
    super('Directory operation', path, message, 'DIRECTORY_ERROR')
    this.name = 'DirectoryError'
  }
}

/**
 * File operation error for file-specific failures.
 *
 * Used when operations specifically require file context but
 * encounter directories or missing files.
 */
export class FileError extends FileSystemError {
  constructor(path: string, message: string) {
    super('File operation', path, message, 'FILE_ERROR')
    this.name = 'FileError'
  }
}

/**
 * Virtual file node representing files and directories.
 */
interface VirtualFileNode {
  readonly name: string
  readonly type: 'file' | 'directory'
  readonly content?: string
  readonly children?: Map<string, VirtualFileNode>
  readonly permissions: string
  readonly lastModified: number
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const resolved: string[] = []

  for (const part of parts) {
    if (part === '.') {
      continue
    }
    if (part === '..') {
      resolved.pop()
    } else {
      resolved.push(part)
    }
  }

  return `/${resolved.join('/')}`
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return `/${parts.join('/')}`
}

function getBaseName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.at(-1) || ''
}

/**
 * Create a virtual file system instance with isolated file operations.
 *
 * Returns a function-based implementation that maintains state in closure
 * rather than using class-based architecture. This approach provides better
 * encapsulation and follows functional programming principles.
 *
 * @param enableDebugLogging - Whether to enable debug logging for operations
 * @returns VirtualFileSystem implementation with isolated state
 */
export function createVirtualFileSystem(enableDebugLogging = false): VirtualFileSystem {
  // File system state maintained in closure for proper encapsulation
  let currentDirectory = '/home/user'

  // Helper functions for file system operations
  function createFile(name: string, content: string): VirtualFileNode {
    return {
      name,
      type: 'file',
      content,
      permissions: '-rw-r--r--',
      lastModified: Date.now(),
    }
  }

  function createDirectoryNode(name: string, children: Map<string, VirtualFileNode>): VirtualFileNode {
    return {
      name,
      type: 'directory',
      children,
      permissions: 'drwxr-xr-x',
      lastModified: Date.now(),
    }
  }

  // Initialize the root file system structure during factory execution
  const root: VirtualFileNode = createDirectoryNode(
    '/',
    new Map([
      [
        'home',
        createDirectoryNode(
          'home',
          new Map([
            [
              'user',
              createDirectoryNode(
                'user',
                new Map([
                  [
                    'README.md',
                    createFile(
                      'README.md',
                      'Welcome to moo-dang shell!\n\nThis is a WASM-based web shell environment.',
                    ),
                  ],
                  ['documents', createDirectoryNode('documents', new Map())],
                ]),
              ),
            ],
          ]),
        ),
      ],
      ['bin', createDirectoryNode('bin', new Map())],
      ['tmp', createDirectoryNode('tmp', new Map())],
      ['etc', createDirectoryNode('etc', new Map())],
    ]),
  )

  function logDebug(message: string, data?: Record<string, unknown>): void {
    if (enableDebugLogging) {
      // Dynamic import prevents blocking and provides graceful fallback
      import('consola')
        .then(({consola}) => {
          consola.debug(`[VirtualFileSystem] ${message}`, data || {})
        })
        .catch(() => {
          // Fallback silently if consola import fails in constrained environments
        })
    }
  }

  logDebug('Virtual file system initialized', {
    currentDirectory,
    structure: 'Basic Unix-like structure with /home/user, /bin, /tmp, /etc',
  })

  function resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return normalizePath(path)
    }

    if (path === '.') {
      return currentDirectory
    }

    if (path === '..') {
      const parts = currentDirectory.split('/').filter(Boolean)
      parts.pop()
      return `/${parts.join('/')}`
    }

    if (path.startsWith('./')) {
      path = path.slice(2)
    }

    const fullPath = currentDirectory === '/' ? `/${path}` : `${currentDirectory}/${path}`
    return normalizePath(fullPath)
  }

  function getNode(path: string): VirtualFileNode | undefined {
    if (path === '/') {
      return root
    }

    const parts = path.split('/').filter(Boolean)
    let current = root

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return undefined
      }
      const nextNode = current.children.get(part)
      if (!nextNode) {
        return undefined
      }
      current = nextNode
    }

    return current
  }

  async function calculateDirectorySize(directory: VirtualFileNode): Promise<number> {
    if (directory.type !== 'directory' || !directory.children) {
      return 0
    }

    let totalSize = 0
    for (const child of directory.children.values()) {
      if (child.type === 'file') {
        totalSize += child.content?.length || 0
      } else if (child.type === 'directory') {
        totalSize += await calculateDirectorySize(child)
      }
    }

    return totalSize
  }

  // Return the VirtualFileSystem interface implementation
  return {
    getCurrentDirectory(): string {
      return currentDirectory
    },

    async changeDirectory(path: string): Promise<string> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        throw new DirectoryError(path, 'Directory not found')
      }

      if (node.type !== 'directory') {
        throw new DirectoryError(path, 'Not a directory')
      }

      currentDirectory = resolvedPath
      logDebug('Directory changed', {from: path, to: resolvedPath})

      return currentDirectory
    },

    async listDirectory(path: string): Promise<string[]> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        throw new DirectoryError(path, 'Directory not found')
      }

      if (node.type !== 'directory' || !node.children) {
        throw new DirectoryError(path, 'Not a directory')
      }

      const entries = Array.from(node.children.keys()).sort()
      logDebug('Directory listed', {path: resolvedPath, entries})

      return entries
    },

    async exists(path: string): Promise<boolean> {
      const resolvedPath = resolvePath(path)
      const exists = Boolean(getNode(resolvedPath))

      logDebug('Path existence checked', {path: resolvedPath, exists})
      return exists
    },

    async readFile(path: string): Promise<string> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        throw new FileError(path, 'File not found')
      }

      if (node.type !== 'file') {
        throw new FileError(path, 'Not a file')
      }

      const content = node.content || ''
      logDebug('File read', {path: resolvedPath, size: content.length})

      return content
    },

    async writeFile(path: string, content: string): Promise<void> {
      const resolvedPath = resolvePath(path)
      const parentPath = getParentPath(resolvedPath)
      const fileName = getBaseName(resolvedPath)

      const parentNode = getNode(parentPath)
      if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
        throw new DirectoryError(parentPath, 'Parent directory not found')
      }

      // Create or update file using the helper function
      const fileNode = createFile(fileName, content)
      parentNode.children.set(fileName, fileNode)

      logDebug('File written', {path: resolvedPath, size: content.length})
    },

    async getDetailedListing(path: string): Promise<DirectoryEntry[]> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        throw new DirectoryError(path, 'Directory not found')
      }

      if (node.type !== 'directory' || !node.children) {
        throw new DirectoryError(path, 'Not a directory')
      }

      const details = Array.from(node.children.entries()).map(
        ([name, childNode]): DirectoryEntry => ({
          name,
          type: childNode.type,
          permissions: childNode.permissions,
          size: childNode.type === 'file' ? childNode.content?.length || 0 : 0,
          lastModified: new Date(childNode.lastModified),
        }),
      )

      // Sort by name for consistent ordering
      details.sort((a, b) => a.name.localeCompare(b.name))

      logDebug('Detailed directory listing generated', {path: resolvedPath, entries: details.length})
      return details
    },

    async createDirectory(path: string): Promise<void> {
      const resolvedPath = resolvePath(path)
      const parentPath = getParentPath(resolvedPath)
      const dirName = getBaseName(resolvedPath)

      const parentNode = getNode(parentPath)
      if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
        throw new DirectoryError(parentPath, 'Parent directory not found')
      }

      if (parentNode.children.has(dirName)) {
        throw new DirectoryError(path, 'Directory already exists')
      }

      const dirNode = createDirectoryNode(dirName, new Map())
      parentNode.children.set(dirName, dirNode)

      logDebug('Directory created', {path: resolvedPath})
    },

    async remove(path: string): Promise<void> {
      const resolvedPath = resolvePath(path)
      const parentPath = getParentPath(resolvedPath)
      const fileName = getBaseName(resolvedPath)

      const parentNode = getNode(parentPath)
      if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
        throw new DirectoryError(parentPath, 'Parent directory not found')
      }

      if (!parentNode.children.has(fileName)) {
        throw new FileSystemError('Remove', path, 'File not found')
      }

      parentNode.children.delete(fileName)
      logDebug('File removed', {path: resolvedPath})
    },

    async isDirectory(path: string): Promise<boolean> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        return false
      }

      const isDir = node.type === 'directory'
      logDebug('Directory check performed', {path: resolvedPath, isDirectory: isDir})
      return isDir
    },

    async isFile(path: string): Promise<boolean> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        return false
      }

      const isFileType = node.type === 'file'
      logDebug('File check performed', {path: resolvedPath, isFile: isFileType})
      return isFileType
    },

    async getSize(path: string): Promise<number> {
      const resolvedPath = resolvePath(path)
      const node = getNode(resolvedPath)

      if (!node) {
        throw new FileSystemError('Get size', path, 'Path not found')
      }

      let size = 0
      if (node.type === 'file') {
        size = node.content?.length || 0
      } else if (node.type === 'directory' && node.children) {
        // Calculate total size of all files in directory recursively
        size = await calculateDirectorySize(node)
      }

      logDebug('Size calculated', {path: resolvedPath, size})
      return size
    },
  }
}

/**
 * Legacy class-based implementation for backward compatibility.
 *
 * @deprecated Use createVirtualFileSystem() factory function instead.
 * This class wrapper maintains API compatibility while the core implementation
 * uses function-based architecture for better encapsulation.
 */
export class VirtualFileSystemImpl implements VirtualFileSystem {
  private readonly vfs: VirtualFileSystem

  constructor(enableDebugLogging = false) {
    this.vfs = createVirtualFileSystem(enableDebugLogging)
  }

  getCurrentDirectory(): string {
    return this.vfs.getCurrentDirectory()
  }

  async changeDirectory(path: string): Promise<string> {
    return this.vfs.changeDirectory(path)
  }

  async listDirectory(path: string): Promise<string[]> {
    return this.vfs.listDirectory(path)
  }

  async getDetailedListing(path: string): Promise<DirectoryEntry[]> {
    return this.vfs.getDetailedListing(path)
  }

  async exists(path: string): Promise<boolean> {
    return this.vfs.exists(path)
  }

  async readFile(path: string): Promise<string> {
    return this.vfs.readFile(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    return this.vfs.writeFile(path, content)
  }

  async createDirectory(path: string): Promise<void> {
    return this.vfs.createDirectory(path)
  }

  async remove(path: string): Promise<void> {
    return this.vfs.remove(path)
  }

  async isDirectory(path: string): Promise<boolean> {
    return this.vfs.isDirectory(path)
  }

  async isFile(path: string): Promise<boolean> {
    return this.vfs.isFile(path)
  }

  async getSize(path: string): Promise<number> {
    return this.vfs.getSize(path)
  }
}
