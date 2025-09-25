//! Template for creating new WASM executables for the moo-dang shell.
//!
//! This comprehensive template demonstrates all shell API patterns including argument
//! processing, environment access, I/O operations, and error handling. Use this as
//! a starting point for new WASM executables.
//!
//! To create a new executable:
//! 1. Copy template.zig to your new filename (e.g., mytool.zig)
//! 2. Update the module documentation and Config constants
//! 3. Implement your custom logic in main() and helper functions
//! 4. Add the new executable to build.zig examples array

const shell_api = @import("shell_api");
const std = @import("std");

const ExitCode = struct {
    const SUCCESS: i32 = 0;
    const GENERAL_ERROR: i32 = 1;
    const INVALID_USAGE: i32 = 2;
    const FILE_NOT_FOUND: i32 = 3;
    const PERMISSION_DENIED: i32 = 4;
};

const Config = struct {
    const MAX_LINE_LENGTH: usize = 1024;
    const VERSION: []const u8 = "1.0.0";
    const PROGRAM_NAME: []const u8 = "template";
    const PROGRAM_DESCRIPTION: []const u8 = "Template WASM executable demonstrating shell API usage";
};

export fn main() void {
    const argc = shell_api.getArgCount();

    if (argc > 1) {
        var buffer: [256]u8 = undefined;
        const first_arg = shell_api.getArg(1, buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read command arguments\n", .{});
            shell_api.setExitCode(ExitCode.GENERAL_ERROR);
            return;
        };

        if (std.mem.eql(u8, first_arg, "--help") or std.mem.eql(u8, first_arg, "-h")) {
            showHelp();
            return;
        }

        if (std.mem.eql(u8, first_arg, "--version") or std.mem.eql(u8, first_arg, "-v")) {
            showVersion();
            return;
        }
    }

    shell_api.print("Hello from the WASM executable template!\n", .{});
    shell_api.print("This is a template demonstrating shell API patterns.\n", .{});

    if (argc > 1) {
        shell_api.print("You provided {} arguments:\n", .{argc - 1});
        demonstrateArguments();
    } else {
        shell_api.print("No arguments provided. Try running with --help\n", .{});
    }

    demonstrateEnvironment();
    shell_api.setExitCode(ExitCode.SUCCESS);
}

export fn show_help() void {
    showHelp();
}

export fn show_version() void {
    showVersion();
}

export fn process_arguments() void {
    const argc = shell_api.getArgCount();

    if (argc < 2) {
        shell_api.printErr("Usage: {s} [options] <arguments>\n", .{Config.PROGRAM_NAME});
        shell_api.setExitCode(ExitCode.INVALID_USAGE);
        return;
    }

    var buffer: [256]u8 = undefined;
    var verbose = false;
    var start_index: u32 = 1;

    // Separate options from positional arguments
    while (start_index < argc) {
        const arg = shell_api.getArg(start_index, buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read argument {}\n", .{start_index});
            shell_api.setExitCode(ExitCode.GENERAL_ERROR);
            return;
        };

        if (arg.len == 0) {
            start_index += 1;
            continue;
        }

        if (arg[0] != '-') {
            break;
        }

        if (std.mem.eql(u8, arg, "-v") or std.mem.eql(u8, arg, "--verbose")) {
            verbose = true;
            start_index += 1;
        } else {
            shell_api.printErr("Error: Unknown option '{s}'\n", .{arg});
            shell_api.setExitCode(ExitCode.INVALID_USAGE);
            return;
        }
    }

    if (verbose) {
        shell_api.print("Verbose mode enabled\n", .{});
    }

    shell_api.print("Processing {} positional arguments:\n", .{argc - start_index});
    for (start_index..argc) |i| {
        const arg = shell_api.getArg(@intCast(i), buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read argument {}\n", .{i});
            shell_api.setExitCode(ExitCode.GENERAL_ERROR);
            return;
        };

        if (verbose) {
            shell_api.print("  [{}]: '{s}' (length: {})\n", .{ i - start_index, arg, arg.len });
        } else {
            shell_api.print("  {s}\n", .{arg});
        }
    }

    shell_api.setExitCode(ExitCode.SUCCESS);
}

export fn read_input() void {
    shell_api.print("Reading lines from stdin (empty line to stop):\n", .{});

    var buffer: [Config.MAX_LINE_LENGTH]u8 = undefined;
    var line_count: u32 = 0;

    while (true) {
        const line = shell_api.readLine(buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read from stdin\n", .{});
            shell_api.setExitCode(ExitCode.GENERAL_ERROR);
            return;
        };

        if (line.len == 0) {
            break;
        }

        line_count += 1;
        shell_api.print("Line {}: {s}\n", .{ line_count, line });
    }

    shell_api.print("Read {} lines total\n", .{line_count});
    shell_api.setExitCode(ExitCode.SUCCESS);
}

export fn show_environment() void {
    demonstrateEnvironment();
}
fn showHelp() void {
    shell_api.print("{s} v{s} - {s}\n\n", .{ Config.PROGRAM_NAME, Config.VERSION, Config.PROGRAM_DESCRIPTION });
    shell_api.print("Usage: {s} [options] [arguments]\n\n", .{Config.PROGRAM_NAME});
    shell_api.print("Options:\n", .{});
    shell_api.print("  -h, --help      Show this help message\n", .{});
    shell_api.print("  -v, --version   Show version information\n", .{});
    shell_api.print("      --verbose   Enable verbose output\n", .{});
    shell_api.print("\nExported Functions:\n", .{});
    shell_api.print("  main                 - Default entry point with basic demo\n", .{});
    shell_api.print("  process_arguments    - Demonstrate argument processing\n", .{});
    shell_api.print("  read_input          - Demonstrate stdin reading\n", .{});
    shell_api.print("  show_environment    - Display environment variables\n", .{});
    shell_api.print("  show_help           - Display this help\n", .{});
    shell_api.print("  show_version        - Display version information\n", .{});
    shell_api.setExitCode(ExitCode.SUCCESS);
}

fn showVersion() void {
    shell_api.print("{s} version {s}\n", .{ Config.PROGRAM_NAME, Config.VERSION });
    shell_api.setExitCode(ExitCode.SUCCESS);
}

fn demonstrateArguments() void {
    const argc = shell_api.getArgCount();
    var buffer: [256]u8 = undefined;

    for (1..argc) |i| {
        const arg = shell_api.getArg(@intCast(i), buffer[0..]) catch {
            shell_api.printErr("Error: Failed to get argument {}\n", .{i});
            shell_api.setExitCode(ExitCode.GENERAL_ERROR);
            return;
        };
        shell_api.print("  Argument {}: '{s}'\n", .{ i, arg });
    }
}

fn demonstrateEnvironment() void {
    shell_api.print("\nEnvironment variables:\n", .{});

    // Common shell environment variables for demonstration
    const env_vars = [_][]const u8{ "HOME", "USER", "PATH", "PWD", "SHELL" };
    var buffer: [512]u8 = undefined;

    for (env_vars) |var_name| {
        const value = shell_api.getEnv(var_name, buffer[0..]) catch {
            shell_api.printErr("Error: Failed to read environment variable '{s}'\n", .{var_name});
            continue;
        };

        if (value.len > 0) {
            shell_api.print("  {s}={s}\n", .{ var_name, value });
        } else {
            shell_api.print("  {s} (not set)\n", .{var_name});
        }
    }
}
