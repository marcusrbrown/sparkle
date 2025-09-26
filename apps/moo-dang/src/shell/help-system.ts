/**
 * Comprehensive help system implementation for the shell environment.
 *
 * Provides structured command documentation, usage examples, and organized
 * help topics to improve user experience and command discoverability.
 */

import type {
  CommandHelpInfo,
  CommandOption,
  HelpFormatOptions,
  HelpQueryResult,
  HelpSystem,
  HelpSystemConfig,
  HelpTopic,
} from './help-types'

import {consola} from 'consola'

/**
 * Default formatting configuration for help output.
 */
const DEFAULT_FORMAT_OPTIONS: HelpFormatOptions = {
  maxWidth: 80,
  indent: '  ',
  useColor: false, // Terminal doesn't support ANSI colors in browser
  showExamples: true,
  showDetails: true,
}

/**
 * Default help system configuration with shell information and topics.
 */
const DEFAULT_HELP_CONFIG: HelpSystemConfig = {
  defaultFormat: DEFAULT_FORMAT_OPTIONS,
  shellInfo: {
    name: 'moo-dang',
    version: '1.0.0',
    description: 'A WASM-based web shell with Unix-like command support',
    features: [
      'Virtual file system with persistent state',
      'Pipeline support with I/O redirection',
      'Environment variable management',
      'WASM executable support',
      'Built-in Unix-like commands',
    ],
  },
  helpTopics: [
    {
      id: 'files',
      title: 'File Operations',
      description: 'Commands for file and directory management',
      commands: ['ls', 'cat', 'cd', 'pwd'],
      content: [
        'File operations in moo-dang use a virtual file system that persists',
        'during your session. All standard Unix file operations are supported.',
        '',
        'Navigation: cd, pwd',
        'Listing: ls (with -l and -a options)',
        'Reading: cat',
        'The file system starts with a basic directory structure.',
      ].join('\n'),
    },
    {
      id: 'system',
      title: 'System Commands',
      description: 'System information and control commands',
      commands: ['env', 'export', 'printenv', 'unset', 'which', 'clear'],
      content: [
        'System commands provide access to environment variables and',
        'shell configuration. Environment variables persist during',
        'your session and can be used in command expansion.',
        '',
        'Environment: env, export, printenv, unset',
        'Utilities: which, clear',
      ].join('\n'),
    },
    {
      id: 'text',
      title: 'Text Processing',
      description: 'Commands for text output and processing',
      commands: ['echo'],
      content: [
        'Text processing commands help with output formatting and',
        'basic text manipulation. These commands can be combined',
        'with pipelines for more complex operations.',
      ].join('\n'),
    },
    {
      id: 'help',
      title: 'Getting Help',
      description: 'Help system and documentation commands',
      commands: ['help'],
      content: [
        'The help system provides comprehensive documentation for all commands.',
        '',
        'Usage patterns:',
        '  help                 - Show general help and command list',
        '  help [command]       - Show detailed help for specific command',
        '  help topics          - List available help topics',
        '  help topic [name]    - Show help for specific topic',
        '',
        'You can also use "?" as a shortcut for the help command.',
      ].join('\n'),
    },
  ],
}

/**
 * Implementation of the comprehensive help system.
 */
export class ShellHelpSystem implements HelpSystem {
  private readonly commands = new Map<string, CommandHelpInfo>()
  private readonly config: HelpSystemConfig

  constructor(config?: Partial<HelpSystemConfig>) {
    this.config = {
      ...DEFAULT_HELP_CONFIG,
      ...config,
      defaultFormat: {
        ...DEFAULT_HELP_CONFIG.defaultFormat,
        ...config?.defaultFormat,
      },
    }
  }

  registerCommand(helpInfo: CommandHelpInfo): void {
    this.commands.set(helpInfo.name, helpInfo)
    consola.debug(`Registered help for command: ${helpInfo.name}`)
  }

  getCommandHelp(commandName: string, options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const helpInfo = this.commands.get(commandName)

    if (!helpInfo) {
      const suggestions = this.findSimilarCommands(commandName)
      return {
        success: false,
        content: `No help available for command: ${commandName}`,
        error: `Command '${commandName}' not found`,
        type: 'error',
        suggestions,
      }
    }

    const content = this.formatCommandHelp(helpInfo, formatOptions)
    return {
      success: true,
      content,
      type: 'command',
    }
  }

  getTopicHelp(topicId: string, options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const topic = this.config.helpTopics.find(t => t.id === topicId)

    if (!topic) {
      const availableTopics = this.config.helpTopics.map(t => t.id).join(', ')
      return {
        success: false,
        content: `Unknown help topic: ${topicId}`,
        error: `Topic '${topicId}' not found`,
        type: 'error',
        suggestions: [availableTopics],
      }
    }

    const content = this.formatTopicHelp(topic, formatOptions)
    return {
      success: true,
      content,
      type: 'topic',
    }
  }

  getGeneralHelp(options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const content = this.formatGeneralHelp(formatOptions)

    return {
      success: true,
      content,
      type: 'general',
    }
  }

  searchHelp(query: string, options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const matches: {type: string; name: string; relevance: number}[] = []

    // Search command names and descriptions
    for (const [name, helpInfo] of this.commands) {
      const nameMatch = name.toLowerCase().includes(query.toLowerCase())
      const descMatch = helpInfo.summary.toLowerCase().includes(query.toLowerCase())
      const detailMatch = helpInfo.description.toLowerCase().includes(query.toLowerCase())

      if (nameMatch || descMatch || detailMatch) {
        let relevance = 0
        if (nameMatch) relevance += 3
        if (descMatch) relevance += 2
        if (detailMatch) relevance += 1
        matches.push({type: 'command', name, relevance})
      }
    }

    // Search help topics
    for (const topic of this.config.helpTopics) {
      const titleMatch = topic.title.toLowerCase().includes(query.toLowerCase())
      const descMatch = topic.description.toLowerCase().includes(query.toLowerCase())
      const contentMatch = topic.content?.toLowerCase().includes(query.toLowerCase())

      if (titleMatch || descMatch || contentMatch) {
        let relevance = 0
        if (titleMatch) relevance += 3
        if (descMatch) relevance += 2
        if (contentMatch) relevance += 1
        matches.push({type: 'topic', name: topic.id, relevance})
      }
    }

    if (matches.length === 0) {
      return {
        success: false,
        content: `No help found for: ${query}`,
        error: `No matches found for query '${query}'`,
        type: 'error',
      }
    }

    // Sort by relevance and format results
    matches.sort((a, b) => b.relevance - a.relevance)
    const results = matches.slice(0, 10) // Limit to top 10 results

    const content = this.formatSearchResults(query, results, formatOptions)
    return {
      success: true,
      content,
      type: 'general',
    }
  }

  listCommands(options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const commands = Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name))

    const content = this.formatCommandList(commands, formatOptions)
    return {
      success: true,
      content,
      type: 'general',
    }
  }

  listTopics(options?: Partial<HelpFormatOptions>): HelpQueryResult {
    const formatOptions = {...this.config.defaultFormat, ...options}
    const content = this.formatTopicList(this.config.helpTopics, formatOptions)

    return {
      success: true,
      content,
      type: 'general',
    }
  }

  /**
   * Format comprehensive help for a specific command.
   */
  private formatCommandHelp(helpInfo: CommandHelpInfo, options: HelpFormatOptions): string {
    const {indent} = options
    const sections: string[] = []

    // Name and summary
    sections.push(`NAME`)
    sections.push(`${indent}${helpInfo.name} - ${helpInfo.summary}`)
    sections.push('')

    // Usage patterns
    if (helpInfo.usage.length > 0) {
      sections.push('USAGE')
      for (const usage of helpInfo.usage) {
        sections.push(`${indent}${usage.pattern}`)
        if (usage.description) {
          sections.push(`${indent}${indent}${usage.description}`)
        }
      }
      sections.push('')
    }

    // Description
    if (options.showDetails && helpInfo.description) {
      sections.push('DESCRIPTION')
      const descLines = this.wrapText(helpInfo.description, options.maxWidth - indent.length)
      for (const line of descLines) {
        sections.push(`${indent}${line}`)
      }
      sections.push('')
    }

    // Options
    if (helpInfo.options.length > 0) {
      sections.push('OPTIONS')
      for (const option of helpInfo.options) {
        const optText = this.formatOption(option)
        sections.push(`${indent}${optText}`)
        const descLines = this.wrapText(option.description, options.maxWidth - indent.length * 2)
        for (const line of descLines) {
          sections.push(`${indent}${indent}${line}`)
        }
      }
      sections.push('')
    }

    // Examples
    if (options.showExamples && helpInfo.examples.length > 0) {
      sections.push('EXAMPLES')
      for (const example of helpInfo.examples) {
        sections.push(`${indent}${example.description}:`)
        sections.push(`${indent}${indent}$ ${example.command}`)
        if (example.expectedOutput) {
          const outputLines = example.expectedOutput.split('\n')
          for (const line of outputLines) {
            sections.push(`${indent}${indent}${line}`)
          }
        }
        sections.push('')
      }
    }

    // Notes
    if (helpInfo.notes && helpInfo.notes.length > 0) {
      sections.push('NOTES')
      for (const note of helpInfo.notes) {
        const noteLines = this.wrapText(note, options.maxWidth - indent.length)
        for (const line of noteLines) {
          sections.push(`${indent}${line}`)
        }
      }
      sections.push('')
    }

    // See also
    if (helpInfo.seeAlso && helpInfo.seeAlso.length > 0) {
      sections.push('SEE ALSO')
      sections.push(`${indent}${helpInfo.seeAlso.join(', ')}`)
    }

    return sections.join('\n')
  }

  /**
   * Format help for a help topic.
   */
  private formatTopicHelp(topic: HelpTopic, options: HelpFormatOptions): string {
    const {indent} = options
    const sections: string[] = []

    sections.push(`TOPIC: ${topic.title.toUpperCase()}`)
    sections.push('')

    // Description
    const descLines = this.wrapText(topic.description, options.maxWidth - indent.length)
    for (const line of descLines) {
      sections.push(`${indent}${line}`)
    }
    sections.push('')

    // Commands in this topic
    if (topic.commands.length > 0) {
      sections.push('COMMANDS')
      const commandsWithHelp = topic.commands
        .map(name => {
          const helpInfo = this.commands.get(name)
          return helpInfo ? `${name} - ${helpInfo.summary}` : name
        })
        .sort()

      for (const cmd of commandsWithHelp) {
        sections.push(`${indent}${cmd}`)
      }
      sections.push('')
    }

    // Additional content
    if (topic.content) {
      sections.push('DETAILS')
      const contentLines = topic.content.split('\n')
      for (const line of contentLines) {
        if (line.trim()) {
          const wrappedLines = this.wrapText(line, options.maxWidth - indent.length)
          for (const wrappedLine of wrappedLines) {
            sections.push(`${indent}${wrappedLine}`)
          }
        } else {
          sections.push('')
        }
      }
    }

    return sections.join('\n')
  }

  /**
   * Format general help overview.
   */
  private formatGeneralHelp(options: HelpFormatOptions): string {
    const {shellInfo} = this.config
    const {indent} = options
    const sections: string[] = []

    sections.push(`${shellInfo.name.toUpperCase()} - ${shellInfo.description}`)
    sections.push('')

    sections.push('FEATURES')
    for (const feature of shellInfo.features) {
      sections.push(`${indent}• ${feature}`)
    }
    sections.push('')

    sections.push('GETTING STARTED')
    sections.push(`${indent}Type "help topics" to see available help categories`)
    sections.push(`${indent}Type "help [command]" for detailed command information`)
    sections.push(`${indent}Type "?" as a shortcut for help`)
    sections.push('')

    sections.push('COMMON COMMANDS')
    const commonCommands = ['ls', 'cd', 'pwd', 'cat', 'echo', 'help']
    for (const name of commonCommands) {
      const helpInfo = this.commands.get(name)
      if (helpInfo) {
        sections.push(`${indent}${name.padEnd(8)} ${helpInfo.summary}`)
      }
    }
    sections.push('')

    sections.push('HELP TOPICS')
    for (const topic of this.config.helpTopics) {
      sections.push(`${indent}${topic.id.padEnd(8)} ${topic.description}`)
    }

    return sections.join('\n')
  }

  /**
   * Format search results.
   */
  private formatSearchResults(
    query: string,
    results: {type: string; name: string; relevance: number}[],
    options: HelpFormatOptions,
  ): string {
    const {indent} = options
    const sections: string[] = []

    sections.push(`SEARCH RESULTS FOR: ${query}`)
    sections.push('')

    for (const result of results) {
      if (result.type === 'command') {
        const helpInfo = this.commands.get(result.name)
        if (helpInfo) {
          sections.push(`${indent}${result.name} (command) - ${helpInfo.summary}`)
        }
      } else if (result.type === 'topic') {
        const topic = this.config.helpTopics.find(t => t.id === result.name)
        if (topic) {
          sections.push(`${indent}${result.name} (topic) - ${topic.description}`)
        }
      }
    }

    sections.push('')
    sections.push('Use "help [item]" or "help topic [topic]" for detailed information.')

    return sections.join('\n')
  }

  /**
   * Format list of all commands.
   */
  private formatCommandList(commands: CommandHelpInfo[], options: HelpFormatOptions): string {
    const {indent} = options
    const sections: string[] = []

    sections.push('AVAILABLE COMMANDS')
    sections.push('')

    const maxNameLength = Math.max(...commands.map(c => c.name.length))
    for (const cmd of commands) {
      const name = cmd.name.padEnd(maxNameLength)
      sections.push(`${indent}${name}  ${cmd.summary}`)
    }

    return sections.join('\n')
  }

  /**
   * Format list of help topics.
   */
  private formatTopicList(topics: HelpTopic[], options: HelpFormatOptions): string {
    const {indent} = options
    const sections: string[] = []

    sections.push('HELP TOPICS')
    sections.push('')

    const maxIdLength = Math.max(...topics.map(t => t.id.length))
    for (const topic of topics) {
      const id = topic.id.padEnd(maxIdLength)
      sections.push(`${indent}${id}  ${topic.description}`)
    }

    sections.push('')
    sections.push('Use "help topic [name]" for detailed information about a topic.')

    return sections.join('\n')
  }

  /**
   * Format a command option for display.
   */
  private formatOption(option: CommandOption): string {
    const parts: string[] = []

    if (option.shortForm) {
      parts.push(option.shortForm)
    }

    if (option.longForm) {
      parts.push(option.longForm)
    }

    let optionText = parts.join(', ')

    if (option.hasParameter && option.parameterName) {
      if (option.longForm) {
        optionText += `=${option.parameterName}`
      } else {
        optionText += ` ${option.parameterName}`
      }
    }

    return optionText
  }

  /**
   * Wrap text to fit within specified width.
   */
  private wrapText(text: string, width: number): string[] {
    if (width <= 0) return [text]

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.length > 0 ? lines : ['']
  }

  /**
   * Find commands with names similar to the query.
   */
  private findSimilarCommands(query: string): string[] {
    const suggestions: string[] = []
    const queryLower = query.toLowerCase()

    for (const name of this.commands.keys()) {
      const nameLower = name.toLowerCase()
      if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
        suggestions.push(name)
      }
    }

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }
}

/**
 * Create and configure a help system instance with default settings.
 */
export function createHelpSystem(config?: Partial<HelpSystemConfig>): HelpSystem {
  return new ShellHelpSystem(config)
}
