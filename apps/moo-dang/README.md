# moo-dang: WASM Web Shell

> A powerful WASM-based web shell application built with React, TypeScript, and Zig

[![Status: Complete](https://img.shields.io/badge/status-Complete-green)](/.ai/plan/feature-moo-dang-shell-1.md) [![Tests](https://img.shields.io/badge/tests-446%20passing-brightgreen)](#-testing) [![Type Safety](https://img.shields.io/badge/typescript-strict-blue)](#%EF%B8%8F-development)

moo-dang is a sophisticated web-based shell environment that combines modern web technologies with WebAssembly for a native-like terminal experience. It features a complete Unix-like shell implementation running in Web Workers, support for Zig-compiled WASM executables, and comprehensive integration with the Sparkle design system.

## ✨ Features

### 🖥️ Complete Shell Environment

- Full Unix-like shell with pipes, redirection, and command chaining
- Built-in commands: `ls`, `cd`, `pwd`, `cat`, `echo`, `mkdir`, `touch`, `rm`, and more
- Environment variable support with expansion (`$VAR` and `${VAR}` syntax)
- Command history with search and navigation
- Tab completion for commands, files, and directories

### 🔧 WASM Executable Support

- Run Zig-compiled WebAssembly programs natively in the shell
- Comprehensive shell API for WASM programs
- Secure execution in isolated Web Workers
- Standard input/output and error handling
- Command-line argument and environment variable passing

### 🎨 Modern UI/UX

- Terminal interface powered by xterm.js
- Full integration with Sparkle theme system (light/dark themes)
- Keyboard shortcuts and accessibility features
- Responsive design for desktop and mobile
- Screen reader support and ARIA compliance

### 🚀 Developer Experience

- TypeScript-first development with strict type safety
- Comprehensive test suite (446+ tests)
- Hot reload for both shell logic and WASM programs
- Detailed error messages and debugging tools
- Extensive documentation and examples

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for development dependencies)
- **pnpm** (package manager used by Sparkle monorepo)
- **Zig** 0.11+ (for WASM executable development)

### Installation

```bash
# Clone the Sparkle repository
git clone https://github.com/marcusrbrown/sparkle.git
cd sparkle

# Install dependencies
pnpm install

# Build and start moo-dang
pnpm --filter moo-dang dev
```

The shell will be available at `http://localhost:5173`

### First Steps

1. **Try basic commands:**

   ```bash
   ls          # List files
   pwd         # Show current directory
   echo "Hello World"  # Print text
   ```

2. **Explore the file system:**

   ```bash
   cd /examples
   ls -la
   cat hello.txt
   ```

3. **Run WASM executables:**

   ```bash
   hello       # Run hello.wasm
   echo arg1 arg2 arg3  # Run echo.wasm with arguments
   ```

4. **Use advanced features:**

   ```bash
   ls | grep txt     # Pipe output
   echo "test" > file.txt  # Redirect output
   export VAR=value  # Set environment variables
   ```

## 📖 Usage Examples

### Basic Shell Operations

```bash
# Directory navigation
pwd                    # /
cd /examples          # Change to examples directory
ls                    # List contents
cd ..                 # Go back

# File operations
cat README.md         # Display file contents
echo "Hello" > test.txt  # Write to file
cat test.txt          # Read the file
rm test.txt           # Delete file

# Environment variables
export NAME="moo-dang"
echo "Welcome to $NAME shell"
env                   # List all variables
```

### Working with WASM Programs

```bash
# Run built-in WASM executables
hello                 # Simple greeting
echo "Hello World"    # Echo arguments
cat /examples/data.txt  # Process files

# Check available executables
help wasm            # List WASM commands
which hello          # Show executable location
```

### Advanced Shell Features

```bash
# Command chaining and pipes
ls /examples | grep ".txt" | wc -l
echo "Line 1" && echo "Line 2" || echo "Failed"

# History and completion
history              # Show command history
# Use ↑/↓ arrows to navigate history
# Press Tab for command/file completion

# Job control (simulated)
sleep 5 &           # Background process
jobs                # List active jobs
```

## 🏗️ Architecture

moo-dang follows a modular architecture designed for security, performance, and maintainability:

```text
┌─────────────────────────────────────────────────────┐
│                   React App                         │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │   Terminal UI       │  │   Theme Provider     │   │
│  │   (xterm.js)       │  │   (Sparkle Theme)   │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                     │                               │
│              Web Worker API                         │
└─────────────────────┼───────────────────────────────┘
                     │
┌─────────────────────┼───────────────────────────────┐
│              Shell Web Worker                       │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │   Command Parser    │  │   Virtual File Sys  │   │
│  └─────────────────────┘  └─────────────────────┘   │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │   WASM Loader       │  │   Built-in Commands │   │
│  └─────────────────────┘  └─────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                     │
┌─────────────────────┼───────────────────────────────┐
│              WASM Executables                       │
│                (Zig Programs)                       │
└─────────────────────────────────────────────────────┘
```

### Key Components

- **Terminal UI**: React components with xterm.js integration
- **Shell Worker**: Isolated Web Worker running the shell environment
- **WASM Loader**: Dynamic loading and execution of WebAssembly modules
- **Virtual File System**: In-memory file system with persistence
- **Command System**: Extensible built-in command implementation

For detailed architectural documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server with hot reload
pnpm dev:watch        # Watch mode with WASM rebuilding
pnpm build            # Build for production

# Testing
pnpm test             # Run test suite
pnpm test:watch       # Watch mode testing
pnpm test:wasm        # Test Zig WASM code

# WASM Development
pnpm build:wasm       # Build all WASM executables
pnpm generate:wasm    # Generate new WASM executable template

# Quality Assurance
pnpm lint             # ESLint checking
pnpm build:types      # TypeScript type checking
```

### Project Structure

```text
apps/moo-dang/
├── src/
│   ├── components/          # React UI components
│   │   ├── Terminal.tsx     # Main terminal interface
│   │   ├── CommandTerminal.tsx
│   │   └── theme-utils.ts   # Sparkle theme integration
│   ├── shell/              # Shell implementation
│   │   ├── commands.ts     # Built-in commands
│   │   ├── parser.ts       # Command parsing
│   │   ├── virtual-file-system.ts
│   │   └── wasm-loader.ts  # WASM module handling
│   ├── wasm/               # Zig WASM development
│   │   ├── src/shell_api.zig
│   │   ├── examples/       # Example programs
│   │   └── build.zig
│   ├── workers/            # Web Worker implementations
│   └── App.tsx             # Main application
├── test/                   # Test files
├── scripts/                # Build and utility scripts
└── package.json
```

For comprehensive development documentation, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## 🧪 Testing

moo-dang includes a comprehensive test suite covering all aspects of the application:

- **446+ tests** with 100% pass rate
- **Unit Tests**: Component behavior, shell logic, WASM integration
- **Integration Tests**: Web Worker communication, file system operations
- **End-to-End Tests**: Complete user workflows and accessibility
- **Visual Regression Tests**: UI consistency across themes and viewports

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Test specific components
pnpm test -- Terminal
pnpm test -- shell

# Test WASM code
pnpm test:wasm
```

### Test Coverage

- Terminal components and theme integration
- Shell command parsing and execution
- WASM module loading and communication
- Virtual file system operations
- Command completion and history
- Error handling and recovery
- Accessibility features

## 📚 API Documentation

### Shell Commands

The shell provides comprehensive built-in commands with Unix-like behavior:

| Command   | Description              | Usage Example             |
| --------- | ------------------------ | ------------------------- |
| `ls`      | List directory contents  | `ls -la /examples`        |
| `cd`      | Change directory         | `cd /home/user`           |
| `pwd`     | Print working directory  | `pwd`                     |
| `cat`     | Display file contents    | `cat file.txt`            |
| `echo`    | Print text               | `echo "Hello World"`      |
| `mkdir`   | Create directory         | `mkdir new-folder`        |
| `touch`   | Create empty file        | `touch file.txt`          |
| `rm`      | Remove files/directories | `rm -rf folder`           |
| `cp`      | Copy files               | `cp src dest`             |
| `mv`      | Move/rename files        | `mv old new`              |
| `grep`    | Search text patterns     | `grep "pattern" file.txt` |
| `wc`      | Count lines/words/chars  | `wc -l file.txt`          |
| `env`     | Environment variables    | `env`, `export VAR=value` |
| `history` | Command history          | `history`, `!n`           |
| `help`    | Show help                | `help`, `help command`    |
| `clear`   | Clear terminal           | `clear`                   |
| `exit`    | Exit shell               | `exit [code]`             |

### WASM Executable API

WASM programs have access to a comprehensive shell API through the `shell_api.zig` module:

```zig
// Basic I/O operations
shell.print("Hello World");
shell.println("Hello with newline");
shell.eprint("Error message");

// Command-line arguments
const args = shell.getArgs();
for (args) |arg| {
    shell.print(arg);
}

// Environment variables
const home = shell.getEnv("HOME");
shell.setEnv("VAR", "value");

// File system operations
const content = try shell.readFile("/path/to/file");
try shell.writeFile("/path/to/output", "content");

// Exit with status code
shell.exit(0);
```

For complete API documentation, see [API.md](./API.md).

## 🎯 Examples and Tutorials

### Example 1: Creating a Custom WASM Command

```zig
// src/wasm/examples/custom.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();

    if (args.len < 2) {
        shell.eprint("Usage: custom <name>");
        shell.exit(1);
        return;
    }

    shell.print("Hello, ");
    shell.print(args[1]);
    shell.println("!");
    shell.exit(0);
}
```

### Example 2: Complex Shell Workflow

```bash
# Set up environment
export PROJECT="moo-dang"
mkdir /workspace/$PROJECT
cd /workspace/$PROJECT

# Create and process files
echo "# Project: $PROJECT" > README.md
echo "Description here" >> README.md
cat README.md | wc -l

# Use pipes and redirection
ls /examples | grep ".zig" > zig-files.txt
cat zig-files.txt | wc -l
```

For more examples and tutorials, see [EXAMPLES.md](./EXAMPLES.md).

## 🤝 Contributing

We welcome contributions to moo-dang! Please see our [development guide](./DEVELOPMENT.md) for:

- Setting up the development environment
- Code style and conventions
- Testing requirements
- Pull request process

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-command`
3. Make your changes with tests
4. Run the full test suite: `pnpm test`
5. Submit a pull request

## 🛡️ Security

- WASM executables run in isolated Web Workers for security
- No access to system resources outside the virtual environment
- All file system operations are contained within the virtual file system
- Command execution is sandboxed and memory-safe

## 📊 Performance

- **Cold Start**: ~200ms for shell initialization
- **Command Execution**: <10ms for built-in commands
- **WASM Loading**: ~50ms for typical executables
- **Memory Usage**: ~2MB base + program overhead
- **File System**: In-memory with localStorage persistence

## 🐛 Troubleshooting

### Common Issues

**Shell not loading:**

```bash
# Check if WASM build succeeded
pnpm build:wasm
# Restart development server
pnpm dev
```

**WASM executable not found:**

```bash
# Verify executable was built
ls src/wasm/zig-out/bin/
# Rebuild WASM programs
pnpm build:wasm:clean && pnpm build:wasm
```

**Type errors during development:**

```bash
# Run type checking
pnpm build:types
# Check for missing dependencies
pnpm install
```

## 📄 License

This project is part of the Sparkle monorepo and follows the same licensing terms. See [LICENSE.md](../../LICENSE.md) for details.

## 🙏 Acknowledgments

- **xterm.js** for the excellent terminal emulation
- **Zig** for WebAssembly compilation capabilities
- **Sparkle Design System** for UI components and theming
- **React** and **TypeScript** for the development foundation

---

Happy shell scripting! 🐚

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/marcusrbrown/sparkle).
