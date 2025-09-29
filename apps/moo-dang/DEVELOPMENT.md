# moo-dang Development Guide

This guide provides comprehensive information for developers working on the moo-dang WASM web shell application.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Guide](#testing-guide)
- [WASM Development](#wasm-development)
- [Code Style and Conventions](#code-style-and-conventions)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)
- [Contributing Guidelines](#contributing-guidelines)
- [Release Process](#release-process)

## Development Environment Setup

### Prerequisites

1. **Node.js 18+**: Required for all JavaScript/TypeScript development

   ```bash
   # Check version
   node --version  # Should be 18.x or higher
   ```

2. **pnpm**: Package manager used by the Sparkle monorepo

   ```bash
   # Install pnpm globally
   npm install -g pnpm

   # Verify installation
   pnpm --version
   ```

3. **Zig 0.11+**: Required for WASM executable development

   ```bash
   # Install Zig from https://ziglang.org/download/
   # Or using a package manager:

   # macOS with Homebrew
   brew install zig

   # Linux with snap
   sudo snap install zig --classic --beta

   # Verify installation
   zig version  # Should be 0.11.x or higher
   ```

4. **Git**: For version control
   ```bash
   git --version
   ```

### Initial Setup

1. **Clone the Sparkle repository:**

   ```bash
   git clone https://github.com/marcusrbrown/sparkle.git
   cd sparkle
   ```

2. **Install dependencies:**

   ```bash
   # Install all workspace dependencies
   pnpm install
   ```

3. **Verify moo-dang setup:**

   ```bash
   # Navigate to moo-dang directory
   cd apps/moo-dang

   # Build WASM executables
   pnpm build:wasm

   # Run tests to verify setup
   pnpm test

   # Start development server
   pnpm dev
   ```

4. **Verify shell functionality:**
   - Open `http://localhost:5173` in your browser
   - Try basic commands: `ls`, `pwd`, `echo "Hello World"`
   - Test WASM executables: `hello`, `echo arg1 arg2`

### VS Code Setup (Recommended)

1. **Install recommended extensions:**
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier
   - Zig Language

2. **Configure workspace settings:**
   ```json
   {
     "typescript.preferences.importModuleSpecifier": "relative",
     "eslint.workingDirectories": ["apps/moo-dang"],
     "zig.initialSetupDone": true
   }
   ```

## Project Structure

### Directory Organization

```text
apps/moo-dang/
├── src/                     # Source code
│   ├── components/          # React UI components
│   │   ├── Terminal.tsx     # Main terminal interface
│   │   ├── CommandTerminal.tsx
│   │   ├── CompletionDisplay.tsx
│   │   ├── AccessibilityProvider.tsx
│   │   ├── theme-utils.ts   # Theme integration utilities
│   │   └── index.ts         # Component exports
│   │
│   ├── shell/              # Shell implementation
│   │   ├── commands.ts     # Built-in shell commands
│   │   ├── parser.ts       # Command parsing logic
│   │   ├── pipeline.ts     # Command pipeline execution
│   │   ├── environment.ts  # Environment variables
│   │   ├── virtual-file-system.ts  # In-memory file system
│   │   ├── wasm-loader.ts  # WASM module management
│   │   ├── wasm-commands.ts # WASM command integration
│   │   ├── history-manager.ts      # Command history
│   │   ├── completion-engine.ts    # Tab completion
│   │   ├── job-controller.ts       # Background jobs
│   │   ├── config-manager.ts       # Configuration
│   │   └── types.ts        # Type definitions
│   │
│   ├── wasm/               # Zig WASM development
│   │   ├── build.zig       # Build configuration
│   │   ├── src/
│   │   │   └── shell_api.zig       # Shell API for WASM
│   │   ├── examples/       # Example WASM programs
│   │   │   ├── hello.zig
│   │   │   ├── echo.zig
│   │   │   └── cat.zig
│   │   └── zig-out/        # Build output (generated)
│   │
│   ├── workers/            # Web Worker implementations
│   │   └── shell.worker.ts # Shell Web Worker
│   │
│   ├── utils/              # Utility functions
│   ├── hooks/              # React hooks
│   ├── App.tsx             # Main React application
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
│
├── test/                   # Test files (mirrors src structure)
├── scripts/                # Build and utility scripts
│   ├── build-wasm.sh       # WASM build script
│   └── generate-wasm-executable.sh
├── public/                 # Static assets
├── package.json           # Package configuration
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

### Key Files

- **`src/App.tsx`**: Main React application with theme and worker management
- **`src/workers/shell.worker.ts`**: Web Worker containing shell logic
- **`src/shell/commands.ts`**: Implementation of all built-in shell commands
- **`src/wasm/src/shell_api.zig`**: API interface for WASM executables
- **`package.json`**: Scripts and dependencies for development
- **`vite.config.ts`**: Build configuration with Web Worker and WASM support

## Development Workflow

### Daily Development Commands

```bash
# Start development with hot reload
pnpm dev

# Run in watch mode with WASM rebuilding
pnpm dev:watch

# Run tests in watch mode
pnpm test:watch

# Build everything for production
pnpm build

# Run linter
pnpm lint

# Type check only
pnpm build:types
```

### Feature Development Process

1. **Create Feature Branch:**

   ```bash
   git checkout -b feature/new-shell-command
   ```

2. **Implement Feature:**
   - Add/modify code in appropriate directories
   - Follow existing patterns and conventions
   - Add comprehensive tests

3. **Test Implementation:**

   ```bash
   # Run all tests
   pnpm test

   # Test specific functionality
   pnpm test -- YourNewFeature

   # Test WASM if applicable
   pnpm test:wasm
   ```

4. **Quality Assurance:**

   ```bash
   # Lint code
   pnpm lint

   # Type check
   pnpm build:types

   # Build verification
   pnpm build
   ```

5. **Commit and Push:**
   ```bash
   git add .
   git commit -m "feat: add new shell command"
   git push origin feature/new-shell-command
   ```

### Hot Reload Development

The development server supports hot reload for:

- React components and UI changes
- Shell logic modifications
- WASM executables (with `dev:watch`)
- CSS and styling changes

**Note**: WASM changes require rebuild. Use `pnpm dev:watch` for automatic WASM rebuilding.

## Testing Guide

### Test Structure

Tests are organized to mirror the source structure:

```text
src/
├── components/
│   ├── Terminal.tsx
│   └── Terminal.test.tsx        # Component tests
├── shell/
│   ├── commands.ts
│   ├── commands.test.ts         # Unit tests
│   ├── wasm-integration.test.ts # Integration tests
│   └── parser.test.ts
└── shell-e2e.test.tsx          # End-to-end tests
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Run specific test files
pnpm test -- Terminal
pnpm test -- commands
pnpm test -- wasm

# Test with coverage
pnpm test -- --coverage

# Test WASM code specifically
pnpm test:wasm
```

### Writing Tests

#### Component Tests

```tsx
// src/components/Terminal.test.tsx
import {render, screen} from '@testing-library/react'
import {Terminal} from './Terminal'

describe('Terminal Component', () => {
  it('should render terminal interface', () => {
    render(<Terminal />)
    expect(screen.getByRole('application')).toBeInTheDocument()
  })
})
```

#### Shell Logic Tests

```typescript
// src/shell/commands.test.ts
import {commands} from './commands'

describe('Shell Commands', () => {
  it('should list directory contents', async () => {
    const result = await commands.ls([], mockContext)
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('README.md')
  })
})
```

#### WASM Integration Tests

```typescript
// src/shell/wasm-integration.test.ts
import {loadWasmModule} from './wasm-loader'

describe('WASM Integration', () => {
  it('should load and execute WASM module', async () => {
    const module = await loadWasmModule('/hello.wasm')
    const result = await module.execute(['hello'])
    expect(result).toContain('Hello, World!')
  })
})
```

### Test Best Practices

- **Test Behavior, Not Implementation**: Focus on what the component/function does
- **Use Descriptive Test Names**: Clearly state what is being tested
- **Mock External Dependencies**: Use proper mocks for Web Workers, fetch, etc.
- **Test Edge Cases**: Include error conditions and boundary values
- **Maintain Test Isolation**: Each test should be independent

## WASM Development

### Zig Development Setup

1. **Understand the Shell API:**

   ```zig
   // src/wasm/src/shell_api.zig provides:
   const shell = @import("shell_api.zig");

   shell.print("Hello");           // Print to stdout
   shell.println("Hello");         // Print with newline
   shell.eprint("Error");          // Print to stderr
   shell.getArgs();               // Get command arguments
   shell.getEnv("VAR");           // Get environment variable
   shell.setEnv("VAR", "value");  // Set environment variable
   shell.readFile("/path");       // Read file contents
   shell.writeFile("/path", data); // Write file
   shell.exit(0);                 // Exit with status code
   ```

2. **Create New WASM Executable:**

   ```bash
   # Use the generator script
   pnpm generate:wasm my-new-command

   # Or manually create in src/wasm/examples/
   touch src/wasm/examples/my-command.zig
   ```

3. **Basic Program Structure:**

   ```zig
   const shell = @import("../src/shell_api.zig");

   pub fn main() void {
       const args = shell.getArgs();

       if (args.len < 2) {
           shell.eprint("Usage: my-command <argument>");
           shell.exit(1);
           return;
       }

       shell.print("Processing: ");
       shell.println(args[1]);
       shell.exit(0);
   }
   ```

### Building WASM Programs

```bash
# Build all WASM executables
pnpm build:wasm

# Build specific executable
cd src/wasm
zig build-exe examples/my-command.zig -target wasm32-freestanding -O ReleaseSmall

# Clean build artifacts
pnpm build:wasm:clean
```

### WASM Development Best Practices

- **Memory Management**: Use appropriate allocators for dynamic memory
- **Error Handling**: Always check return values and handle errors gracefully
- **Shell API Usage**: Use provided shell API instead of direct system calls
- **Performance**: Optimize for size with `-O ReleaseSmall`
- **Testing**: Write Zig tests using `zig build test`

### Debugging WASM Programs

```bash
# Build with debug symbols
zig build-exe examples/my-command.zig -target wasm32-freestanding -O Debug

# Use browser developer tools to inspect WASM execution
# Add logging via shell.eprint() for debugging output
```

## Code Style and Conventions

### TypeScript/JavaScript Style

- **Use TypeScript strict mode**: All code must pass strict type checking
- **Function-based architecture**: Prefer functions over classes
- **Explicit return types**: Always specify return types for functions
- **No any types**: Use proper TypeScript types or unknown
- **Import organization**: Group imports (external, internal, relative)

```typescript
// Good
export function parseCommand(input: string): ParsedCommand {
  // Implementation
}

// Avoid
export function parseCommand(input: any) {
  // Implementation
}
```

### React Component Style

- **Functional Components**: Use function components with hooks
- **TypeScript Props**: Always type component props
- **Forward Refs**: Use forwardRef for components that need refs
- **Hook Dependencies**: Properly specify useEffect dependencies

```typescript
// Good
interface TerminalProps {
  onCommand: (command: string) => void
  theme?: 'light' | 'dark'
}

export function Terminal({onCommand, theme = 'light'}: TerminalProps): ReactElement {
  // Implementation
}
```

### File Organization

- **Index Files**: Use index.ts for clean imports
- **Type Definitions**: Co-locate types with implementation
- **Test Files**: Place tests next to source files (.test.ts)
- **Naming**: Use descriptive, consistent file names

### Documentation Style

- **JSDoc Comments**: Document all public APIs
- **Explain Why**: Focus on reasoning, not implementation details
- **Code Examples**: Include usage examples in documentation
- **Keep Updated**: Ensure docs reflect current implementation

```typescript
/**
 * Parses a shell command line into executable components.
 *
 * Handles complex parsing including quotes, pipes, redirection,
 * and variable expansion according to POSIX shell standards.
 *
 * @param commandLine - Raw command input from user
 * @returns Parsed command structure ready for execution
 * @throws {ParseError} When command syntax is invalid
 */
export function parseCommandLine(commandLine: string): ParsedCommand {
  // Implementation
}
```

## Debugging and Troubleshooting

### Common Development Issues

#### WASM Build Failures

**Problem**: `zig build` fails with compilation errors

**Solutions**:

```bash
# Check Zig version compatibility
zig version

# Clean build cache
cd src/wasm && rm -rf zig-cache zig-out

# Rebuild with verbose output
zig build --verbose
```

#### Web Worker Communication Issues

**Problem**: Commands not executing or responses not received

**Debug Steps**:

1. Check browser console for Web Worker errors
2. Verify PostMessage format matches expected interface
3. Add logging to worker message handlers
4. Test worker isolation by running commands directly

<!-- eslint-disable no-restricted-globals,unicorn/prefer-add-event-listener -->

```typescript
// Add debugging to worker communication
self.onmessage = (event) => {
  console.log('Worker received:', event.data)  // Debug line
  // Handle message
}
```

#### Terminal Rendering Problems

**Problem**: Terminal not displaying correctly or missing features

**Solutions**:

- Verify xterm.js initialization and fit addon
- Check CSS conflicts with terminal styles
- Ensure terminal resize handling is working
- Test theme integration and color schemes

#### Test Failures

**Problem**: Tests failing inconsistently or setup issues

**Common Fixes**:

```bash
# Clear test cache
pnpm test -- --clearCache

# Update snapshots if needed
pnpm test -- --updateSnapshot

# Run tests with verbose output
pnpm test -- --verbose
```

### Development Tools

#### Browser Developer Tools

- **Console**: Monitor Web Worker messages and errors
- **Network Tab**: Check WASM module loading
- **Performance Tab**: Profile WASM execution
- **Memory Tab**: Monitor memory usage and leaks

#### VS Code Debugging

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug moo-dang",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/moo-dang/src/main.tsx",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"]
    }
  ]
}
```

## Contributing Guidelines

### Code Review Process

1. **Create Pull Request**: Include clear description of changes
2. **Automated Checks**: Ensure all CI checks pass
3. **Code Review**: Address reviewer feedback promptly
4. **Testing**: Verify all tests pass and add new tests for features
5. **Documentation**: Update relevant documentation

### Contribution Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compilation succeeds (`pnpm build:types`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated for new features
- [ ] Changes include appropriate tests
- [ ] Commit messages follow conventional commits format

### Git Workflow

```bash
# Start from main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/description

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/description
```

### Commit Message Format

Follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:

```
feat(shell): add new grep command with regex support
fix(wasm): resolve memory leak in module cleanup
docs(readme): update installation instructions
test(terminal): add comprehensive keyboard event tests
```

## Release Process

### Version Management

The project uses semantic versioning and changesets:

1. **Create Changeset**: Document changes for release

   ```bash
   pnpm changeset
   ```

2. **Version Bump**: Update package versions

   ```bash
   pnpm changeset version
   ```

3. **Publish**: Create release (maintainers only)
   ```bash
   pnpm changeset publish
   ```

### Pre-release Checklist

- [ ] All tests pass in CI
- [ ] Documentation is up to date
- [ ] Performance benchmarks are acceptable
- [ ] Security review completed (if applicable)
- [ ] Breaking changes are documented
- [ ] Migration guide provided (if needed)

### Deployment

moo-dang is deployed as part of the Sparkle monorepo. Deployment happens automatically through CI/CD when changes are merged to main.

---

This development guide provides the foundation for contributing to moo-dang. For specific questions or issues, please open a GitHub issue or discussion in the Sparkle repository.
