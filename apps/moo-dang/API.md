# moo-dang API Documentation

This document provides comprehensive API documentation for the moo-dang WASM web shell application, including shell commands, WASM interfaces, and component APIs.

## Table of Contents

- [Shell Commands API](#shell-commands-api)
- [WASM Shell API](#wasm-shell-api)
- [React Component API](#react-component-api)
- [Web Worker API](#web-worker-api)
- [Virtual File System API](#virtual-file-system-api)
- [Configuration API](#configuration-api)
- [Error Handling](#error-handling)

## Shell Commands API

### Built-in Commands

All built-in commands follow Unix-like conventions and support standard options.

#### File System Commands

##### `ls` - List Directory Contents

**Syntax:** `ls [options] [path...]`

**Options:**

- `-a, --all`: Show hidden files (starting with '.')
- `-l, --long`: Use long listing format with detailed information
- `-h, --human-readable`: Show file sizes in human readable format
- `-R, --recursive`: List subdirectories recursively

**Examples:**

```bash
ls                    # List current directory
ls -la                # Long format with hidden files
ls -lh /examples      # Human readable sizes
ls -R                 # Recursive listing
```

**Return:** Exit code 0 on success, 1 on error

##### `cd` - Change Directory

**Syntax:** `cd [directory]`

**Behavior:**

- `cd` with no arguments: Change to home directory (/)
- `cd -`: Change to previous directory
- `cd ..`: Change to parent directory
- `cd path`: Change to specified directory

**Examples:**

```bash
cd /examples          # Change to /examples
cd ..                 # Go to parent directory
cd -                  # Return to previous directory
cd                    # Go to home directory
```

##### `pwd` - Print Working Directory

**Syntax:** `pwd`

**Examples:**

```bash
pwd                   # Output: /current/path
```

##### `mkdir` - Make Directories

**Syntax:** `mkdir [options] directory...`

**Options:**

- `-p, --parents`: Create parent directories as needed
- `-m, --mode`: Set file mode (permissions)

**Examples:**

```bash
mkdir new-folder      # Create directory
mkdir -p path/to/dir  # Create with parents
```

##### `touch` - Create Empty Files

**Syntax:** `touch file...`

**Examples:**

```bash
touch file.txt        # Create empty file
touch file1 file2     # Create multiple files
```

##### `rm` - Remove Files and Directories

**Syntax:** `rm [options] file...`

**Options:**

- `-r, -R, --recursive`: Remove directories recursively
- `-f, --force`: Force removal, ignore nonexistent files

**Examples:**

```bash
rm file.txt           # Remove file
rm -rf directory      # Remove directory recursively
```

##### `cp` - Copy Files

**Syntax:** `cp [options] source destination`

**Options:**

- `-r, -R, --recursive`: Copy directories recursively

**Examples:**

```bash
cp file.txt backup.txt    # Copy file
cp -r dir1 dir2           # Copy directory
```

##### `mv` - Move/Rename Files

**Syntax:** `mv source destination`

**Examples:**

```bash
mv old.txt new.txt        # Rename file
mv file.txt /path/        # Move file
```

#### Text Processing Commands

##### `cat` - Display File Contents

**Syntax:** `cat [file...]`

**Examples:**

```bash
cat file.txt              # Display file contents
cat file1 file2           # Display multiple files
cat                       # Read from stdin
```

##### `echo` - Display Text

**Syntax:** `echo [options] [string...]`

**Options:**

- `-n`: Do not output trailing newline
- `-e`: Enable interpretation of backslash escapes

**Examples:**

```bash
echo "Hello World"        # Output: Hello World
echo -n "No newline"      # No trailing newline
echo -e "Line 1\nLine 2"  # With escape sequences
```

##### `grep` - Search Text Patterns

**Syntax:** `grep [options] pattern [file...]`

**Options:**

- `-i, --ignore-case`: Case insensitive search
- `-v, --invert-match`: Invert match (show non-matching lines)
- `-n, --line-number`: Show line numbers
- `-c, --count`: Count matching lines

**Examples:**

```bash
grep "pattern" file.txt   # Search for pattern
grep -i "PATTERN" file    # Case insensitive
grep -n "error" log.txt   # With line numbers
ls | grep ".txt"          # Search command output
```

##### `wc` - Word, Line, Character Count

**Syntax:** `wc [options] [file...]`

**Options:**

- `-l, --lines`: Count lines only
- `-w, --words`: Count words only
- `-c, --chars`: Count characters only

**Examples:**

```bash
wc file.txt               # Full count (lines words chars)
wc -l file.txt            # Count lines only
cat file.txt | wc -w      # Count words via pipe
```

#### System Commands

##### `env` - Environment Variables

**Syntax:** `env [name=value...] [command]`

**Examples:**

```bash
env                       # Show all variables
env VAR=value command     # Set variable for command
```

##### `export` - Export Environment Variables

**Syntax:** `export name[=value]`

**Examples:**

```bash
export PATH="/new/path"   # Set and export variable
export EDITOR             # Export existing variable
```

##### `history` - Command History

**Syntax:** `history [n]`

**Examples:**

```bash
history                   # Show all history
history 10                # Show last 10 commands
```

##### `jobs` - Active Jobs

**Syntax:** `jobs`

**Examples:**

```bash
jobs                      # List background jobs
```

##### `clear` - Clear Terminal

**Syntax:** `clear`

##### `help` - Show Help Information

**Syntax:** `help [command|topic]`

**Topics:**

- `commands`: List all commands
- `wasm`: WASM executable information
- `pipes`: Pipe and redirection help
- `variables`: Environment variable help

**Examples:**

```bash
help                      # General help
help ls                   # Help for ls command
help wasm                 # WASM executable help
```

##### `exit` - Exit Shell

**Syntax:** `exit [code]`

**Examples:**

```bash
exit                      # Exit with code 0
exit 1                    # Exit with code 1
```

### Command Features

#### Pipes and Redirection

**Pipes (`|`)**: Connect command output to input of next command

```bash
ls | grep ".txt"          # List files, filter for .txt
cat file.txt | wc -l      # Count lines in file
```

**Output Redirection (`>`, `>>`)**: Redirect output to files

```bash
echo "Hello" > file.txt   # Write to file (overwrite)
echo "World" >> file.txt  # Append to file
```

**Input Redirection (`<`)**: Redirect file content to command input

```bash
wc -l < file.txt          # Count lines from file
```

#### Variable Expansion

**Variable Syntax**: `$VAR` or `${VAR}`

```bash
export NAME="moo-dang"
echo "Welcome to $NAME"   # Output: Welcome to moo-dang
echo "Shell: ${NAME}"     # Output: Shell: moo-dang
```

#### Command Chaining

**AND (`&&`)**: Execute next command if previous succeeds

```bash
mkdir test && cd test     # Create and enter directory
```

**OR (`||`)**: Execute next command if previous fails

```bash
cd /invalid || echo "Failed to change directory"
```

**Sequential (`;`)**: Execute commands sequentially

```bash
echo "First"; echo "Second"; echo "Third"
```

#### Background Jobs (`&`)

```bash
sleep 10 &                # Run command in background
jobs                      # List active background jobs
```

## WASM Shell API

The WASM Shell API provides a comprehensive interface for Zig programs to interact with the shell environment.

### Core Functions

#### Output Functions

##### `print(text: []const u8)`

Print text to stdout without newline.

```zig
const shell = @import("shell_api.zig");
shell.print("Hello World");
```

##### `println(text: []const u8)`

Print text to stdout with newline.

```zig
shell.println("Hello World");
// Output: "Hello World\n"
```

##### `eprint(text: []const u8)`

Print text to stderr without newline.

```zig
shell.eprint("Error occurred");
```

##### `eprintln(text: []const u8)`

Print text to stderr with newline.

```zig
shell.eprintln("Error occurred");
```

#### Input/Arguments

##### `getArgs() [][]const u8`

Get command-line arguments passed to the program.

```zig
const args = shell.getArgs();
// args[0] is the program name
// args[1..] are the arguments
for (args, 0..) |arg, i| {
    shell.print("Arg ");
    shell.print(@intCast(i));
    shell.print(": ");
    shell.println(arg);
}
```

##### `getArgCount() u32`

Get the number of command-line arguments.

```zig
const argc = shell.getArgCount();
if (argc < 2) {
    shell.eprintln("Usage: program <arg>");
    shell.exit(1);
}
```

#### Environment Variables

##### `getEnv(name: []const u8) ?[]const u8`

Get environment variable value.

```zig
const home = shell.getEnv("HOME") orelse "/";
shell.print("Home directory: ");
shell.println(home);
```

##### `setEnv(name: []const u8, value: []const u8) void`

Set environment variable.

```zig
shell.setEnv("MY_VAR", "my_value");
```

##### `unsetEnv(name: []const u8) void`

Unset environment variable.

```zig
shell.unsetEnv("TEMP_VAR");
```

#### File System Operations

##### `readFile(path: []const u8) ![]u8`

Read entire file contents.

```zig
const content = shell.readFile("/path/to/file.txt") catch |err| {
    shell.eprintln("Failed to read file");
    shell.exit(1);
    return;
};
defer shell.free(content);
shell.println(content);
```

##### `writeFile(path: []const u8, content: []const u8) !void`

Write content to file.

```zig
const data = "Hello, World!";
shell.writeFile("/path/to/output.txt", data) catch |err| {
    shell.eprintln("Failed to write file");
    shell.exit(1);
    return;
};
```

##### `fileExists(path: []const u8) bool`

Check if file exists.

```zig
if (shell.fileExists("/path/to/file")) {
    shell.println("File exists");
} else {
    shell.println("File not found");
}
```

##### `isDirectory(path: []const u8) bool`

Check if path is a directory.

```zig
if (shell.isDirectory("/path")) {
    shell.println("Is a directory");
}
```

##### `listDirectory(path: []const u8) ![][]const u8`

List directory contents.

```zig
const entries = shell.listDirectory("/path") catch |err| {
    shell.eprintln("Failed to list directory");
    shell.exit(1);
    return;
};
defer shell.freeStringArray(entries);

for (entries) |entry| {
    shell.println(entry);
}
```

#### Working Directory

##### `getCwd() []const u8`

Get current working directory.

```zig
const cwd = shell.getCwd();
shell.print("Current directory: ");
shell.println(cwd);
```

##### `setCwd(path: []const u8) !void`

Set current working directory.

```zig
shell.setCwd("/new/path") catch |err| {
    shell.eprintln("Failed to change directory");
    shell.exit(1);
};
```

#### Process Control

##### `exit(code: i32)`

Exit program with status code.

```zig
if (error_condition) {
    shell.exit(1);  // Exit with error
}
shell.exit(0);      // Exit successfully
```

##### `sleep(ms: u32)`

Sleep for specified milliseconds.

```zig
shell.println("Waiting...");
shell.sleep(1000);  // Sleep for 1 second
shell.println("Done!");
```

#### Memory Management

##### `alloc(size: usize) []u8`

Allocate memory.

```zig
const buffer = shell.alloc(1024);
defer shell.free(buffer);
// Use buffer...
```

##### `free(ptr: []u8)`

Free allocated memory.

```zig
const data = shell.alloc(100);
// Use data...
shell.free(data);
```

### Error Handling

WASM functions that can fail return Zig error unions:

```zig
const FileError = error{
    NotFound,
    PermissionDenied,
    IoError,
};

// Handle errors appropriately
const content = shell.readFile("file.txt") catch |err| switch (err) {
    FileError.NotFound => {
        shell.eprintln("File not found");
        shell.exit(1);
        return;
    },
    FileError.PermissionDenied => {
        shell.eprintln("Permission denied");
        shell.exit(1);
        return;
    },
    else => {
        shell.eprintln("Unknown error");
        shell.exit(1);
        return;
    },
};
```

### Example Programs

#### Hello World

```zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    shell.println("Hello, World!");
    shell.exit(0);
}
```

#### Echo Command

```zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();

    if (args.len < 2) {
        shell.eprintln("Usage: echo [text...]");
        shell.exit(1);
        return;
    }

    for (args[1..], 0..) |arg, i| {
        if (i > 0) shell.print(" ");
        shell.print(arg);
    }
    shell.println("");
    shell.exit(0);
}
```

#### File Processing

```zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();

    if (args.len < 2) {
        shell.eprintln("Usage: cat <file>");
        shell.exit(1);
        return;
    }

    const filename = args[1];
    const content = shell.readFile(filename) catch |err| {
        shell.eprint("cat: ");
        shell.eprint(filename);
        shell.eprintln(": No such file or directory");
        shell.exit(1);
        return;
    };
    defer shell.free(content);

    shell.print(content);
    shell.exit(0);
}
```

## React Component API

### Terminal Component

The main terminal interface component.

#### Props

```typescript
interface TerminalProps {
  /** Initial theme for the terminal */
  theme?: 'light' | 'dark' | 'auto'
  /** Callback when command is executed */
  onCommand?: (command: string) => void
  /** Callback when terminal is ready */
  onReady?: () => void
  /** Initial working directory */
  initialCwd?: string
  /** Custom CSS class name */
  className?: string
}
```

#### Usage

```tsx
import {Terminal} from '@/components/Terminal'

function App() {
  const handleCommand = (command: string) => {
    console.log('Command executed:', command)
  }

  return (
    <Terminal
      theme="dark"
      onCommand={handleCommand}
      onReady={() => console.log('Terminal ready')}
      initialCwd="/examples"
    />
  )
}
```

### CommandTerminal Component

Enhanced terminal with command processing capabilities.

#### Props

```typescript
interface CommandTerminalProps extends TerminalProps {
  /** Worker instance for command processing */
  worker: Worker
  /** Enable accessibility features */
  accessibility?: boolean
  /** Custom command prompt */
  prompt?: string
}
```

### Theme Utilities

#### `convertTheme(theme: ThemeConfig): ITheme`

Convert Sparkle theme to xterm.js theme format.

```tsx
import {useTheme} from '@sparkle/theme'
import {convertTheme} from '@/components/theme-utils'

function TerminalWrapper() {
  const {theme} = useTheme()
  const xtermTheme = convertTheme(theme)

  return <Terminal theme={xtermTheme} />
}
```

## Web Worker API

### Message Interface

#### Request Messages

```typescript
interface ShellWorkerRequest {
  id: string
  type: 'command' | 'interrupt' | 'resize' | 'init'
  data: {
    command?: string
    cols?: number
    rows?: number
    cwd?: string
    env?: Record<string, string>
  }
}
```

#### Response Messages

```typescript
interface ShellWorkerResponse {
  id: string
  type: 'output' | 'error' | 'exit' | 'ready'
  data: {
    output?: string
    error?: string
    exitCode?: number
    cwd?: string
  }
}
```

### Usage Example

```typescript
// Create worker
const worker = new Worker('/shell.worker.js')

// Send command
worker.postMessage({
  id: 'cmd-1',
  type: 'command',
  data: {
    command: 'ls -la',
    cwd: '/current/directory'
  }
})

// Handle response
worker.onmessage = (event) => {
  const response: ShellWorkerResponse = event.data

  switch (response.type) {
    case 'output':
      console.log('Output:', response.data.output)
      break
    case 'error':
      console.error('Error:', response.data.error)
      break
    case 'exit':
      console.log('Exit code:', response.data.exitCode)
      break
  }
}
```

## Virtual File System API

### File System Operations

#### `FileSystem` Interface

```typescript
interface FileSystem {
  /** Read file contents */
  readFile: (path: string) => Promise<string>

  /** Write file contents */
  writeFile: (path: string, content: string) => Promise<void>

  /** Check if file exists */
  exists: (path: string) => Promise<boolean>

  /** Get file stats */
  stat: (path: string) => Promise<FileStats>

  /** List directory contents */
  readdir: (path: string) => Promise<string[]>

  /** Create directory */
  mkdir: (path: string, options?: {recursive?: boolean}) => Promise<void>

  /** Remove file or directory */
  remove: (path: string, options?: {recursive?: boolean}) => Promise<void>

  /** Copy file */
  copy: (src: string, dest: string) => Promise<void>

  /** Move/rename file */
  move: (src: string, dest: string) => Promise<void>
}
```

#### `FileStats` Interface

```typescript
interface FileStats {
  /** File size in bytes */
  size: number

  /** Is directory */
  isDirectory: boolean

  /** Is regular file */
  isFile: boolean

  /** Creation time */
  createdAt: Date

  /** Last modified time */
  modifiedAt: Date

  /** File permissions */
  mode: number
}
```

## Configuration API

### Shell Configuration

#### `ShellConfig` Interface

```typescript
interface ShellConfig {
  /** Default shell prompt */
  prompt: string

  /** Command history size */
  historySize: number

  /** Enable tab completion */
  completion: boolean

  /** Default environment variables */
  env: Record<string, string>

  /** Command timeout in milliseconds */
  timeout: number

  /** WASM module cache size */
  wasmCacheSize: number
}
```

#### Default Configuration

```typescript
const defaultConfig: ShellConfig = {
  prompt: '$ ',
  historySize: 1000,
  completion: true,
  env: {
    PATH: '/bin:/usr/bin',
    HOME: '/',
    USER: 'user',
    SHELL: '/bin/moo-dang'
  },
  timeout: 30000,
  wasmCacheSize: 10
}
```

### Theme Configuration

#### Terminal Theme Options

```typescript
interface TerminalTheme {
  /** Background color */
  background: string

  /** Foreground color */
  foreground: string

  /** Cursor color */
  cursor: string

  /** Selection background */
  selectionBackground: string

  /** ANSI color palette */
  colors: {
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    white: string
    brightBlack: string
    brightRed: string
    brightGreen: string
    brightYellow: string
    brightBlue: string
    brightMagenta: string
    brightCyan: string
    brightWhite: string
  }
}
```

## Error Handling

### Error Types

#### `ShellError`

```typescript
class ShellError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode = 1
  ) {
    super(message)
    this.name = 'ShellError'
  }
}
```

#### `WasmError`

```typescript
class WasmError extends Error {
  constructor(
    message: string,
    public readonly module: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'WasmError'
  }
}
```

#### `FileSystemError`

```typescript
class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'FileSystemError'
  }
}
```

### Error Handling Patterns

#### Command Execution

```typescript
try {
  const result = await executeCommand('ls /nonexistent')
} catch (error) {
  if (error instanceof ShellError) {
    console.error(`Command failed: ${error.message} (${error.code})`)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

#### WASM Module Loading

```typescript
try {
  const module = await loadWasmModule('hello.wasm')
  const result = await module.execute(['hello'])
} catch (error) {
  if (error instanceof WasmError) {
    console.error(`WASM error in ${error.module}: ${error.message}`)
  } else {
    console.error('Failed to load WASM module:', error)
  }
}
```

#### File Operations

```typescript
try {
  const content = await fs.readFile('/path/to/file')
} catch (error) {
  if (error instanceof FileSystemError) {
    console.error(`File operation ${error.operation} failed on ${error.path}: ${error.message}`)
  } else {
    console.error('Unexpected file system error:', error)
  }
}
```

This API documentation provides comprehensive coverage of all public interfaces in the moo-dang shell application. For implementation details and examples, refer to the source code and other documentation files.
