const std = @import("std");

/// Information about an example executable to build
const Example = struct {
    name: []const u8,
    description: []const u8,
};

const examples = [_]Example{
    .{ .name = "hello", .description = "basic example" },
    .{ .name = "echo", .description = "demonstrates argument handling" },
    .{ .name = "cat", .description = "demonstrates file I/O" },
};

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const optimize = b.standardOptimizeOption(.{});

    const shell_api_module = b.createModule(.{
        .root_source_file = b.path("src/shell_api.zig"),
        .target = target,
        .optimize = optimize,
    });

    const build_examples_step = b.step("examples", "Build all WASM example executables");

    for (examples) |example| {
        const exe = createWasmExecutable(b, example.name, target, optimize, shell_api_module);
        b.installArtifact(exe);
        build_examples_step.dependOn(&b.addInstallArtifact(exe, .{}).step);
    }

    const tests_step = createTestStep(b, optimize);
    _ = tests_step;
}

/// Creates a WASM executable with standard configuration for shell integration.
fn createWasmExecutable(
    b: *std.Build,
    name: []const u8,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,
    shell_api_module: *std.Build.Module,
) *std.Build.Step.Compile {
    const exe = b.addExecutable(.{
        .name = name,
        .root_module = b.createModule(.{
            .root_source_file = b.path(b.fmt("examples/{s}.zig", .{name})),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "shell_api", .module = shell_api_module },
            },
        }),
    });

    exe.entry = .disabled;
    exe.rdynamic = true;

    return exe;
}

/// Creates test step using native target for full standard library support.
fn createTestStep(b: *std.Build, optimize: std.builtin.OptimizeMode) *std.Build.Step {
    const tests_step = b.step("test", "Run unit tests");
    const native_target = b.resolveTargetQuery(.{});
    const test_exe = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/shell_api.zig"),
            .target = native_target,
            .optimize = optimize,
        }),
    });
    const run_tests = b.addRunArtifact(test_exe);
    tests_step.dependOn(&run_tests.step);
    return tests_step;
}
