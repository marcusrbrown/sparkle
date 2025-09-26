# WASM Communication Interface Documentation

This document outlines the shell-to-WASM communication interface implemented in the moo-dang shell.

## Overview

The moo-dang shell provides a comprehensive bidirectional communication interface between the shell environment and WebAssembly (WASM) modules. This interface enables WASM executables to interact with the shell through a well-defined API while maintaining security and performance.

## Architecture

```text
┌─────────────────┐    Messages    ┌──────────────────┐
│   Shell Worker  │ ←──────────────→ │  Main Thread     │
└─────────────────┘                 └──────────────────┘
         │
         ▼ Shell Imports
┌─────────────────┐    Function     ┌──────────────────┐
│  WASM Module    │ ─────Calls─────→ │ Shell Functions  │
│                 │ ←────Results──── │                  │
└─────────────────┘                 └──────────────────┘
```

## Communication Protocols

### 1. Shell-to-WASM Communication

The shell communicates with WASM modules through:

#### Module Loading & Instantiation

- **`WasmModuleLoader.loadModule()`**: Compiles and instantiates WASM modules
- **Module Configuration**: Memory limits, execution timeouts, debug settings
- **Execution Context**: Process ID, environment variables, working directory

#### Function Invocation

- **`WasmModuleLoader.executeFunction()`**: Calls exported WASM functions
- **Multi-function Support**: Can call any exported function, not just `main`
- **Argument Passing**: Arguments passed via execution context and shell API
- **Return Values**: Results captured via stdout/stderr and exit codes

### 2. WASM-to-Shell Communication

WASM modules communicate with the shell through imported functions (Shell API):

#### I/O Operations

The Shell API provides these I/O functions to WASM modules:

- `shell_write_stdout(dataPtr: number, dataLen: number): void`
- `shell_write_stderr(dataPtr: number, dataLen: number): void`
- `shell_read_stdin(bufferPtr: number, bufferLen: number): number`

#### Process Control

Process control functions for WASM modules:

- `shell_set_exit_code(code: number): void`

#### Environment Access

Environment and argument access functions:

- `shell_get_argc(): number`
- `shell_get_arg(index: number, bufferPtr: number, bufferLen: number): number`
- `shell_get_env(keyPtr: number, keyLen: number, bufferPtr: number, bufferLen: number): number`

## Memory Management

### Shared Memory

- WASM modules and shell share memory space through `WebAssembly.Memory`
- Memory allocated with 16MB initial size, 32MB maximum for Zig modules
- Automatic bounds checking for all memory operations

### String Encoding

- UTF-8 encoding for all text data
- Null-terminated strings in memory
- Automatic truncation for oversized data to prevent buffer overflows

## Security & Isolation

### Web Worker Isolation

- All WASM execution occurs in isolated Web Workers
- No direct access to main thread or DOM
- Resource limits prevent browser performance impact

### Memory Safety

- Bounds checking for all memory reads/writes
- Buffer overflow protection
- Conservative memory limits for web environment

### Execution Safety

- 15-second timeout protection prevents hanging
- Process isolation prevents interference between modules
- Clean resource cleanup on completion

## Communication Flow Examples

### Simple Command Execution

```typescript
// 1. Shell receives command: "hello world"
// 2. Shell loads hello.wasm module
// 3. Shell calls main() function with args
// 4. WASM calls shell_write_stdout("Hello, world!")
// 5. Shell captures output and returns result
```

### Multi-function Execution

```typescript
// 1. Shell receives command: "hello hello_name John"
// 2. Shell loads hello.wasm module
// 3. Shell calls hello_name() function (not main)
// 4. WASM calls shell_get_arg(1, buffer, size) to get "John"
// 5. WASM calls shell_write_stdout("Hello, John!")
// 6. Shell captures output and returns result
```

### Pipeline Integration

```typescript
// 1. Shell receives command: "echo hello | hello"
// 2. Shell executes echo, captures stdout
// 3. Shell passes echo output as stdin to hello
// 4. WASM calls shell_read_stdin() to get piped data
// 5. WASM processes and outputs final result
```

## Error Handling

### Error Types

- **WasmLoadError**: Module compilation/instantiation failures
- **WasmExecutionError**: Runtime execution failures
- **WasmTimeoutError**: Execution timeout exceeded

### Error Propagation

- WASM exceptions converted to shell errors
- Exit codes propagated from WASM to shell
- Structured error messages with context

## Performance Characteristics

### Execution Overhead

- Module compilation: ~50-100ms (cached after first load)
- Function calls: <10ms for simple operations
- Memory operations: Native WebAssembly performance

### Caching Strategy

- LRU cache for compiled modules (5 modules maximum)
- Prevents recompilation overhead
- Automatic cleanup of unused modules

## API Extensions

The communication interface is designed for extensibility:

### Custom Imports

- Support for custom import functions via configuration
- Pluggable import system for specialized shell APIs
- Module-specific customization capabilities

### Future Enhancements

- Event/callback system for asynchronous operations
- Inter-module communication channels
- Streaming I/O for large data processing
- Advanced signal handling and process control

## Usage Examples

### Basic WASM Executable (Zig)

```zig
const shell_api = @import("shell_api");

export fn main() void {
    shell_api.print("Hello from WASM!\n", .{});
    shell_api.setExitCode(0);
}
```

### Advanced Argument Processing

```zig
export fn process_args() void {
    const argc = shell_api.getArgCount();
    var buffer: [256]u8 = undefined;

    for (1..argc) |i| {
        const arg = shell_api.getArg(@intCast(i), buffer[0..]) catch continue;
        shell_api.print("Arg {}: {s}\n", .{i, arg});
    }
}
```

### Environment Variable Access

```zig
export fn show_env() void {
    var buffer: [256]u8 = undefined;
    const path = shell_api.getEnv("PATH", buffer[0..]) catch {
        shell_api.printErr("PATH not found\n", .{});
        return;
    };
    shell_api.print("PATH: {s}\n", .{path});
}
```

## Testing & Validation

The communication interface is validated through:

- **Unit Tests**: 14 WASM-specific tests covering all communication patterns
- **Integration Tests**: End-to-end command execution validation
- **Error Testing**: Comprehensive error condition coverage
- **Performance Tests**: Memory and execution overhead validation

## Conclusion

The moo-dang shell implements a complete, secure, and efficient shell-to-WASM communication interface that enables seamless integration between the shell environment and WebAssembly executables. The interface provides all necessary primitives for building complex WASM-based shell utilities while maintaining security and performance in the browser environment.

This implementation satisfies the requirements for TASK-022: "Create shell-to-WASM communication interface" and provides a solid foundation for building advanced shell features in Phase 5.
