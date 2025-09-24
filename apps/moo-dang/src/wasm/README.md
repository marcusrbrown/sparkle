# Zig WASM Development for moo-dang Shell

This directory contains the Zig WebAssembly development environment for the moo-dang shell application. It provides the toolchain and API for creating WASM executables that run within the shell environment.

## Overview

The moo-dang shell supports running WASM executables compiled from Zig code. These executables:

- Run in isolation within Web Workers for security
- Have access to a comprehensive shell API for I/O operations
- Can receive command-line arguments and environment variables
- Support standard Unix-like program patterns
- Follow modern error handling and resource management practices

## Directory Structure

```text
src/wasm/
├── build.zig              # Zig build configuration
├── src/
│   └── shell_api.zig      # Shell API for WASM executables
├── examples/
│   ├── hello.zig          # Basic hello world example
│   ├── echo.zig           # Argument handling example
│   └── cat.zig            # File/stream processing example
└── zig-out/               # Build output (generated)
    └── bin/               # Compiled WASM files
```

## Prerequisites

1. **Zig Compiler**: Install from [ziglang.org](https://ziglang.org/download/)

   ```bash
   # Check installation
   zig version
   ```

2. **Node.js Dependencies**: Install development dependencies

   ```bash
   npm install
   ```

## Building WASM Executables

### Quick Start

```bash
# Build all example executables
npm run build:wasm

# Build and start development server with WASM hot reload
npm run dev:watch

# Clean build artifacts
npm run build:wasm:clean
```

### Manual Build

```bash
# From the project root
cd src/wasm

# Build all examples
zig build examples

# Build specific example
zig build-exe examples/hello.zig -target wasm32-freestanding -fno-entry --export=main

# Run tests
zig build test
```

## Shell API Reference

The shell API (`src/shell_api.zig`) provides a comprehensive interface between Zig executables and the shell environment.

### Output Functions

```zig
const shell_api = @import("shell_api");

// Raw byte output (prefer formatted functions below)
shell_api.writeStdout("Hello, World!");
shell_api.writeStderr("Error message");

// Formatted output with automatic buffer management
shell_api.print("Number: {}\n", .{42});
shell_api.printErr("Error: {s}\n", .{"Something went wrong"});
```

### Input Functions

```zig
// Read line from stdin with automatic newline handling
var buffer: [256]u8 = undefined;
const line = shell_api.readLine(buffer[0..]) catch {
    shell_api.printErr("Failed to read input\n");
    return;
};
```

### Command Line Arguments

```zig
// Get argument count
const argc = shell_api.getArgCount();

// Get specific argument
var buffer: [256]u8 = undefined;
const arg = shell_api.getArg(1, buffer[0..]) catch {
    shell_api.printErr("Failed to get argument\n");
    return;
};

// Get all arguments (requires allocator)
const allocator = std.heap.page_allocator;
const args = shell_api.getAllArgs(allocator) catch {
    shell_api.printErr("Failed to get arguments\n");
    return;
};
defer allocator.free(args);
```

### Environment Variables

```zig
// Get environment variable
var buffer: [256]u8 = undefined;
const value = shell_api.getEnv("PATH", buffer[0..]) catch {
    shell_api.printErr("Environment variable not found\n");
    return;
};
```

### Process Control

```zig
// Set exit code
shell_api.setExitCode(0);

// Exit with code (in WASM, this sets exit code and returns from main)
shell_api.exit(1);
```

## Writing WASM Executables

### Basic Executable Structure

```zig
//! My WASM executable
const shell_api = @import("../src/shell_api.zig");

/// Main entry point (must be exported)
export fn main() void {
    // Your code here
    shell_api.print("Hello from WASM!\n");
    shell_api.setExitCode(0);
}
```

### Handling Arguments

```zig
export fn main() void {
    const argc = shell_api.getArgCount();

    if (argc < 2) {
        shell_api.printErr("Usage: myprogram <argument>\n");
        shell_api.setExitCode(1);
        return;
    }

    var buffer: [256]u8 = undefined;
    const arg = shell_api.getArg(1, buffer[0..]) catch {
        shell_api.printErr("Failed to get argument\n");
        shell_api.setExitCode(1);
        return;
    };

    shell_api.print("You provided: {s}\n", .{arg});
    shell_api.setExitCode(0);
}
```

### Error Handling

```zig
const MyError = error{
    InvalidInput,
    ProcessingFailed,
};

export fn main() void {
    processInput() catch |err| {
        switch (err) {
            MyError.InvalidInput => {
                shell_api.printErr("Error: Invalid input provided\n");
                shell_api.setExitCode(1);
            },
            MyError.ProcessingFailed => {
                shell_api.printErr("Error: Processing failed\n");
                shell_api.setExitCode(2);
            },
            else => {
                shell_api.printErr("Error: Unknown error occurred\n");
                shell_api.setExitCode(99);
            },
        }
    };
}
```

## Build Configuration

The `build.zig` file configures compilation for the `wasm32-freestanding` target:

- **Target**: `wasm32-freestanding` for browser compatibility
- **Entry Point**: Disabled (using exported functions instead)
- **Dynamic Exports**: Enabled for function visibility
- **Optimization**: Configurable via `zig build --help`

### Build Options

```bash
# Debug build (default)
zig build examples

# Release build (optimized for size)
zig build examples -Doptimize=ReleaseSmall

# Release build (optimized for speed)
zig build examples -Doptimize=ReleaseFast
```

## Integration with Shell

WASM executables are automatically copied to `public/wasm/` during build and can be loaded by the shell worker. The shell provides:

1. **Process Isolation**: Each WASM executable runs in its own context
2. **Resource Limits**: Execution timeouts and memory limits
3. **I/O Redirection**: Support for pipes and file redirection
4. **Environment**: Access to shell environment variables and working directory

## Examples

### Hello World (`examples/hello.zig`)

- Basic output and exit code handling
- Multiple exported functions for different use cases

### Echo (`examples/echo.zig`)

- Command-line argument processing
- Option handling (like `-n` flag)
- String manipulation and output formatting

### Cat (`examples/cat.zig`)

- Stdin/stdout processing
- Simulated file operations (extensible for real VFS integration)
- Error handling for missing files

## Debugging and Testing

### Running Tests

```bash
# Run Zig unit tests
npm run test:wasm

# Run shell integration tests
npm test
```

### Debugging WASM

1. **Build with Debug Info**: Use debug builds for better error messages
2. **Browser DevTools**: Use browser console to see WASM errors
3. **Shell Logging**: Enable debug logging in shell worker
4. **Manual Testing**: Use the shell interface to test executables interactively

### Common Issues

1. **Zig Not Found**: Ensure Zig is installed and in PATH
2. **Build Failures**: Check Zig version compatibility (requires 0.11+)
3. **Runtime Errors**: Check browser console for WASM instantiation errors
4. **Function Not Found**: Ensure functions are properly exported

## Performance Considerations

- Keep executables small (use `ReleaseSmall` for production)
- Minimize memory allocations (prefer stack-allocated buffers)
- Use efficient algorithms (WASM has performance overhead)
- Consider function call overhead for frequently used operations

## Security Notes

- WASM executables run in sandboxed Web Workers
- No direct file system access (must use shell API)
- Network access not available from WASM
- Resource limits enforced by shell environment

## Next Steps

1. **Extended Shell API**: Add more system-like functions (file operations, process management)
2. **Standard Library**: Create common utilities for WASM executables
3. **Package System**: Support for WASM executable packages and dependencies
4. **Debugging Tools**: Enhanced debugging and profiling support

## Resources

- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [WebAssembly Specification](https://webassembly.github.io/spec/)
- [Zig WASM Target Documentation](https://ziglang.org/documentation/master/#WebAssembly)
- [Sparkle Development Guide](../../../../.github/copilot-instructions.md)
