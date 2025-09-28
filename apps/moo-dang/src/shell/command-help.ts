/**
 * Command help registry with comprehensive documentation for all shell commands.
 *
 * Provides structured help information including usage patterns, options,
 * examples, and detailed descriptions for every built-in shell command.
 */

import type {CommandHelpInfo} from './help-types'

/**
 * Complete help information for the 'ls' command.
 */
export const LS_HELP: CommandHelpInfo = {
  name: 'ls',
  summary: 'List directory contents',
  description: [
    'List information about files and directories. By default, ls shows the names',
    'of files in the current directory in a simple format. Use options to control',
    'the output format and which files are displayed.',
  ].join(' '),
  usage: [
    {
      pattern: 'ls [OPTION]... [FILE]...',
      description: 'List files and directories with optional formatting',
    },
  ],
  options: [
    {
      shortForm: '-l',
      longForm: '--long',
      description: 'Use long listing format showing file details, permissions, and timestamps',
    },
    {
      shortForm: '-a',
      longForm: '--all',
      description: 'Show hidden files and directories (those starting with .)',
    },
  ],
  examples: [
    {
      command: 'ls',
      description: 'List files in current directory',
      expectedOutput: 'file1.txt\nfile2.txt\ndocuments/',
    },
    {
      command: 'ls -l',
      description: 'Show detailed file information',
      expectedOutput: 'total 8\n-rw-r--r-- 1 user user 1234 Sep 23 10:30 file1.txt',
    },
    {
      command: 'ls -la',
      description: 'Show all files including hidden ones with details',
    },
    {
      command: 'ls /home',
      description: 'List contents of specific directory',
    },
  ],
  notes: [
    'Hidden files (starting with .) are only shown with the -a option',
    'The long format (-l) shows permissions, size, and modification time',
    'Directory names are displayed with a trailing slash in simple format',
  ],
  seeAlso: ['cd', 'pwd', 'cat'],
}

/**
 * Complete help information for the 'cd' command.
 */
export const CD_HELP: CommandHelpInfo = {
  name: 'cd',
  summary: 'Change current working directory',
  description: [
    'Change the current working directory to the specified path. If no path is',
    'provided, changes to the home directory. The path can be absolute (starting',
    'with /) or relative to the current directory.',
  ].join(' '),
  usage: [
    {
      pattern: 'cd [DIRECTORY]',
      description: 'Change to specified directory or home directory',
    },
  ],
  options: [],
  examples: [
    {
      command: 'cd',
      description: 'Change to home directory',
    },
    {
      command: 'cd /home/user',
      description: 'Change to absolute path',
    },
    {
      command: 'cd documents',
      description: 'Change to relative path',
    },
    {
      command: 'cd ..',
      description: 'Go up one directory level',
    },
    {
      command: 'cd ~',
      description: 'Change to home directory (same as cd)',
    },
  ],
  notes: [
    'Use "pwd" to see your current directory',
    'The tilde (~) represents the home directory',
    'Use ".." to go up one directory level',
    'Use "." to refer to the current directory',
  ],
  seeAlso: ['pwd', 'ls'],
}

/**
 * Complete help information for the 'pwd' command.
 */
export const PWD_HELP: CommandHelpInfo = {
  name: 'pwd',
  summary: 'Print current working directory',
  description: [
    'Print the full pathname of the current working directory to standard output.',
    'This command has no options and always shows the absolute path.',
  ].join(' '),
  usage: [
    {
      pattern: 'pwd',
      description: 'Display current directory path',
    },
  ],
  options: [],
  examples: [
    {
      command: 'pwd',
      description: 'Show current directory',
      expectedOutput: '/home/user',
    },
  ],
  notes: [
    'Always displays the absolute path from the root directory',
    'Useful for confirming your current location before running commands',
  ],
  seeAlso: ['cd', 'ls'],
}

/**
 * Complete help information for the 'cat' command.
 */
export const CAT_HELP: CommandHelpInfo = {
  name: 'cat',
  summary: 'Display file contents',
  description: [
    'Read files and print their contents to standard output. Can read multiple',
    'files and concatenate them together. If no files are specified, reads from',
    'standard input.',
  ].join(' '),
  usage: [
    {
      pattern: 'cat [FILE]...',
      description: 'Display contents of one or more files',
    },
  ],
  options: [],
  examples: [
    {
      command: 'cat file.txt',
      description: 'Display contents of a single file',
    },
    {
      command: 'cat file1.txt file2.txt',
      description: 'Display contents of multiple files concatenated',
    },
  ],
  notes: [
    'Files are displayed in the order specified on the command line',
    'If a file does not exist, an error message is displayed',
    'Use with caution on binary files as they may contain unprintable characters',
  ],
  seeAlso: ['ls', 'echo'],
}

/**
 * Complete help information for the 'echo' command.
 */
export const ECHO_HELP: CommandHelpInfo = {
  name: 'echo',
  summary: 'Display text to output',
  description: [
    'Write the specified text to standard output. Arguments are separated by',
    'single spaces and followed by a newline. Useful for displaying messages,',
    'creating simple output, or testing command pipelines.',
  ].join(' '),
  usage: [
    {
      pattern: 'echo [TEXT]...',
      description: 'Output specified text followed by newline',
    },
  ],
  options: [],
  examples: [
    {
      command: 'echo "Hello, World!"',
      description: 'Display a simple message',
      expectedOutput: 'Hello, World!',
    },
    {
      command: 'echo Hello World',
      description: 'Display text without quotes',
      expectedOutput: 'Hello World',
    },
    {
      command: 'echo',
      description: 'Display empty line',
      expectedOutput: '',
    },
    {
      command: 'echo $HOME',
      description: 'Display environment variable value',
    },
  ],
  notes: [
    'Arguments are joined with spaces',
    'Environment variables are expanded if they exist',
    'Quotes preserve spaces and special characters',
  ],
  seeAlso: ['cat', 'printenv'],
}

/**
 * Complete help information for the 'clear' command.
 */
export const CLEAR_HELP: CommandHelpInfo = {
  name: 'clear',
  summary: 'Clear the terminal screen',
  description: [
    'Clear the terminal screen by sending control sequences that move the cursor',
    'to the top-left corner and erase the display. The command history and',
    'scrollback buffer remain available.',
  ].join(' '),
  usage: [
    {
      pattern: 'clear',
      description: 'Clear the terminal display',
    },
  ],
  options: [],
  examples: [
    {
      command: 'clear',
      description: 'Clear the screen',
    },
  ],
  notes: [
    'Does not affect command history',
    'Scrollback buffer may still contain previous output',
    'Equivalent to pressing Ctrl+L in many terminals',
  ],
  seeAlso: [],
}

/**
 * Complete help information for the 'env' command.
 */
export const ENV_HELP: CommandHelpInfo = {
  name: 'env',
  summary: 'Display or modify environment variables',
  description: [
    'Display all environment variables or run a command with modified environment.',
    'When called without arguments, displays all environment variables. Can also',
    'set variables temporarily for a single command execution.',
  ].join(' '),
  usage: [
    {
      pattern: 'env',
      description: 'Display all environment variables',
    },
    {
      pattern: 'env VAR=value [COMMAND]',
      description: 'Set variable and optionally run command',
    },
  ],
  options: [],
  examples: [
    {
      command: 'env',
      description: 'Show all environment variables',
    },
    {
      command: 'env PATH=/usr/bin pwd',
      description: 'Run command with modified PATH',
    },
  ],
  notes: [
    'Variables set with env only affect the current command',
    'Use export for persistent environment variables',
    'Variable assignments must come before any command name',
  ],
  seeAlso: ['export', 'printenv', 'unset'],
}

/**
 * Complete help information for the 'export' command.
 */
export const EXPORT_HELP: CommandHelpInfo = {
  name: 'export',
  summary: 'Set environment variables',
  description: [
    'Set environment variables that will be available to the current shell session',
    'and any commands executed from it. Variables remain set until the session ends',
    'or they are explicitly unset.',
  ].join(' '),
  usage: [
    {
      pattern: 'export VAR=value',
      description: 'Set environment variable to specified value',
    },
    {
      pattern: 'export VAR',
      description: 'Export existing variable to environment',
    },
  ],
  options: [],
  examples: [
    {
      command: 'export PATH=/usr/local/bin:$PATH',
      description: 'Add directory to PATH variable',
    },
    {
      command: 'export EDITOR=nano',
      description: 'Set default editor',
    },
  ],
  notes: [
    'Exported variables persist for the entire session',
    'Use $VAR syntax to reference existing variables',
    'Variables are case-sensitive',
  ],
  seeAlso: ['env', 'printenv', 'unset'],
}

/**
 * Complete help information for the 'printenv' command.
 */
export const PRINTENV_HELP: CommandHelpInfo = {
  name: 'printenv',
  summary: 'Print environment variable values',
  description: [
    'Print the values of environment variables. When called without arguments,',
    'displays all environment variables. When given variable names, displays',
    'only the values of those specific variables.',
  ].join(' '),
  usage: [
    {
      pattern: 'printenv [VAR]...',
      description: 'Print specified variables or all if none given',
    },
  ],
  options: [],
  examples: [
    {
      command: 'printenv',
      description: 'Show all environment variables',
    },
    {
      command: 'printenv HOME',
      description: 'Show value of HOME variable',
    },
    {
      command: 'printenv PATH HOME',
      description: 'Show values of multiple variables',
    },
  ],
  notes: [
    'Only shows variable values, not variable=value format',
    'Returns empty output for undefined variables',
    'More focused output than env command',
  ],
  seeAlso: ['env', 'export', 'unset'],
}

/**
 * Complete help information for the 'unset' command.
 */
export const UNSET_HELP: CommandHelpInfo = {
  name: 'unset',
  summary: 'Remove environment variables',
  description: [
    'Remove environment variables from the current shell session. Once unset,',
    'the variables will no longer be available to commands or the shell.',
  ].join(' '),
  usage: [
    {
      pattern: 'unset VAR...',
      description: 'Remove specified environment variables',
    },
  ],
  options: [],
  examples: [
    {
      command: 'unset TEMP_VAR',
      description: 'Remove a temporary variable',
    },
    {
      command: 'unset VAR1 VAR2',
      description: 'Remove multiple variables',
    },
  ],
  notes: [
    'Cannot remove read-only variables',
    'No error if variable does not exist',
    'Changes persist for the current session only',
  ],
  seeAlso: ['export', 'env', 'printenv'],
}

/**
 * Complete help information for the 'which' command.
 */
export const WHICH_HELP: CommandHelpInfo = {
  name: 'which',
  summary: 'Locate commands in PATH',
  description: [
    'Show the full path of commands that would be executed when typed. Searches',
    'through the directories in the PATH environment variable to find executable',
    'commands matching the given names.',
  ].join(' '),
  usage: [
    {
      pattern: 'which COMMAND...',
      description: 'Show path to specified commands',
    },
  ],
  options: [],
  examples: [
    {
      command: 'which ls',
      description: 'Show path to ls command',
    },
    {
      command: 'which cat echo',
      description: 'Show paths to multiple commands',
    },
  ],
  notes: [
    'Only shows commands found in PATH directories',
    'Built-in commands may not have file paths',
    'Returns exit code 1 if command not found',
  ],
  seeAlso: ['env', 'export', 'printenv'],
}

/**
 * Complete help information for the 'history' command.
 */
export const HISTORY_HELP: CommandHelpInfo = {
  name: 'history',
  summary: 'Display, search, or manage command history',
  description: [
    'Display shell command history with various options for viewing, searching,',
    'and managing previously executed commands. History is automatically saved',
    'and persisted across browser sessions for convenient command recall.',
  ].join(' '),
  usage: [
    {
      pattern: 'history',
      description: 'Show all command history',
    },
    {
      pattern: 'history COUNT',
      description: 'Show last COUNT commands',
    },
    {
      pattern: 'history -s QUERY',
      description: 'Search history for matching commands',
    },
    {
      pattern: 'history -c',
      description: 'Clear all command history',
    },
  ],
  options: [
    {
      shortForm: '-h',
      longForm: '--help',
      description: 'Show detailed help information',
    },
    {
      shortForm: '-c',
      longForm: '--clear',
      description: 'Clear all history entries',
    },
    {
      shortForm: '-s',
      longForm: '--search',
      description: 'Search history for matching commands',
    },
    {
      shortForm: '-r',
      longForm: '--recent',
      description: 'Show recent commands (default: 10)',
    },
    {
      shortForm: '-n',
      longForm: '--max-results',
      description: 'Maximum number of search results',
    },
    {
      shortForm: '-i',
      longForm: '--case-sensitive',
      description: 'Use case-sensitive search',
    },
    {
      shortForm: '-e',
      longForm: '--regex',
      description: 'Use regular expression search',
    },
    {
      longForm: '--stats',
      description: 'Show history statistics and analytics',
    },
    {
      longForm: '--export',
      description: 'Export history in specified format',
    },
    {
      longForm: '--format',
      description: 'Export format: json, csv, txt (default: txt)',
    },
  ],
  examples: [
    {
      command: 'history',
      description: 'Show all command history with timestamps',
    },
    {
      command: 'history 20',
      description: 'Show last 20 commands',
    },
    {
      command: 'history -s "git"',
      description: 'Search for commands containing "git"',
    },
    {
      command: 'history -s "ls.*-l" -e',
      description: 'Regex search for "ls" commands with "-l" flag',
    },
    {
      command: 'history -r 5',
      description: 'Show 5 most recent commands',
    },
    {
      command: 'history --stats',
      description: 'Display usage statistics and top commands',
    },
    {
      command: 'history --export --format json',
      description: 'Export history as JSON format',
    },
    {
      command: 'history -c',
      description: 'Clear all command history',
    },
  ],
  notes: [
    'History is automatically saved and persists across browser sessions',
    'Duplicate commands are not stored by default',
    'Use Ctrl+R for interactive reverse history search',
    'Commands starting with space are not saved (if configured)',
    'Maximum history size is configurable (default: 1000 entries)',
  ],
  seeAlso: ['alias', 'source', 'export'],
}

/**
 * Complete help information for the 'help' command.
 */
export const HELP_HELP: CommandHelpInfo = {
  name: 'help',
  summary: 'Display help information',
  description: [
    'Display help information about shell commands and topics. Can show general help,',
    'detailed information about specific commands, or help on particular topics.',
    'The help system provides comprehensive documentation with usage examples.',
  ].join(' '),
  usage: [
    {
      pattern: 'help',
      description: 'Show general help and overview',
    },
    {
      pattern: 'help COMMAND',
      description: 'Show detailed help for specific command',
    },
    {
      pattern: 'help topic TOPIC',
      description: 'Show help for specific topic category',
    },
    {
      pattern: 'help topics',
      description: 'List all available help topics',
    },
    {
      pattern: 'help search QUERY',
      description: 'Search help content for specified query',
    },
  ],
  options: [],
  examples: [
    {
      command: 'help',
      description: 'Show general help overview',
    },
    {
      command: 'help ls',
      description: 'Get detailed help for ls command',
    },
    {
      command: 'help topics',
      description: 'List available help topics',
    },
    {
      command: 'help topic files',
      description: 'Show help for file operations topic',
    },
    {
      command: 'help search text',
      description: 'Search for help content about text',
    },
  ],
  notes: [
    'Use "?" as a shortcut for the help command',
    'Topics organize commands by functional area',
    'Search function looks through all help content',
    'All commands have detailed help with examples',
  ],
  seeAlso: [],
}

/**
 * Complete help information for the 'jobs' command.
 */
export const JOBS_HELP: CommandHelpInfo = {
  name: 'jobs',
  summary: 'List active background jobs',
  description: [
    'Display information about active jobs. Shows job numbers, status,',
    'and commands for all jobs in the current session. Jobs are background',
    'processes started with & or moved to background with bg command.',
  ].join(' '),
  usage: [
    {
      pattern: 'jobs',
      description: 'List all active jobs with their status',
    },
  ],
  options: [],
  examples: [
    {
      command: 'jobs',
      description: 'Show all active background jobs',
      expectedOutput: '[1]+  Running                 sleep 30 &\n[2]-  Stopped                 vim file.txt',
    },
  ],
  seeAlso: ['fg', 'bg', 'disown'],
}

/**
 * Complete help information for the 'fg' command.
 */
export const FG_HELP: CommandHelpInfo = {
  name: 'fg',
  summary: 'Bring a job to the foreground',
  description: [
    'Move a background or stopped job to the foreground. If no job number is',
    'specified, brings the most recent job to the foreground. The job will',
    'resume execution and receive terminal input.',
  ].join(' '),
  usage: [
    {
      pattern: 'fg [job_spec]',
      description: 'Bring specified job or most recent job to foreground',
    },
  ],
  options: [],
  examples: [
    {
      command: 'fg',
      description: 'Bring most recent job to foreground',
      expectedOutput: 'sleep 30',
    },
    {
      command: 'fg %1',
      description: 'Bring job 1 to foreground',
      expectedOutput: 'vim file.txt',
    },
  ],
  seeAlso: ['jobs', 'bg', 'disown'],
}

/**
 * Complete help information for the 'bg' command.
 */
export const BG_HELP: CommandHelpInfo = {
  name: 'bg',
  summary: 'Put jobs in the background',
  description: [
    'Move stopped jobs to the background where they will continue running.',
    'If no job number is specified, operates on the most recent stopped job.',
    'Background jobs can continue executing while you use the shell.',
  ].join(' '),
  usage: [
    {
      pattern: 'bg [job_spec]',
      description: 'Move specified job or most recent stopped job to background',
    },
  ],
  options: [],
  examples: [
    {
      command: 'bg',
      description: 'Resume most recent stopped job in background',
      expectedOutput: '[1]+ sleep 30 &',
    },
    {
      command: 'bg %2',
      description: 'Resume job 2 in background',
      expectedOutput: '[2]+ vim file.txt &',
    },
  ],
  seeAlso: ['jobs', 'fg', 'disown'],
}

/**
 * Complete help information for the 'disown' command.
 */
export const DISOWN_HELP: CommandHelpInfo = {
  name: 'disown',
  summary: 'Remove jobs from the active job list',
  description: [
    'Remove jobs from the shell job table. Disowned jobs will continue',
    'running but will no longer be tracked by the shell. They cannot be',
    'brought back to foreground or managed with job control commands.',
  ].join(' '),
  usage: [
    {
      pattern: 'disown job_spec',
      description: 'Remove the specified job from job control',
    },
  ],
  options: [],
  examples: [
    {
      command: 'disown %1',
      description: 'Remove job 1 from job control',
      expectedOutput: 'Job 1 disowned',
    },
  ],
  seeAlso: ['jobs', 'fg', 'bg'],
}

/**
 * Complete help information for the 'config' command.
 */
export const CONFIG_HELP: CommandHelpInfo = {
  name: 'config',
  summary: 'Manage shell configuration and preferences',
  description: [
    'Manage shell configuration settings including appearance, behavior, security,',
    'and accessibility options. Configuration is automatically persisted across',
    'browser sessions and can be exported/imported as JSON.',
  ].join(' '),
  usage: [
    {
      pattern: 'config [SUBCOMMAND] [OPTIONS]',
      description: 'Manage configuration with various subcommands',
    },
    {
      pattern: 'config get <path>',
      description: 'Get configuration value at specified path',
    },
    {
      pattern: 'config set <path> <value>',
      description: 'Set configuration value at specified path',
    },
    {
      pattern: 'config list [--section SECTION]',
      description: 'List all or section-specific configuration',
    },
    {
      pattern: 'config reset [SECTION]',
      description: 'Reset configuration to defaults',
    },
  ],
  options: [
    {
      shortForm: '-h',
      longForm: '--help',
      description: 'Show detailed help information',
    },
    {
      longForm: '--section',
      hasParameter: true,
      parameterName: 'NAME',
      description: 'Target specific configuration section (appearance, behavior, etc.)',
    },
    {
      longForm: '--format',
      hasParameter: true,
      parameterName: 'FORMAT',
      description: 'Output format: text, json (default: text)',
    },
  ],
  examples: [
    {
      command: 'config',
      description: 'Show configuration status and available sections',
    },
    {
      command: 'config list',
      description: 'Show all configuration settings',
    },
    {
      command: 'config get appearance.theme',
      description: 'Get current terminal theme',
      expectedOutput: 'dark',
    },
    {
      command: 'config set appearance.fontSize 16',
      description: 'Set terminal font size to 16',
      expectedOutput: 'Configuration updated: appearance.fontSize = 16',
    },
    {
      command: 'config list --section appearance',
      description: 'Show only appearance settings',
    },
    {
      command: 'config reset appearance',
      description: 'Reset appearance settings to defaults',
    },
    {
      command: 'config validate',
      description: 'Check configuration validity',
    },
    {
      command: 'config export',
      description: 'Export configuration as JSON',
    },
  ],
  notes: [
    'Configuration paths use dot notation (e.g., appearance.theme, behavior.prompt.style)',
    'Available sections: appearance, behavior, security, accessibility, advanced',
    'Configuration is automatically saved when changed (unless auto-save is disabled)',
    'Values are automatically converted to appropriate types (string, number, boolean)',
  ],
  seeAlso: ['help', 'env'],
}

/**
 * Registry of all command help information.
 */
export const COMMAND_HELP_REGISTRY = new Map<string, CommandHelpInfo>([
  ['ls', LS_HELP],
  ['cd', CD_HELP],
  ['pwd', PWD_HELP],
  ['cat', CAT_HELP],
  ['echo', ECHO_HELP],
  ['clear', CLEAR_HELP],
  ['env', ENV_HELP],
  ['export', EXPORT_HELP],
  ['printenv', PRINTENV_HELP],
  ['unset', UNSET_HELP],
  ['which', WHICH_HELP],
  ['history', HISTORY_HELP],
  ['help', HELP_HELP],
  ['jobs', JOBS_HELP],
  ['fg', FG_HELP],
  ['bg', BG_HELP],
  ['disown', DISOWN_HELP],
  ['config', CONFIG_HELP],
])

/**
 * Get help information for a specific command.
 */
export function getCommandHelp(commandName: string): CommandHelpInfo | undefined {
  return COMMAND_HELP_REGISTRY.get(commandName)
}

/**
 * Get all available command help information.
 */
export function getAllCommandHelp(): CommandHelpInfo[] {
  return Array.from(COMMAND_HELP_REGISTRY.values())
}
