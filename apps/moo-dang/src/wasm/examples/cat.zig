//! Cat WASM executable for the moo-dang shell.
//! Demonstrates file-like operations and stream processing (simulated).
//! Uses virtual file system simulation until full shell API extensions are available.

const shell_api = @import("shell_api");
const std = @import("std");

export fn main() void {
    const argc = shell_api.getArgCount();

    if (argc <= 1) {
        catStdin();
    } else {
        catFiles();
    }
}

/// Echoes lines from standard input to standard output until EOF.
fn catStdin() void {
    shell_api.print("Reading from stdin (type lines, Ctrl+C to exit):\n", .{});

    var buffer: [1024]u8 = undefined;

    while (true) {
        const line = shell_api.readLine(buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read from stdin\n", .{});
            shell_api.setExitCode(1);
            return;
        };

        if (line.len == 0) {
            break;
        }

        shell_api.print("{s}\n", .{line});
    }

    shell_api.setExitCode(0);
}

/// Simulates reading and displaying file contents using predefined virtual files.
/// Production implementation would integrate with shell's virtual file system API.
fn catFiles() void {
    const argc = shell_api.getArgCount();
    var buffer: [256]u8 = undefined;

    for (1..argc) |i| {
        const filename = shell_api.getArg(@intCast(i), buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get argument {}\n", .{i});
            shell_api.setExitCode(1);
            return;
        };

        shell_api.print("=== Contents of {s} ===\n", .{filename});

        if (std.mem.eql(u8, filename, "hello.txt")) {
            shell_api.print("Hello from a virtual file!\n", .{});
        } else if (std.mem.eql(u8, filename, "test.txt")) {
            shell_api.print("This is a test file.\nWith multiple lines.\n", .{});
        } else {
            shell_api.printErr("cat: {s}: No such file or directory\n", .{filename});
            shell_api.setExitCode(1);
            return;
        }
    }

    shell_api.setExitCode(0);
}

/// Displays simulated file statistics for demonstration purposes.
export fn stat_file() void {
    const argc = shell_api.getArgCount();
    if (argc <= 1) {
        shell_api.printErr("Usage: stat_file <filename>\n", .{});
        shell_api.setExitCode(1);
        return;
    }

    var buffer: [256]u8 = undefined;
    const filename = shell_api.getArg(1, buffer[0..]) catch {
        shell_api.printErr("Error: Failed to get filename\n", .{});
        shell_api.setExitCode(1);
        return;
    };

    shell_api.print("File: {s}\n", .{filename});
    shell_api.print("Size: 42 bytes\n", .{});
    shell_api.print("Type: regular file\n", .{});
    shell_api.print("Permissions: rw-r--r--\n", .{});

    shell_api.setExitCode(0);
}
