const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const optimize = b.standardOptimizeOption(.{});

    // Create shell API module for reuse
    const shell_api_module = b.createModule(.{
        .root_source_file = b.path("src/shell_api.zig"),
        .target = target,
        .optimize = optimize,
    });

    // Build hello executable - basic example
    const hello_exe = b.addExecutable(.{
        .name = "hello",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/hello.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "shell_api", .module = shell_api_module },
            },
        }),
    });

    // Configure for WASM export
    hello_exe.entry = .disabled;
    hello_exe.rdynamic = true;

    // Build echo executable - demonstrates argument handling
    const echo_exe = b.addExecutable(.{
        .name = "echo",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/echo.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "shell_api", .module = shell_api_module },
            },
        }),
    });

    echo_exe.entry = .disabled;
    echo_exe.rdynamic = true;

    // Build cat executable - demonstrates file I/O
    const cat_exe = b.addExecutable(.{
        .name = "cat",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/cat.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "shell_api", .module = shell_api_module },
            },
        }),
    });

    cat_exe.entry = .disabled;
    cat_exe.rdynamic = true;

    // Install step for all executables
    b.installArtifact(hello_exe);
    b.installArtifact(echo_exe);
    b.installArtifact(cat_exe);

    // Create run step that builds all examples
    const build_examples_step = b.step("examples", "Build all WASM example executables");
    build_examples_step.dependOn(&b.addInstallArtifact(hello_exe, .{}).step);
    build_examples_step.dependOn(&b.addInstallArtifact(echo_exe, .{}).step);
    build_examples_step.dependOn(&b.addInstallArtifact(cat_exe, .{}).step);

    // Test step (use native target for tests as wasm32-freestanding doesn't support full std library)
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
}
