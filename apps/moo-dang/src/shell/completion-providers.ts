/**
 * Completion providers for shell command completion system.
 *
 * This module provides specific completion providers for different types of
 * shell completions including commands, file paths, environment variables,
 * and command-specific arguments.
 */

import type {
  CompletionConfig,
  CompletionContext,
  CompletionProvider,
  CompletionSuggestion,
  CompletionType,
} from './completion-types'
import type {ShellEnvironment} from './environment'
import type {VirtualFileSystem} from './types'

import {consola} from 'consola'
import {COMMAND_HELP_REGISTRY} from './command-help'

/**
 * Determines if command completion should be active for the given context.
 *
 * Commands are only completed at the start of the line to avoid suggesting
 * commands when arguments are expected.
 */
function canCompleteCommands(context: CompletionContext): boolean {
  return context.isNewCommand
}

/**
 * Creates a completion provider for shell command names.
 *
 * This provider suggests available built-in commands, executables in PATH,
 * and aliases to improve command discovery and typing efficiency.
 */
function createCommandCompletionProvider(
  commands: Map<string, unknown>,
  fileSystem: VirtualFileSystem,
): CompletionProvider {
  async function getCompletions(context: CompletionContext, config: CompletionConfig): Promise<CompletionSuggestion[]> {
    const suggestions: CompletionSuggestion[] = []
    const currentPart = context.currentPart.toLowerCase()

    // Get built-in commands
    for (const [commandName] of commands) {
      if (!config.caseSensitive && commandName.toLowerCase().includes(currentPart)) {
        const helpEntry = COMMAND_HELP_REGISTRY.get(commandName)

        suggestions.push({
          text: commandName,
          type: 'command',
          description: helpEntry?.summary ?? `Execute ${commandName} command`,
          priority: 'high',
          requiresSpace: true,
        })
      } else if (config.caseSensitive && commandName.includes(context.currentPart)) {
        const helpEntry = COMMAND_HELP_REGISTRY.get(commandName)

        suggestions.push({
          text: commandName,
          type: 'command',
          description: helpEntry?.summary ?? `Execute ${commandName} command`,
          priority: 'high',
          requiresSpace: true,
        })
      }
    }

    // Get executable files from PATH
    try {
      const pathVar = context.environmentVariables.PATH ?? '/bin:/usr/bin'
      const pathDirs = pathVar.split(':').filter(dir => dir.length > 0)

      for (const dir of pathDirs) {
        try {
          if ((await fileSystem.exists(dir)) && (await fileSystem.isDirectory(dir))) {
            const entries = await fileSystem.getDetailedListing(dir)

            for (const entry of entries) {
              if (entry.type === 'file') {
                const matchesFilter = config.caseSensitive
                  ? entry.name.includes(context.currentPart)
                  : entry.name.toLowerCase().includes(currentPart)

                if (matchesFilter) {
                  suggestions.push({
                    text: entry.name,
                    type: 'command',
                    description: `Executable from ${dir}`,
                    priority: 'medium',
                    requiresSpace: true,
                  })
                }
              }
            }
          }
        } catch (error) {
          // Skip directories that can't be read
          consola.debug(`Unable to read PATH directory '${dir}' due to access restrictions:`, error)
        }
      }
    } catch (error) {
      consola.debug('Error accessing PATH directories during command completion:', error)
    }

    return suggestions
  }

  return {
    id: 'commands',
    name: 'Shell Commands',
    supportedTypes: ['command'],
    priority: 'high',
    canComplete: canCompleteCommands,
    getCompletions,
  }
}

/**
 * Provider for completing file and directory paths.
 *
 * Suggests files and directories relative to current working directory
 * or from absolute paths. Handles hidden files based on configuration.
 */
export class FileCompletionProvider implements CompletionProvider {
  readonly id = 'files'
  readonly name = 'File System Paths'
  readonly supportedTypes: CompletionType[] = ['file', 'directory']
  readonly priority = 'medium' as const

  constructor(private readonly fileSystem: VirtualFileSystem) {}

  readonly canComplete = (context: CompletionContext): boolean => {
    // Complete files for any non-command position
    return !context.isNewCommand
  }

  readonly getCompletions = async (
    context: CompletionContext,
    config: CompletionConfig,
  ): Promise<CompletionSuggestion[]> => {
    const suggestions: CompletionSuggestion[] = []

    try {
      const currentPart = context.currentPart
      let searchDir = context.workingDirectory
      let prefix = ''

      // Handle different path types
      if (currentPart.startsWith('/')) {
        // Absolute path
        const lastSlash = currentPart.lastIndexOf('/')
        searchDir = lastSlash === 0 ? '/' : currentPart.slice(0, lastSlash)
        prefix = currentPart.slice(lastSlash + 1)
      } else if (currentPart.includes('/')) {
        // Relative path with directories
        const lastSlash = currentPart.lastIndexOf('/')
        const relativePath = currentPart.slice(0, lastSlash)
        prefix = currentPart.slice(lastSlash + 1)

        // Resolve relative path
        searchDir = this.resolvePath(context.workingDirectory, relativePath)
      } else {
        // Simple filename in current directory
        prefix = currentPart
      }

      // Check if search directory exists
      if (!(await this.fileSystem.exists(searchDir))) {
        return suggestions
      }

      if (!(await this.fileSystem.isDirectory(searchDir))) {
        return suggestions
      }

      // Read directory contents
      const entries = await this.fileSystem.getDetailedListing(searchDir)

      for (const entry of entries) {
        // Skip hidden files unless configured to include them
        if (!config.includeHiddenFiles && entry.name.startsWith('.')) {
          continue
        }

        // Filter by prefix
        const matchesPrefix = config.caseSensitive
          ? entry.name.startsWith(prefix)
          : entry.name.toLowerCase().startsWith(prefix.toLowerCase())

        if (matchesPrefix) {
          const isDirectory = entry.type === 'directory'
          const fullPath =
            currentPart.startsWith('/') || currentPart.includes('/')
              ? this.buildFullPath(currentPart, entry.name, prefix)
              : entry.name

          suggestions.push({
            text: isDirectory ? `${fullPath}/` : fullPath,
            type: isDirectory ? 'directory' : 'file',
            description: isDirectory ? `Directory in ${searchDir}` : `File in ${searchDir}`,
            priority: isDirectory ? 'high' : 'medium',
            requiresSpace: !isDirectory,
          })
        }
      }
    } catch (error) {
      consola.debug('File completion error:', error)
    }

    return suggestions
  }

  private resolvePath(basePath: string, relativePath: string): string {
    if (relativePath === '.') {
      return basePath
    }

    if (relativePath === '..') {
      const parts = basePath.split('/').filter(part => part.length > 0)
      parts.pop()
      return parts.length === 0 ? '/' : `/${parts.join('/')}`
    }

    // Simple concatenation for other cases
    return basePath.endsWith('/') ? `${basePath}${relativePath}` : `${basePath}/${relativePath}`
  }

  private buildFullPath(currentPath: string, entryName: string, prefix: string): string {
    const basePath = currentPath.slice(0, currentPath.length - prefix.length)
    return `${basePath}${entryName}`
  }
}

/**
 * Provider for completing environment variable names.
 *
 * Suggests available environment variables when preceded by $ or in
 * export/unset commands.
 */
export class EnvironmentCompletionProvider implements CompletionProvider {
  readonly id = 'environment'
  readonly name = 'Environment Variables'
  readonly supportedTypes: CompletionType[] = ['environment']
  readonly priority = 'medium' as const

  readonly canComplete = (context: CompletionContext): boolean => {
    // Complete if current part starts with $ (variable expansion)
    if (context.currentPart.startsWith('$')) {
      return true
    }

    // Complete for export and unset commands
    const firstCommand = context.commandParts[0]?.toLowerCase()
    if (firstCommand === 'export' || firstCommand === 'unset') {
      return context.currentPartIndex > 0
    }

    return false
  }

  readonly getCompletions = async (
    context: CompletionContext,
    config: CompletionConfig,
  ): Promise<CompletionSuggestion[]> => {
    const suggestions: CompletionSuggestion[] = []

    let prefix = context.currentPart
    let prependDollar = false

    // Handle $ prefix
    if (prefix.startsWith('$')) {
      prefix = prefix.slice(1)
      prependDollar = true
    }

    // Get matching environment variables
    for (const [varName, varValue] of Object.entries(context.environmentVariables)) {
      const matchesPrefix = config.caseSensitive
        ? varName.startsWith(prefix)
        : varName.toLowerCase().startsWith(prefix.toLowerCase())

      if (matchesPrefix) {
        const displayText = prependDollar ? `$${varName}` : varName
        const description = `Environment variable: ${varValue.slice(0, 50)}${varValue.length > 50 ? '...' : ''}`

        suggestions.push({
          text: displayText,
          type: 'environment',
          description,
          priority: 'medium',
          requiresSpace: false,
        })
      }
    }

    return suggestions
  }
}

/**
 * Provider for completing command options and arguments.
 *
 * Suggests common command options (like -h, --help) and command-specific
 * arguments based on the command being executed.
 */
export class OptionCompletionProvider implements CompletionProvider {
  readonly id = 'options'
  readonly name = 'Command Options'
  readonly supportedTypes: CompletionType[] = ['option', 'argument']
  readonly priority = 'medium' as const

  readonly canComplete = (context: CompletionContext): boolean => {
    // Complete options for non-command positions starting with -
    return !context.isNewCommand && context.currentPart.startsWith('-')
  }

  readonly getCompletions = async (
    context: CompletionContext,
    _config: CompletionConfig,
  ): Promise<CompletionSuggestion[]> => {
    const suggestions: CompletionSuggestion[] = []
    const command = context.commandParts[0]

    // Common options for most commands
    const commonOptions = [
      {flag: '-h', description: 'Show help information'},
      {flag: '--help', description: 'Show detailed help information'},
    ]

    // Command-specific options
    const commandOptions: Record<string, {flag: string; description: string}[]> = {
      ls: [
        {flag: '-l', description: 'Long format listing'},
        {flag: '-a', description: 'Show hidden files'},
        {flag: '-la', description: 'Long format with hidden files'},
      ],
      cat: [{flag: '-n', description: 'Number lines in output'}],
      echo: [{flag: '-n', description: 'Do not output trailing newline'}],
    }

    // Get options for current command
    const options = [...commonOptions, ...(command ? (commandOptions[command] ?? []) : [])]

    // Filter options by current input
    for (const option of options) {
      if (option.flag.startsWith(context.currentPart)) {
        suggestions.push({
          text: option.flag,
          type: 'option',
          description: option.description,
          priority: 'medium',
          requiresSpace: true,
        })
      }
    }

    return suggestions
  }
}

/**
 * Creates all standard completion providers for the shell.
 *
 * These providers work together to provide comprehensive completion
 * functionality covering commands, files, environment variables, and options.
 */
export function createCompletionProviders(
  commands: Map<string, unknown>,
  fileSystem: VirtualFileSystem,
  _environment: ShellEnvironment,
): CompletionProvider[] {
  return [
    createCommandCompletionProvider(commands, fileSystem),
    new FileCompletionProvider(fileSystem),
    new EnvironmentCompletionProvider(),
    new OptionCompletionProvider(),
  ]
}
