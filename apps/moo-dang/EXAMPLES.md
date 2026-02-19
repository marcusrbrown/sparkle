# moo-dang Examples and Tutorials

This document provides practical examples and step-by-step tutorials for using the moo-dang WASM web shell application effectively.

## Table of Contents

- [Getting Started Examples](#getting-started-examples)
- [Shell Command Tutorials](#shell-command-tutorials)
- [WASM Development Tutorials](#wasm-development-tutorials)
- [Advanced Shell Workflows](#advanced-shell-workflows)
- [Integration Examples](#integration-examples)
- [Troubleshooting Examples](#troubleshooting-examples)

## Getting Started Examples

### Basic Shell Navigation

Start with these fundamental operations to familiarize yourself with the shell:

```bash
# Check where you are
pwd
# Output: /

# List files and directories
ls
# Output: examples  bin  home  tmp

# Explore the examples directory
cd examples
ls -la
# Output:
# drwxr-xr-x  2 user user   64 Jan  1 12:00 .
# drwxr-xr-x  5 user user  160 Jan  1 12:00 ..
# -rw-r--r--  1 user user   13 Jan  1 12:00 hello.txt
# -rw-r--r--  1 user user   25 Jan  1 12:00 data.txt

# Read file contents
cat hello.txt
# Output: Hello, World!

# Return to home directory
cd
pwd
# Output: /
```

### First WASM Program Execution

Try running the built-in WASM executables:

```bash
# Run the hello world program
hello
# Output: Hello from moo-dang WASM shell!

# Run echo with arguments
echo "Welcome to moo-dang" "shell system"
# Output: Welcome to moo-dang shell system

# Process a file with cat
cat /examples/hello.txt
# Output: Hello, World!
```

### Environment Variables

Learn to work with environment variables:

```bash
# View all environment variables
env
# Output:
# PATH=/bin:/usr/bin
# HOME=/
# USER=user
# SHELL=/bin/moo-dang

# Set a new variable
export PROJECT="moo-dang"
echo "Working on $PROJECT"
# Output: Working on moo-dang

# Use variables in complex expressions
export VERSION="1.0"
echo "Project: ${PROJECT} v${VERSION}"
# Output: Project: moo-dang v1.0
```

## Shell Command Tutorials

### File Management Workflow

Complete tutorial for managing files and directories:

#### Creating and Organizing Files

```bash
# Create project structure
mkdir -p projects/my-app/{src,docs,tests}
cd projects/my-app

# Verify structure
ls -la
# Output:
# drwxr-xr-x  5 user user  160 Jan  1 12:00 .
# drwxr-xr-x  3 user user   96 Jan  1 12:00 ..
# drwxr-xr-x  2 user user   64 Jan  1 12:00 docs
# drwxr-xr-x  2 user user   64 Jan  1 12:00 src
# drwxr-xr-x  2 user user   64 Jan  1 12:00 tests

# Create some files
touch src/main.js src/utils.js
touch docs/README.md docs/API.md
touch tests/main.test.js

# List all files recursively
find . -type f
# Output:
# ./src/main.js
# ./src/utils.js
# ./docs/README.md
# ./docs/API.md
# ./tests/main.test.js
```

#### File Content Management

```bash
# Create documentation
echo "# My Application" > docs/README.md
echo "" >> docs/README.md
echo "This is a sample application." >> docs/README.md

# Create basic JavaScript file
cat > src/main.js << 'EOF'
function main() {
    console.log("Hello from my app!");
}

main();
EOF

# View file contents
cat docs/README.md
# Output:
# # My Application
#
# This is a sample application.

cat src/main.js
# Output:
# function main() {
#     console.log("Hello from my app!");
# }
#
# main();
```

#### File Operations

```bash
# Copy files
cp src/main.js src/main.backup.js
cp -r docs documentation-backup

# Move and rename
mv src/utils.js src/utilities.js

# Verify changes
ls -la src/
# Output shows renamed and copied files

# Clean up
rm src/main.backup.js
rm -rf documentation-backup
```

### Text Processing Pipeline

Advanced text processing with pipes and filters:

#### Log File Analysis

```bash
# Create sample log file
cat > logs/app.log << 'EOF'
2024-01-01 10:00:00 INFO Application started
2024-01-01 10:01:15 DEBUG Loading configuration
2024-01-01 10:01:20 INFO Configuration loaded successfully
2024-01-01 10:02:30 WARN Deprecated API usage detected
2024-01-01 10:03:45 ERROR Database connection failed
2024-01-01 10:04:00 INFO Retrying database connection
2024-01-01 10:04:10 INFO Database connected successfully
2024-01-01 10:05:00 INFO Processing user requests
EOF

# Count total lines
wc -l logs/app.log
# Output: 8 logs/app.log

# Find error messages
grep "ERROR" logs/app.log
# Output: 2024-01-01 10:03:45 ERROR Database connection failed

# Count different log levels
grep -c "INFO" logs/app.log   # Count INFO messages
grep -c "ERROR" logs/app.log  # Count ERROR messages
grep -c "WARN" logs/app.log   # Count WARN messages

# Extract timestamps from error messages
grep "ERROR" logs/app.log | cut -d' ' -f1-2
# Output: 2024-01-01 10:03:45
```

#### Data Processing Pipeline

```bash
# Create sample data file
cat > data/users.csv << 'EOF'
name,email,age,department
John Doe,john@example.com,30,Engineering
Jane Smith,jane@example.com,25,Marketing
Bob Johnson,bob@example.com,35,Engineering
Alice Brown,alice@example.com,28,Sales
Charlie Wilson,charlie@example.com,32,Engineering
EOF

# Count users by department
grep "Engineering" data/users.csv | wc -l
# Output: 3

# Extract email addresses
grep -v "name,email" data/users.csv | cut -d',' -f2
# Output:
# john@example.com
# jane@example.com
# bob@example.com
# alice@example.com
# charlie@example.com

# Find users over 30
grep -v "name,email" data/users.csv | grep -E ",[3-9][0-9]," | cut -d',' -f1
# Output:
# John Doe
# Bob Johnson
# Charlie Wilson
```

### Command History and Completion

Efficiently using shell history and tab completion:

#### History Management

```bash
# View recent command history
history 10

# Execute previous command
!!

# Execute command from history by number
!5

# Search history for specific commands
history | grep "grep"

# Clear history (if needed)
history -c
```

#### Tab Completion Examples

```bash
# Complete command names (press Tab after typing)
ec<TAB>          # Completes to "echo"
gr<TAB>          # Completes to "grep"

# Complete file paths
cat /ex<TAB>     # Completes to "/examples/"
ls src/m<TAB>    # Completes to "src/main.js"

# Complete environment variables
echo $P<TAB>     # Shows PATH and other P* variables
```

## WASM Development Tutorials

### Creating Your First WASM Program

Step-by-step guide to creating and running custom WASM executables:

#### Hello World Program

```zig
// Create: src/wasm/examples/my-hello.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    shell.println("Hello from my custom WASM program!");
    shell.exit(0);
}
```

Build and test:

```bash
# Navigate to WASM directory
cd src/wasm

# Build the program
zig build-exe examples/my-hello.zig -target wasm32-freestanding -O ReleaseSmall -femit-bin=zig-out/bin/my-hello.wasm

# Test in shell
cd ../..
my-hello
# Output: Hello from my custom WASM program!
```

#### Command-Line Argument Processing

```zig
// Create: src/wasm/examples/greet.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();

    if (args.len < 2) {
        shell.eprint("Usage: greet <name> [title]");
        shell.exit(1);
        return;
    }

    const name = args[1];
    const title = if (args.len > 2) args[2] else "friend";

    shell.print("Hello, ");
    shell.print(title);
    shell.print(" ");
    shell.print(name);
    shell.println("!");

    shell.exit(0);
}
```

Usage examples:

```bash
# Build the program
cd src/wasm
zig build-exe examples/greet.zig -target wasm32-freestanding -O ReleaseSmall -femit-bin=zig-out/bin/greet.wasm

# Test with different arguments
greet Alice
# Output: Hello, friend Alice!

greet Bob "Dr."
# Output: Hello, Dr. Bob!

greet
# Output: Usage: greet <name> [title]
```

#### File Processing Program

```zig
// Create: src/wasm/examples/word-count.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();

    if (args.len < 2) {
        shell.eprintln("Usage: word-count <file>");
        shell.exit(1);
        return;
    }

    const filename = args[1];
    const content = shell.readFile(filename) catch |err| {
        shell.eprint("word-count: cannot read '");
        shell.eprint(filename);
        shell.eprintln("': No such file or directory");
        shell.exit(1);
        return;
    };
    defer shell.free(content);

    var lines: u32 = 0;
    var words: u32 = 0;
    var chars: u32 = 0;
    var in_word = false;

    for (content) |char| {
        chars += 1;

        if (char == '\n') {
            lines += 1;
            in_word = false;
        } else if (char == ' ' or char == '\t') {
            in_word = false;
        } else if (!in_word) {
            words += 1;
            in_word = true;
        }
    }

    shell.print("Lines: ");
    shell.print(@intCast(lines));
    shell.print(", Words: ");
    shell.print(@intCast(words));
    shell.print(", Chars: ");
    shell.print(@intCast(chars));
    shell.println("");

    shell.exit(0);
}
```

Test the word counter:

```bash
# Create test file
echo -e "Hello world\nThis is a test\nWith multiple lines" > test.txt

# Build and run word counter
cd src/wasm
zig build-exe examples/word-count.zig -target wasm32-freestanding -O ReleaseSmall -femit-bin=zig-out/bin/word-count.wasm

word-count test.txt
# Output: Lines: 3, Words: 8, Chars: 38
```

### Advanced WASM Features

#### Environment Variable Usage

```zig
// Create: src/wasm/examples/env-demo.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    shell.println("Environment Demo:");

    // Read common environment variables
    const vars = [_][]const u8{ "HOME", "PATH", "USER", "PROJECT" };

    for (vars) |var_name| {
        shell.print(var_name);
        shell.print("=");

        if (shell.getEnv(var_name)) |value| {
            shell.println(value);
        } else {
            shell.println("(not set)");
        }
    }

    // Set a new variable
    shell.setEnv("DEMO_VAR", "hello from WASM");

    shell.print("Set DEMO_VAR=");
    if (shell.getEnv("DEMO_VAR")) |value| {
        shell.println(value);
    }

    shell.exit(0);
}
```

#### Directory Operations

```zig
// Create: src/wasm/examples/file-explorer.zig
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    const args = shell.getArgs();
    const path = if (args.len > 1) args[1] else shell.getCwd();

    shell.print("Exploring directory: ");
    shell.println(path);
    shell.println("");

    const entries = shell.listDirectory(path) catch |err| {
        shell.eprint("Cannot read directory: ");
        shell.println(path);
        shell.exit(1);
        return;
    };
    defer shell.freeStringArray(entries);

    for (entries) |entry| {
        const full_path = shell.joinPath(path, entry);
        defer shell.free(full_path);

        if (shell.isDirectory(full_path)) {
            shell.print("[DIR]  ");
        } else {
            shell.print("[FILE] ");
        }
        shell.println(entry);
    }

    shell.exit(0);
}
```

## Advanced Shell Workflows

### Automation Scripts

Creating reusable shell workflows:

#### Project Setup Script

```bash
# Create: setup-project.sh
#!/bin/moo-dang

# Project setup automation script
export PROJECT_NAME="${1:-my-project}"

echo "Setting up project: $PROJECT_NAME"

# Create directory structure
mkdir -p "$PROJECT_NAME"/{src,docs,tests,build}

# Navigate to project
cd "$PROJECT_NAME"

# Create basic files
touch src/main.js
touch docs/README.md
touch tests/main.test.js

# Create package.json equivalent
cat > project.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "Generated project structure"
}
EOF

# Create README
cat > docs/README.md << EOF
# $PROJECT_NAME

This project was generated using the moo-dang shell automation script.

## Structure

- \`src/\` - Source code
- \`docs/\` - Documentation
- \`tests/\` - Test files
- \`build/\` - Build artifacts

## Getting Started

Add your project documentation here.
EOF

echo "Project $PROJECT_NAME created successfully!"
echo "Structure:"
find . -type f | head -10
```

Usage:

```bash
# Make script executable and run
chmod +x setup-project.sh
./setup-project.sh my-awesome-app
```

#### Log Analysis Pipeline

```bash
# Advanced log processing workflow
export LOG_FILE="application.log"
export OUTPUT_DIR="log-analysis"

# Create analysis directory
mkdir -p "$OUTPUT_DIR"

# Extract different log levels
grep "ERROR" "$LOG_FILE" > "$OUTPUT_DIR/errors.log"
grep "WARN" "$LOG_FILE" > "$OUTPUT_DIR/warnings.log"
grep "INFO" "$LOG_FILE" > "$OUTPUT_DIR/info.log"

# Generate summary report
cat > "$OUTPUT_DIR/summary.txt" << EOF
Log Analysis Summary
===================

Total Lines: $(wc -l < "$LOG_FILE")
Error Count: $(grep -c "ERROR" "$LOG_FILE")
Warning Count: $(grep -c "WARN" "$LOG_FILE")
Info Count: $(grep -c "INFO" "$LOG_FILE")

Most Recent Error:
$(grep "ERROR" "$LOG_FILE" | tail -1)

Most Recent Warning:
$(grep "WARN" "$LOG_FILE" | tail -1)
EOF

echo "Log analysis complete. Results in $OUTPUT_DIR/"
```

### Data Processing Workflows

#### CSV Data Processing

```bash
# Process CSV data with shell commands
export DATA_FILE="sales-data.csv"

# Sample CSV data
cat > "$DATA_FILE" << 'EOF'
date,product,quantity,price,region
2024-01-01,Widget A,10,25.00,North
2024-01-01,Widget B,5,30.00,South
2024-01-02,Widget A,8,25.00,East
2024-01-02,Widget C,12,35.00,North
2024-01-03,Widget B,15,30.00,West
EOF

# Extract unique products
echo "Products:"
grep -v "date,product" "$DATA_FILE" | cut -d',' -f2 | sort | uniq

# Calculate total quantity by product
echo ""
echo "Quantity by Product:"
for product in $(grep -v "date,product" "$DATA_FILE" | cut -d',' -f2 | sort | uniq); do
    total=$(grep "$product" "$DATA_FILE" | cut -d',' -f3 | awk '{sum += $1} END {print sum}')
    echo "$product: $total"
done

# Find high-value transactions (price * quantity > 200)
echo ""
echo "High-Value Transactions:"
grep -v "date,product" "$DATA_FILE" | while IFS=',' read date product quantity price region; do
    value=$(echo "$quantity * $price" | bc)
    if [ "$value" -gt 200 ]; then
        echo "$date: $product ($quantity × $price = $value) in $region"
    fi
done
```

### Performance Monitoring

#### System Resource Monitoring

```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/moo-dang

echo "=== moo-dang Shell Monitoring ==="
echo "Timestamp: $(date)"
echo ""

# Monitor WASM module cache
echo "WASM Module Status:"
if [ -d "src/wasm/zig-out/bin" ]; then
    echo "Available modules:"
    ls -lh src/wasm/zig-out/bin/*.wasm | wc -l
    echo "Total size:"
    du -sh src/wasm/zig-out/bin/ 2>/dev/null || echo "No modules found"
fi

# Check virtual file system usage
echo ""
echo "Virtual File System:"
echo "Total files: $(find / -type f 2>/dev/null | wc -l)"
echo "Total directories: $(find / -type d 2>/dev/null | wc -l)"

# Command history stats
echo ""
echo "Shell Usage:"
echo "History entries: $(history | wc -l)"
echo "Most used commands:"
history | awk '{print $2}' | sort | uniq -c | sort -nr | head -5

echo ""
echo "=== End Monitoring Report ==="
EOF

chmod +x monitor.sh
./monitor.sh
```

## Integration Examples

### React Component Integration

Example of integrating moo-dang terminal into a React application:

```tsx
// Terminal integration component
import {useEffect, useRef, useState} from 'react'
import {Terminal} from '@/components/Terminal'

interface ShellIntegrationProps {
  onCommandExecuted?: (command: string, result: string) => void
  initialCommands?: string[]
}

export function ShellIntegration({onCommandExecuted, initialCommands = []}: ShellIntegrationProps) {
  const terminalRef = useRef<TerminalHandle>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isReady && initialCommands.length > 0) {
      // Execute initial commands
      initialCommands.forEach(command => {
        terminalRef.current?.executeCommand(command)
      })
    }
  }, [isReady, initialCommands])

  const handleCommand = (command: string, result: string) => {
    console.log(`Executed: ${command}`)
    onCommandExecuted?.(command, result)
  }

  return (
    <div className="shell-container">
      <h2>Interactive Shell</h2>
      <Terminal
        ref={terminalRef}
        onReady={() => setIsReady(true)}
        onCommand={handleCommand}
        theme="dark"
        className="custom-terminal"
      />
    </div>
  )
}

// Usage example
function App() {
  const handleCommandExecution = (command: string, result: string) => {
    // Log to external system
    console.log('Command logged:', {command, result, timestamp: new Date()})
  }

  const setupCommands = [
    'cd /examples',
    'ls -la',
    'echo "Shell initialized successfully"'
  ]

  return (
    <div className="app">
      <ShellIntegration
        onCommandExecuted={handleCommandExecution}
        initialCommands={setupCommands}
      />
    </div>
  )
}
```

### API Integration

Connecting shell commands to external APIs:

```bash
# Create API integration script
cat > api-client.sh << 'EOF'
#!/bin/moo-dang

# Simple API client using moo-dang shell
export API_BASE="https://api.example.com"
export API_KEY="${API_KEY:-demo-key}"

# Function to make API call (simulated with echo)
api_call() {
    local endpoint="$1"
    local method="${2:-GET}"

    echo "API Call: $method $API_BASE$endpoint"
    echo "Headers: Authorization: Bearer $API_KEY"
    echo "Response: {\"status\": \"success\", \"data\": \"sample\"}"
}

# CLI interface
case "$1" in
    "users")
        api_call "/users" "GET"
        ;;
    "create-user")
        if [ -z "$2" ]; then
            echo "Usage: $0 create-user <username>"
            exit 1
        fi
        api_call "/users" "POST"
        echo "Body: {\"username\": \"$2\"}"
        ;;
    "status")
        api_call "/health" "GET"
        ;;
    *)
        echo "Available commands:"
        echo "  users       - List all users"
        echo "  create-user - Create a new user"
        echo "  status      - Check API status"
        ;;
esac
EOF

chmod +x api-client.sh

# Usage examples
./api-client.sh status
./api-client.sh users
./api-client.sh create-user john_doe
```

## Troubleshooting Examples

### Debugging WASM Programs

#### Adding Debug Output

```zig
// Debug version of a WASM program
const shell = @import("../src/shell_api.zig");

pub fn main() void {
    // Enable debug mode via environment variable
    const debug = shell.getEnv("DEBUG") != null;

    if (debug) {
        shell.eprintln("[DEBUG] Starting program");
        shell.eprintln("[DEBUG] Checking arguments");
    }

    const args = shell.getArgs();

    if (debug) {
        shell.eprint("[DEBUG] Argument count: ");
        shell.eprint(@intCast(args.len));
        shell.eprintln("");
    }

    if (args.len < 2) {
        if (debug) {
            shell.eprintln("[DEBUG] Insufficient arguments");
        }
        shell.eprintln("Usage: program <input>");
        shell.exit(1);
        return;
    }

    // Main program logic
    shell.print("Processing: ");
    shell.println(args[1]);

    if (debug) {
        shell.eprintln("[DEBUG] Program completed successfully");
    }

    shell.exit(0);
}
```

Usage with debugging:

```bash
# Normal execution
my-program test-input

# Debug execution
export DEBUG=1
my-program test-input
# Shows debug output on stderr
```

### Common Error Resolution

#### File Not Found Issues

```bash
# Diagnose file issues
diagnose_file() {
    local file="$1"

    echo "Diagnosing file: $file"
    echo "=================="

    if [ -e "$file" ]; then
        echo "✓ File exists"

        if [ -f "$file" ]; then
            echo "✓ Is a regular file"
            echo "  Size: $(wc -c < "$file") bytes"
            echo "  Lines: $(wc -l < "$file")"
        elif [ -d "$file" ]; then
            echo "ℹ Is a directory"
            echo "  Contents: $(ls -1 "$file" | wc -l) items"
        fi

        echo "  Permissions: $(ls -ld "$file" | cut -d' ' -f1)"
    else
        echo "✗ File does not exist"
        echo "  Parent directory: $(dirname "$file")"

        if [ -d "$(dirname "$file")" ]; then
            echo "  ✓ Parent directory exists"
            echo "  Similar files:"
            ls -la "$(dirname "$file")" | grep "$(basename "$file" | cut -c1-3)"
        else
            echo "  ✗ Parent directory does not exist"
        fi
    fi

    echo ""
}

# Usage
diagnose_file "/examples/missing-file.txt"
diagnose_file "/examples/hello.txt"
```

#### WASM Module Loading Issues

```bash
# WASM diagnostics script
wasm_diagnostics() {
    echo "WASM Diagnostics"
    echo "==============="

    # Check WASM directory structure
    if [ -d "src/wasm" ]; then
        echo "✓ WASM source directory exists"

        if [ -d "src/wasm/zig-out/bin" ]; then
            echo "✓ WASM output directory exists"
            echo "  Built modules:"
            ls -la src/wasm/zig-out/bin/*.wasm 2>/dev/null | wc -l
            echo ""
            echo "  Module sizes:"
            ls -lh src/wasm/zig-out/bin/*.wasm 2>/dev/null
        else
            echo "✗ WASM output directory missing"
            echo "  Try: pnpm build:wasm"
        fi

        if [ -f "src/wasm/build.zig" ]; then
            echo "✓ Build configuration exists"
        else
            echo "✗ Build configuration missing"
        fi
    else
        echo "✗ WASM source directory missing"
    fi

    echo ""
    echo "Environment Check:"
    echo "=================="

    # Check Zig installation
    if command -v zig >/dev/null 2>&1; then
        echo "✓ Zig compiler available: $(zig version)"
    else
        echo "✗ Zig compiler not found"
        echo "  Install from: https://ziglang.org/"
    fi

    echo ""
}

wasm_diagnostics
```

### Performance Analysis

#### Command Timing

```bash
# Time command execution
time_command() {
    local command="$*"
    local start_time=$(date +%s%N)

    echo "Executing: $command"
    eval "$command"
    local exit_code=$?

    local end_time=$(date +%s%N)
    local duration=$((($end_time - $start_time) / 1000000))

    echo ""
    echo "Execution completed:"
    echo "  Exit code: $exit_code"
    echo "  Duration: ${duration}ms"

    return $exit_code
}

# Usage examples
time_command "ls -la /examples"
time_command "grep 'pattern' /large-file.txt"
time_command "hello"
```

#### Memory Usage Analysis

```bash
# Analyze shell memory usage
memory_analysis() {
    echo "Memory Analysis"
    echo "=============="

    # File system usage
    echo "Virtual File System:"
    echo "  Files: $(find / -type f 2>/dev/null | wc -l)"
    echo "  Directories: $(find / -type d 2>/dev/null | wc -l)"
    echo ""

    # WASM module cache
    echo "WASM Module Cache:"
    if [ -d "src/wasm/zig-out/bin" ]; then
        local module_count=$(ls -1 src/wasm/zig-out/bin/*.wasm 2>/dev/null | wc -l)
        local total_size=$(du -sb src/wasm/zig-out/bin/ 2>/dev/null | cut -f1)

        echo "  Cached modules: $module_count"
        echo "  Total size: $total_size bytes"
        echo "  Average size: $((total_size / (module_count + 1))) bytes"
    else
        echo "  No modules cached"
    fi

    echo ""
    echo "Command History:"
    echo "  Entries: $(history | wc -l)"
    echo ""
}

memory_analysis
```

These examples provide a comprehensive foundation for using moo-dang effectively, from basic operations to advanced automation and troubleshooting scenarios.
