//! Shell API for WASM executables running in the moo-dang shell environment.
//!
//! This module provides the interface between Zig WASM executables and the shell,
//! handling I/O operations, argument passing, and environment variable access.

const std = @import("std");

// External functions provided by the shell environment
extern fn shell_write_stdout(data_ptr: [*]const u8, data_len: usize) void;
extern fn shell_write_stderr(data_ptr: [*]const u8, data_len: usize) void;
extern fn shell_read_stdin(buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_get_argc() u32;
extern fn shell_get_arg(index: u32, buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_get_env(key_ptr: [*]const u8, key_len: usize, buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_set_exit_code(code: i32) void;

/// Maximum buffer size for string operations
const MAX_BUFFER_SIZE: usize = 4096;

/// Shell API error types
pub const ShellError = error{
    BufferTooSmall,
    InvalidArgument,
    IOError,
    OutOfMemory,
};

/// Write data to stdout
pub fn writeStdout(data: []const u8) void {
    shell_write_stdout(data.ptr, data.len);
}

/// Write data to stderr
pub fn writeStderr(data: []const u8) void {
    shell_write_stderr(data.ptr, data.len);
}

/// Print a formatted string to stdout
pub fn print(comptime fmt: []const u8, args: anytype) void {
    var buffer: [MAX_BUFFER_SIZE]u8 = undefined;
    const formatted = std.fmt.bufPrint(buffer[0..], fmt, args) catch |err| switch (err) {
        error.NoSpaceLeft => {
            writeStderr("Error: Output too long for buffer\n");
            return;
        },
    };
    writeStdout(formatted);
}

/// Print a formatted string to stderr
pub fn printErr(comptime fmt: []const u8, args: anytype) void {
    var buffer: [MAX_BUFFER_SIZE]u8 = undefined;
    const formatted = std.fmt.bufPrint(buffer[0..], fmt, args) catch |err| switch (err) {
        error.NoSpaceLeft => {
            writeStderr("Error: Error message too long for buffer\n");
            return;
        },
    };
    writeStderr(formatted);
}

/// Read a line from stdin
pub fn readLine(buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_read = shell_read_stdin(buffer.ptr, buffer.len - 1);
    if (bytes_read == 0) return buffer[0..0];

    // Null-terminate the string
    buffer[bytes_read] = 0;

    // Remove trailing newline if present
    const end_index = if (bytes_read > 0 and buffer[bytes_read - 1] == '\n')
        bytes_read - 1
    else
        bytes_read;

    return buffer[0..end_index];
}

/// Get the number of command line arguments
pub fn getArgCount() u32 {
    return shell_get_argc();
}

/// Get a command line argument by index
pub fn getArg(index: u32, buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_written = shell_get_arg(index, buffer.ptr, buffer.len - 1);
    if (bytes_written == 0) return buffer[0..0];

    // Null-terminate the string
    buffer[bytes_written] = 0;
    return buffer[0..bytes_written];
}

/// Get all command line arguments
pub fn getAllArgs(allocator: std.mem.Allocator) ![][]u8 {
    const argc = getArgCount();
    if (argc == 0) return allocator.alloc([]u8, 0);

    var args = try allocator.alloc([]u8, argc);
    var buffer: [MAX_BUFFER_SIZE]u8 = undefined;

    for (0..argc) |i| {
        const arg_slice = try getArg(@intCast(i), buffer[0..]);
        args[i] = try allocator.dupe(u8, arg_slice);
    }

    return args;
}

/// Get an environment variable
pub fn getEnv(key: []const u8, buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_written = shell_get_env(key.ptr, key.len, buffer.ptr, buffer.len - 1);
    if (bytes_written == 0) return buffer[0..0];

    // Null-terminate the string
    buffer[bytes_written] = 0;
    return buffer[0..bytes_written];
}

/// Set the exit code for the program
pub fn setExitCode(code: i32) void {
    shell_set_exit_code(code);
}

/// Exit the program with a specific code
pub fn exit(code: i32) noreturn {
    setExitCode(code);
    // In WASM freestanding, we don't have a real exit, so we just return from main
    // The shell will handle the exit code we set
    unreachable;
}

// Tests
test "shell API error types" {
    // Test that error types are properly defined
    const testing = std.testing;
    try testing.expect(ShellError.BufferTooSmall == ShellError.BufferTooSmall);
    try testing.expect(ShellError.InvalidArgument == ShellError.InvalidArgument);
}

test "constants" {
    // Test that constants are properly defined
    const testing = std.testing;
    try testing.expect(MAX_BUFFER_SIZE > 0);
    try testing.expect(MAX_BUFFER_SIZE == 4096);
}
