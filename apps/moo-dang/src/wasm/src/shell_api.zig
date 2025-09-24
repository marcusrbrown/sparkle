//! Shell API for WASM executables running in the moo-dang shell environment.
//!
//! This module provides the interface between Zig WASM executables and the shell,
//! handling I/O operations, argument passing, and environment variable access.
//!
//! Example usage:
//!   const shell_api = @import("shell_api");
//!   shell_api.print("Hello, {s}!\n", .{"World"});
//!   const argc = shell_api.getArgCount();

const std = @import("std");

extern fn shell_write_stdout(data_ptr: [*]const u8, data_len: usize) void;
extern fn shell_write_stderr(data_ptr: [*]const u8, data_len: usize) void;
extern fn shell_read_stdin(buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_get_argc() u32;
extern fn shell_get_arg(index: u32, buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_get_env(key_ptr: [*]const u8, key_len: usize, buffer_ptr: [*]u8, buffer_len: usize) u32;
extern fn shell_set_exit_code(code: i32) void;

/// Buffer size chosen to balance memory usage with practical string operations
const MAX_BUFFER_SIZE: usize = 4096;

pub const ShellError = error{
    BufferTooSmall,
    InvalidArgument,
    IOError,
    OutOfMemory,
};

/// Writes raw bytes to standard output without buffering.
/// Prefer print() for formatted output with automatic newlines.
pub fn writeStdout(data: []const u8) void {
    shell_write_stdout(data.ptr, data.len);
}

/// Writes raw bytes to standard error without buffering.
/// Prefer printErr() for formatted error messages.
pub fn writeStderr(data: []const u8) void {
    shell_write_stderr(data.ptr, data.len);
}

/// Formats and prints text to standard output.
/// Automatically truncates output that exceeds buffer limits rather than failing.
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

/// Formats and prints error messages to standard error.
/// Automatically truncates messages that exceed buffer limits.
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

/// Reads a line from standard input, stripping trailing newlines.
/// Buffer must have space for at least one byte for null termination.
pub fn readLine(buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_read = shell_read_stdin(buffer.ptr, buffer.len - 1);
    if (bytes_read == 0) return buffer[0..0];

    buffer[bytes_read] = 0;

    const end_index = if (bytes_read > 0 and buffer[bytes_read - 1] == '\n')
        bytes_read - 1
    else
        bytes_read;

    return buffer[0..end_index];
}

/// Returns the total count of command line arguments including program name.
pub fn getArgCount() u32 {
    return shell_get_argc();
}

/// Retrieves a command line argument by zero-based index.
/// Index 0 is typically the program name, index 1+ are user arguments.
pub fn getArg(index: u32, buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_written = shell_get_arg(index, buffer.ptr, buffer.len - 1);
    if (bytes_written == 0) return buffer[0..0];

    buffer[bytes_written] = 0;
    return buffer[0..bytes_written];
}

/// Allocates and returns all command line arguments as owned strings.
/// Caller is responsible for freeing both the argument strings and the array.
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

/// Retrieves the value of an environment variable.
/// Returns empty slice if the variable is not set.
pub fn getEnv(key: []const u8, buffer: []u8) ![]u8 {
    if (buffer.len == 0) return ShellError.BufferTooSmall;

    const bytes_written = shell_get_env(key.ptr, key.len, buffer.ptr, buffer.len - 1);
    if (bytes_written == 0) return buffer[0..0];

    buffer[bytes_written] = 0;
    return buffer[0..bytes_written];
}

/// Sets the exit code that will be returned when the program terminates.
pub fn setExitCode(code: i32) void {
    shell_set_exit_code(code);
}

/// Terminates the program with the specified exit code.
/// In WASM freestanding environment, this sets the exit code for shell handling.
pub fn exit(code: i32) noreturn {
    setExitCode(code);
    unreachable;
}

test "shell API error types" {
    const testing = std.testing;
    try testing.expect(ShellError.BufferTooSmall == ShellError.BufferTooSmall);
    try testing.expect(ShellError.InvalidArgument == ShellError.InvalidArgument);
}

test "constants" {
    const testing = std.testing;
    try testing.expect(MAX_BUFFER_SIZE > 0);
    try testing.expect(MAX_BUFFER_SIZE == 4096);
}
