/**
 * Virtual file system implementation for the shell environment.
 *
 * Provides a safe, isolated file system abstraction that simulates
 * basic Unix-like file system operations in the browser environment.
 */

import type {DirectoryEntry, VirtualFileSystem} from './types'

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

/**
 * Virtual file system that provides isolated file operations for the shell.
 *
 * Implements a basic Unix-like file system structure with directories,
 * files, and path resolution. All operations are contained within the
 * virtual environment for security isolation.
 */
export class VirtualFileSystemImpl implements VirtualFileSystem {
  private currentDirectory = '/home/user'
  private readonly root: VirtualFileNode
  private readonly enableDebugLogging: boolean

  constructor(enableDebugLogging = false) {
    this.enableDebugLogging = enableDebugLogging

    // Initialize basic file system structure
    this.root = this.createDirectoryNode(
      '/',
      new Map([
        [
          'home',
          this.createDirectoryNode(
            'home',
            new Map([
              [
                'user',
                this.createDirectoryNode(
                  'user',
                  new Map([
                    [
                      'README.md',
                      this.createFile(
                        'README.md',
                        'Welcome to moo-dang shell!\n\nThis is a WASM-based web shell environment.',
                      ),
                    ],
                    ['documents', this.createDirectoryNode('documents', new Map())],
                  ]),
                ),
              ],
            ]),
          ),
        ],
        ['bin', this.createDirectoryNode('bin', new Map())],
        ['tmp', this.createDirectoryNode('tmp', new Map())],
        ['etc', this.createDirectoryNode('etc', new Map())],
      ]),
    )

    this.logDebug('Virtual file system initialized', {
      currentDirectory: this.currentDirectory,
      structure: 'Basic Unix-like structure with /home/user, /bin, /tmp, /etc',
    })
  }

  /**
   * Get current working directory.
   */
  getCurrentDirectory(): string {
    return this.currentDirectory
  }

  /**
   * Change working directory.
   */
  async changeDirectory(path: string): Promise<string> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      throw new Error(`Directory not found: ${path}`)
    }

    if (node.type !== 'directory') {
      throw new Error(`Not a directory: ${path}`)
    }

    this.currentDirectory = resolvedPath
    this.logDebug('Directory changed', {from: path, to: resolvedPath})

    return this.currentDirectory
  }

  /**
   * List directory contents.
   */
  async listDirectory(path: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      throw new Error(`Directory not found: ${path}`)
    }

    if (node.type !== 'directory' || !node.children) {
      throw new Error(`Not a directory: ${path}`)
    }

    const entries = Array.from(node.children.keys()).sort()
    this.logDebug('Directory listed', {path: resolvedPath, entries})

    return entries
  }

  /**
   * Check if path exists.
   */
  async exists(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path)
    const exists = Boolean(this.getNode(resolvedPath))

    this.logDebug('Path existence checked', {path: resolvedPath, exists})
    return exists
  }

  /**
   * Read file contents.
   */
  async readFile(path: string): Promise<string> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      throw new Error(`File not found: ${path}`)
    }

    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`)
    }

    const content = node.content || ''
    this.logDebug('File read', {path: resolvedPath, size: content.length})

    return content
  }

  /**
   * Write file contents.
   */
  async writeFile(path: string, content: string): Promise<void> {
    const resolvedPath = this.resolvePath(path)
    const parentPath = this.getParentPath(resolvedPath)
    const fileName = this.getBaseName(resolvedPath)

    const parentNode = this.getNode(parentPath)
    if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    // Create or update file
    const fileNode = this.createFile(fileName, content)
    parentNode.children.set(fileName, fileNode)

    this.logDebug('File written', {path: resolvedPath, size: content.length})
  }

  /**
   * Get detailed information about directory contents (like ls -l).
   */
  async getDetailedListing(path: string): Promise<DirectoryEntry[]> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      throw new Error(`Directory not found: ${path}`)
    }

    if (node.type !== 'directory' || !node.children) {
      throw new Error(`Not a directory: ${path}`)
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

    // Sort by name
    details.sort((a, b) => a.name.localeCompare(b.name))

    this.logDebug('Detailed directory listing generated', {path: resolvedPath, entries: details.length})
    return details
  }

  /**
   * Create a new directory.
   */
  async createDirectory(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path)
    const parentPath = this.getParentPath(resolvedPath)
    const dirName = this.getBaseName(resolvedPath)

    const parentNode = this.getNode(parentPath)
    if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    if (parentNode.children.has(dirName)) {
      throw new Error(`Directory already exists: ${path}`)
    }

    const dirNode = this.createDirectoryNode(dirName, new Map())
    parentNode.children.set(dirName, dirNode)

    this.logDebug('Directory created', {path: resolvedPath})
  }

  /**
   * Remove a file or directory.
   */
  async remove(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path)
    const parentPath = this.getParentPath(resolvedPath)
    const fileName = this.getBaseName(resolvedPath)

    const parentNode = this.getNode(parentPath)
    if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
      throw new Error(`Parent directory not found: ${parentPath}`)
    }

    if (!parentNode.children.has(fileName)) {
      throw new Error(`File not found: ${path}`)
    }

    parentNode.children.delete(fileName)
    this.logDebug('File removed', {path: resolvedPath})
  }

  /**
   * Create a file node.
   */
  private createFile(name: string, content: string): VirtualFileNode {
    return {
      name,
      type: 'file',
      content,
      permissions: '-rw-r--r--',
      lastModified: Date.now(),
    }
  }

  /**
   * Create a directory node.
   */
  private createDirectoryNode(name: string, children: Map<string, VirtualFileNode>): VirtualFileNode {
    return {
      name,
      type: 'directory',
      children,
      permissions: 'drwxr-xr-x',
      lastModified: Date.now(),
    }
  }

  /**
   * Resolve relative path to absolute path.
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return this.normalizePath(path)
    }

    if (path === '.') {
      return this.currentDirectory
    }

    if (path === '..') {
      const parts = this.currentDirectory.split('/').filter(Boolean)
      parts.pop()
      return `/${parts.join('/')}`
    }

    if (path.startsWith('./')) {
      path = path.slice(2)
    }

    const fullPath = this.currentDirectory === '/' ? `/${path}` : `${this.currentDirectory}/${path}`

    return this.normalizePath(fullPath)
  }

  /**
   * Normalize path by resolving . and .. components.
   */
  private normalizePath(path: string): string {
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

  /**
   * Get file system node at given path.
   */
  private getNode(path: string): VirtualFileNode | undefined {
    if (path === '/') {
      return this.root
    }

    const parts = path.split('/').filter(Boolean)
    let current = this.root

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

  /**
   * Get parent directory path.
   */
  private getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    return `/${parts.join('/')}`
  }

  /**
   * Get base name (file/directory name) from path.
   */
  private getBaseName(path: string): string {
    const parts = path.split('/').filter(Boolean)
    return parts.at(-1) || ''
  }

  /**
   * Check if path is a directory.
   */
  async isDirectory(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      return false
    }

    const isDir = node.type === 'directory'
    this.logDebug('Directory check performed', {path: resolvedPath, isDirectory: isDir})
    return isDir
  }

  /**
   * Check if path is a file.
   */
  async isFile(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      return false
    }

    const isFileType = node.type === 'file'
    this.logDebug('File check performed', {path: resolvedPath, isFile: isFileType})
    return isFileType
  }

  /**
   * Get file or directory size in bytes.
   */
  async getSize(path: string): Promise<number> {
    const resolvedPath = this.resolvePath(path)
    const node = this.getNode(resolvedPath)

    if (!node) {
      throw new Error(`Path not found: ${path}`)
    }

    let size = 0
    if (node.type === 'file') {
      size = node.content?.length || 0
    } else if (node.type === 'directory' && node.children) {
      // Calculate total size of all files in directory (recursive)
      size = await this.calculateDirectorySize(node)
    }

    this.logDebug('Size calculated', {path: resolvedPath, size})
    return size
  }

  /**
   * Calculate total size of directory contents recursively.
   */
  private async calculateDirectorySize(directory: VirtualFileNode): Promise<number> {
    if (directory.type !== 'directory' || !directory.children) {
      return 0
    }

    let totalSize = 0
    for (const child of directory.children.values()) {
      if (child.type === 'file') {
        totalSize += child.content?.length || 0
      } else if (child.type === 'directory') {
        totalSize += await this.calculateDirectorySize(child)
      }
    }

    return totalSize
  }

  /**
   * Log debug message if debug logging is enabled.
   */
  private logDebug(message: string, data?: Record<string, unknown>): void {
    if (this.enableDebugLogging) {
      // Use consola for structured logging instead of postMessage
      import('consola')
        .then(({consola}) => {
          consola.debug(`[VirtualFileSystem] ${message}`, data || {})
        })
        .catch(() => {
          // Fallback if consola import fails
        })
    }
  }
}
