//! Hello World WASM executable for the moo-dang shell
//!
//! Demonstrates basic shell API usage including output and exit codes.

const shell_api = @import("shell_api");

/// Main entry point for the hello executable
export fn main() void {
    shell_api.print("Hello, World from Zig WASM!\n", .{});
    shell_api.setExitCode(0);
}

/// Alternative hello function that takes a name parameter
export fn hello_name() void {
    var buffer: [256]u8 = undefined;

    const argc = shell_api.getArgCount();
    if (argc > 1) {
        const name = shell_api.getArg(1, buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get argument\n", .{});
            shell_api.setExitCode(1);
            return;
        };

        if (name.len > 0) {
            shell_api.print("Hello, {s}!\n", .{name});
        } else {
            shell_api.print("Hello, World!\n", .{});
        }
    } else {
        shell_api.print("Hello, World!\n", .{});
    }

    shell_api.setExitCode(0);
}

/// Version information function
export fn version() void {
    shell_api.print("hello v1.0.0 - Zig WASM example\n", .{});
    shell_api.setExitCode(0);
}
