//! Echo WASM executable for the moo-dang shell
//!
//! Demonstrates argument handling and text processing.

const shell_api = @import("shell_api");
const std = @import("std");

/// Main entry point for the echo executable
export fn main() void {
    const argc = shell_api.getArgCount();

    // If no arguments, just print newline
    if (argc <= 1) {
        shell_api.print("\n", .{});
        shell_api.setExitCode(0);
        return;
    }

    var buffer: [256]u8 = undefined;
    var is_first = true;

    // Echo all arguments separated by spaces
    for (1..argc) |i| {
        const arg = shell_api.getArg(@intCast(i), buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get argument {}\n", .{i});
            shell_api.setExitCode(1);
            return;
        };

        if (!is_first) {
            shell_api.print(" ", .{});
        }
        shell_api.print("{s}", .{arg});
        is_first = false;
    }

    shell_api.print("\n", .{});
    shell_api.setExitCode(0);
}

/// Echo with options support
export fn echo_with_options() void {
    const argc = shell_api.getArgCount();
    if (argc <= 1) {
        shell_api.print("\n", .{});
        shell_api.setExitCode(0);
        return;
    }

    var buffer: [256]u8 = undefined;
    var newline = true;
    var start_index: u32 = 1;

    // Check for -n option (no trailing newline)
    if (argc > 1) {
        const first_arg = shell_api.getArg(1, buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get first argument\n", .{});
            shell_api.setExitCode(1);
            return;
        };

        if (std.mem.eql(u8, first_arg, "-n")) {
            newline = false;
            start_index = 2;
        }
    }

    var is_first = true;

    // Echo arguments
    for (start_index..argc) |i| {
        const arg = shell_api.getArg(@intCast(i), buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get argument {}\n", .{i});
            shell_api.setExitCode(1);
            return;
        };

        if (!is_first) {
            shell_api.print(" ", .{});
        }
        shell_api.print("{s}", .{arg});
        is_first = false;
    }

    if (newline) {
        shell_api.print("\n", .{});
    }

    shell_api.setExitCode(0);
}
