/**
 * Type definitions for the comprehensive shell help system.
 *
 * Provides structured help metadata, formatting options, and documentation
 * patterns for consistent command documentation across the shell environment.
 */

/**
 * Command usage pattern for help documentation.
 */
export interface CommandUsage {
  /** Usage pattern string (e.g., "ls [OPTION]... [FILE]...") */
  readonly pattern: string
  /** Brief description of this usage pattern */
  readonly description: string
}

/**
 * Command option or flag documentation.
 */
export interface CommandOption {
  /** Short form flag (e.g., "-l") */
  readonly shortForm?: string
  /** Long form flag (e.g., "--long") */
  readonly longForm?: string
  /** Description of what this option does */
  readonly description: string
  /** Whether this option requires a parameter */
  readonly hasParameter?: boolean
  /** Parameter name for documentation (e.g., "FILE", "PATH") */
  readonly parameterName?: string
}

/**
 * Example usage with expected output for command documentation.
 */
export interface CommandExample {
  /** The command to run (e.g., "ls -la /home") */
  readonly command: string
  /** Description of what this example demonstrates */
  readonly description: string
  /** Optional expected output or result description */
  readonly expectedOutput?: string
}

/**
 * Comprehensive help information for a shell command.
 */
export interface CommandHelpInfo {
  /** Command name */
  readonly name: string
  /** Brief one-line description */
  readonly summary: string
  /** Detailed description with behavior explanation */
  readonly description: string
  /** Usage patterns for different invocation modes */
  readonly usage: CommandUsage[]
  /** Available command-line options and flags */
  readonly options: CommandOption[]
  /** Example usages with explanations */
  readonly examples: CommandExample[]
  /** Additional notes, warnings, or tips */
  readonly notes?: string[]
  /** Related commands or see-also references */
  readonly seeAlso?: string[]
}

/**
 * Help formatting options for customizing output display.
 */
export interface HelpFormatOptions {
  /** Maximum width for formatted output */
  readonly maxWidth: number
  /** Indentation for sections and subsections */
  readonly indent: string
  /** Whether to include color formatting codes */
  readonly useColor: boolean
  /** Whether to show examples in help output */
  readonly showExamples: boolean
  /** Whether to show detailed descriptions */
  readonly showDetails: boolean
}

/**
 * Help system configuration and settings.
 */
export interface HelpSystemConfig {
  /** Default formatting options */
  readonly defaultFormat: HelpFormatOptions
  /** Custom help text for shell-specific features */
  readonly shellInfo: {
    readonly name: string
    readonly version: string
    readonly description: string
    readonly features: string[]
  }
  /** Topics for general help categories */
  readonly helpTopics: HelpTopic[]
}

/**
 * Help topic for organizing help information by category.
 */
export interface HelpTopic {
  /** Topic identifier (e.g., "files", "navigation", "system") */
  readonly id: string
  /** Display name for the topic */
  readonly title: string
  /** Topic description */
  readonly description: string
  /** Commands included in this topic */
  readonly commands: string[]
  /** Additional help text specific to this topic */
  readonly content?: string
}

/**
 * Result of help system query with formatted output.
 */
export interface HelpQueryResult {
  /** Whether the help query was successful */
  readonly success: boolean
  /** Formatted help text ready for display */
  readonly content: string
  /** Error message if query failed */
  readonly error?: string
  /** Type of help result (command, topic, general) */
  readonly type: 'command' | 'topic' | 'general' | 'error'
  /** Related suggestions if query was ambiguous */
  readonly suggestions?: string[]
}

/**
 * Interface for help system that manages command documentation.
 */
export interface HelpSystem {
  /** Register help information for a command */
  readonly registerCommand: (helpInfo: CommandHelpInfo) => void
  /** Get formatted help for a specific command */
  readonly getCommandHelp: (commandName: string, options?: Partial<HelpFormatOptions>) => HelpQueryResult
  /** Get help for a specific topic category */
  readonly getTopicHelp: (topicId: string, options?: Partial<HelpFormatOptions>) => HelpQueryResult
  /** Get general help overview with available commands and topics */
  readonly getGeneralHelp: (options?: Partial<HelpFormatOptions>) => HelpQueryResult
  /** Search for help content matching a query string */
  readonly searchHelp: (query: string, options?: Partial<HelpFormatOptions>) => HelpQueryResult
  /** List all available commands with brief descriptions */
  readonly listCommands: (options?: Partial<HelpFormatOptions>) => HelpQueryResult
  /** List all available help topics */
  readonly listTopics: (options?: Partial<HelpFormatOptions>) => HelpQueryResult
}
