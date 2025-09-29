# moo-dang Architecture Documentation

This document provides a comprehensive overview of the moo-dang WASM web shell application architecture, design decisions, and implementation details.

## Table of Contents

- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)
- [Design Decisions](#design-decisions)
- [Extension Points](#extension-points)

## System Architecture

moo-dang follows a layered, modular architecture that prioritizes security, maintainability, and performance through clear separation of concerns.

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Environment                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Main Thread (UI)                           ││
│  │                                                             ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  ││
│  │  │   React App     │  │  Theme Provider │  │   xterm.js  │  ││
│  │  │   Components    │  │   (Sparkle)     │  │  Terminal   │  ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘  ││
│  │           │                     │                   │       ││
│  │           └─────────────────────┼───────────────────┘       ││
│  │                               │                           ││
│  └───────────────────────────────────┼─────────────────────────┘│
│                                    │                           │
│                          PostMessage API                       │
│                                    │                           │
│  ┌───────────────────────────────────┼─────────────────────────┐│
│  │                  Web Worker Thread                         ││
│  │                                 │                         ││
│  │  ┌─────────────────┐  ┌─────────┴─────────┐  ┌───────────┐ ││
│  │  │  Shell Engine   │  │   WASM Runtime    │  │ File Sys  │ ││
│  │  │   (Commands)    │  │    Environment    │  │ (Virtual) │ ││
│  │  └─────────────────┘  └───────────────────┘  └───────────┘ ││
│  │           │                     │                   │     ││
│  │           └─────────────────────┼───────────────────┘     ││
│  │                               │                         ││
│  └───────────────────────────────────┼─────────────────────────┘│
│                                    │                           │
│                         WASM Module Interface                  │
│                                    │                           │
│  ┌───────────────────────────────────┼─────────────────────────┐│
│  │              WASM Executables (Zig)                        ││
│  │                                 │                         ││
│  │  ┌─────────────────┐  ┌─────────┴─────────┐  ┌───────────┐ ││
│  │  │   hello.wasm    │  │    echo.wasm      │  │  cat.wasm │ ││
│  │  │   (greeting)    │  │  (arg handling)   │  │   (I/O)   │ ││
│  │  └─────────────────┘  └───────────────────┘  └───────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Component Layers

#### 1. Presentation Layer (Main Thread)

**React Application (`src/App.tsx`)**

- Main application component managing global state
- Theme provider integration with Sparkle design system
- Accessibility provider for ARIA and screen reader support
- Error boundaries for graceful degradation

**Terminal Interface (`src/components/Terminal.tsx`)**

- xterm.js integration for terminal emulation
- Terminal theme management and responsive design
- Keyboard event handling and input processing
- Display output formatting and ANSI color support

**UI Components (`src/components/`)**

- `CommandTerminal.tsx`: Main terminal interface component
- `CompletionDisplay.tsx`: Tab completion UI
- `AccessibilityProvider.tsx`: ARIA support and screen reader integration
- `theme-utils.ts`: Sparkle theme to xterm.js theme conversion

#### 2. Application Logic Layer (Web Worker)

**Shell Worker (`src/workers/shell.worker.ts`)**

- Isolated execution environment for shell logic
- PostMessage communication with main thread
- Command parsing and execution coordination
- State management for shell session

**Shell Engine (`src/shell/`)**

- `commands.ts`: Built-in command implementations
- `parser.ts`: Command line parsing and tokenization
- `pipeline.ts`: Command pipeline execution with pipes/redirection
- `environment.ts`: Environment variable management
- `history-manager.ts`: Command history persistence
- `completion-engine.ts`: Tab completion system

#### 3. Execution Layer (WASM Runtime)

**WASM Loader (`src/shell/wasm-loader.ts`)**

- Dynamic WASM module loading and caching
- Module instantiation and memory management
- Error handling and timeout management
- Security sandboxing for WASM execution

**Virtual File System (`src/shell/virtual-file-system.ts`)**

- In-memory file system implementation
- Path resolution and permission checking
- File I/O operations with localStorage persistence
- Directory navigation and file metadata

#### 4. Native Layer (Zig WASM Programs)

**Shell API (`src/wasm/src/shell_api.zig`)**

- Zig API for WASM programs to interact with shell
- Standard I/O operations (print, read, write)
- File system access and environment variables
- Argument parsing and exit code handling

**Example Programs (`src/wasm/examples/`)**

- `hello.zig`: Basic program structure demonstration
- `echo.zig`: Command-line argument handling
- `cat.zig`: File I/O and stream processing

## Component Architecture

### React Component Hierarchy

```text
App
├── ThemeProvider (Sparkle)
├── AccessibilityProvider
│   ├── ScreenReaderHelper
│   └── KeyboardShortcutsHelp
└── CommandTerminal
    ├── Terminal (xterm.js wrapper)
    ├── CompletionDisplay
    └── theme integration utilities
```

### Shell Engine Architecture

```text
Shell Worker
├── Command Parser
│   ├── Tokenizer
│   ├── Variable Expander
│   └── Pipeline Builder
├── Command Executor
│   ├── Built-in Commands
│   ├── WASM Command Loader
│   └── Pipeline Processor
├── Environment Manager
│   ├── Variable Storage
│   ├── Path Management
│   └── Configuration
└── I/O System
    ├── Virtual File System
    ├── Stream Management
    └── Output Formatting
```

## Data Flow

### Command Execution Flow

1. **User Input**: User types command in xterm.js terminal
2. **Input Processing**: Terminal component captures input and validates
3. **Worker Communication**: Command sent to Shell Worker via PostMessage
4. **Parsing**: Command parsed into tokens, variables expanded
5. **Pipeline Construction**: Commands chained with pipes/redirects
6. **Execution**:
   - Built-in commands executed directly in worker
   - WASM commands loaded and executed with shell API access
   - File I/O operations performed through virtual file system
7. **Output Processing**: Results formatted and sent back to main thread
8. **Display**: Terminal displays formatted output with ANSI colors

### WASM Integration Flow

```text
Shell Worker                    WASM Module
     │                              │
     ├─ loadWasmModule()           │
     │       │                     │
     │       └─→ fetch(wasm-url)   │
     │       └─→ instantiate()   ──┼─→ _start()
     │                             │
     ├─ executeCommand()           │
     │       │                     │
     │       └─→ shell_api calls ←─┼─── shell.print()
     │       └─→ memory access   ←─┼─── shell.getArgs()
     │       └─→ environment     ←─┼─── shell.getEnv()
     │                             │
     └─ cleanup()                ──┼─→ shell.exit()
                                   │
```

### State Management

**Main Thread State**:

- Terminal display state (cursor, colors, scroll)
- Theme preferences and accessibility settings
- UI component state and focus management

**Worker Thread State**:

- Current working directory and environment variables
- Command history and completion cache
- Active jobs and background processes
- Virtual file system state

**Persistent State**:

- User preferences in localStorage
- Command history persistence
- Virtual file system persistence
- WASM module cache

## Security Model

### Isolation Boundaries

1. **Process Isolation**: Web Worker provides process-level isolation from main thread
2. **Memory Isolation**: WASM programs run in isolated linear memory
3. **API Isolation**: WASM programs can only access shell through defined API
4. **File System Isolation**: Virtual file system prevents access to real file system

### Security Controls

**WASM Execution**:

- No direct DOM or network access
- Memory access limited to allocated regions
- Execution timeouts prevent infinite loops
- Stack overflow protection through WASM runtime

**File System Security**:

- All file operations virtualized
- No access to actual browser file system
- Path traversal attacks prevented by path normalization
- Permission system for file access control

**Network Security**:

- No network access from WASM programs
- Shell commands cannot make external requests
- All communication through PostMessage API

### Threat Model

**Mitigated Threats**:

- Malicious WASM programs cannot access host system
- Command injection attacks prevented by proper parsing
- XSS attacks prevented through output sanitization
- Resource exhaustion limited by timeouts and memory limits

**Residual Risks**:

- DoS attacks through CPU-intensive WASM programs (mitigated by timeouts)
- Memory exhaustion (mitigated by WASM memory limits)
- Persistence of malicious data in localStorage (cleared on application reset)

## Performance Considerations

### Optimization Strategies

**WASM Performance**:

- Module caching to avoid repeated compilation
- Lazy loading of WASM modules on demand
- Memory pool reuse for multiple executions
- Ahead-of-time compilation when possible

**UI Performance**:

- Virtual scrolling in terminal for large outputs
- Debounced input processing for responsive typing
- Efficient theme switching without re-render
- Canvas-based rendering for complex terminal graphics

**Memory Management**:

- WASM module garbage collection after execution
- Virtual file system cleanup for unused files
- Command history size limits
- Automatic cache eviction for old modules

### Performance Characteristics

- **Cold Start**: ~200ms for shell initialization
- **Command Execution**: <10ms for built-in commands
- **WASM Loading**: ~50ms for typical executables (cached: ~5ms)
- **Memory Usage**: ~2MB base + loaded program overhead
- **Terminal Rendering**: 60 FPS with hardware acceleration

## Design Decisions

### Technology Choices

**React + TypeScript**:

- ✅ Type safety and developer experience
- ✅ Component reusability and testability
- ✅ Integration with Sparkle design system
- ❌ Bundle size overhead (acceptable for this application)

**Web Workers for Shell**:

- ✅ True parallelism for shell processing
- ✅ Isolation from main thread UI
- ✅ Security boundary for WASM execution
- ❌ Communication overhead via PostMessage

**xterm.js for Terminal**:

- ✅ Full-featured terminal emulation
- ✅ ANSI color and escape sequence support
- ✅ Accessibility features and keyboard handling
- ❌ Large dependency size (~200KB)

**Zig for WASM**:

- ✅ Memory safety with performance
- ✅ Excellent WASM support and tooling
- ✅ Small WASM binary sizes
- ❌ Less mature ecosystem than C/Rust

**Virtual File System**:

- ✅ Security isolation from host system
- ✅ Consistent cross-platform behavior
- ✅ Persistence through localStorage
- ❌ No access to real file system

### Alternative Approaches Considered

**Shell Implementation**:

- **Alternative**: Use existing shell implementations (xterm-pty, node-pty)
- **Decision**: Custom implementation for WASM integration and security control

**WASM Runtime**:

- **Alternative**: WASI for system calls
- **Decision**: Custom shell API for tighter integration and security

**UI Framework**:

- **Alternative**: Vanilla JS or other frameworks
- **Decision**: React for integration with Sparkle monorepo

## Extension Points

### Adding New Commands

Built-in commands can be added in `src/shell/commands.ts`:

```typescript
export const commands: Record<string, CommandHandler> = {
  // ... existing commands
  newcommand: async (args, context) => {
    // Command implementation
    return { output: 'Result', exitCode: 0 };
  }
};
```

### Creating WASM Programs

New WASM executables can be added in `src/wasm/examples/`:

```zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    // Program implementation using shell API
    shell.exit(0);
}
```

### Extending Shell API

The shell API can be extended in `src/wasm/src/shell_api.zig`:

```zig
pub fn newApiFunction() void {
    // New API implementation
}
```

### Theme Customization

Theme integration can be customized in `src/components/theme-utils.ts`:

```typescript
export function customThemeMapping(theme: ThemeConfig): ITheme {
    // Custom theme conversion logic
}
```

### Plugin Architecture

Future extension could include a plugin system:

```typescript
interface ShellPlugin {
  name: string;
  commands?: Record<string, CommandHandler>;
  completion?: CompletionProvider;
  initialize?: (context: ShellContext) => Promise<void>;
}
```

## Maintenance Considerations

### Code Organization

- Clear separation of concerns between layers
- TypeScript strict mode for type safety
- Comprehensive test coverage (446+ tests)
- Documentation co-located with code

### Monitoring and Debugging

- Structured logging with consola
- Error boundaries for graceful degradation
- Performance metrics for WASM execution
- Debug mode for development troubleshooting

### Upgrade Paths

- Modular architecture supports incremental upgrades
- WASM modules can be versioned independently
- Theme system supports design system evolution
- API versioning for backward compatibility

This architecture provides a solid foundation for a secure, performant, and maintainable WASM web shell while allowing for future expansion and customization.
