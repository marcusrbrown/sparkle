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
  ['help', HELP_HELP],
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
