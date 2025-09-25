#!/usr/bin/env bash

# WASM Executable Generator for moo-dang Shell
# Creates new WASM executables from template with customization

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_DIR="$(dirname "$SCRIPT_DIR")/src/wasm"
TEMPLATE_FILE="$WASM_DIR/examples/template.zig"
BUILD_FILE="$WASM_DIR/build.zig"

show_help() {
    cat << EOF
WASM Executable Generator for moo-dang Shell

Usage: $0 <name> [options]

Arguments:
    name                Name of the new executable (required)

Options:
    -d, --description   Description for the executable
    -v, --version      Version string (default: 1.0.0)
    -h, --help         Show this help message

Examples:
    $0 mytool
    $0 myapp --description "Custom shell utility"
    $0 advanced-tool -d "Advanced processing tool" -v "2.1.0"

The generator will:
1. Create a new .zig file in the examples/ directory
2. Customize the template with your name/description/version
3. Update build.zig to include the new executable
4. Provide instructions for building and testing

EOF
}

parse_args() {
    if [ $# -eq 1 ] && [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi

    if [ $# -eq 0 ]; then
        echo -e "${RED}Error: Executable name is required${NC}"
        show_help
        exit 1
    fi

    EXECUTABLE_NAME="$1"
    shift

    DESCRIPTION="Custom WASM executable for moo-dang shell"
    VERSION="1.0.0"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--description)
                DESCRIPTION="$2"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}Error: Unknown option '$1'${NC}"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ ! "$EXECUTABLE_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
        echo -e "${RED}Error: Invalid executable name '$EXECUTABLE_NAME'${NC}"
        echo "Name must start with a letter and contain only letters, numbers, underscores, and hyphens"
        exit 1
    fi
}

check_prerequisites() {
    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found at $TEMPLATE_FILE${NC}"
        exit 1
    fi

    if [ ! -f "$BUILD_FILE" ]; then
        echo -e "${RED}Error: Build configuration not found at $BUILD_FILE${NC}"
        exit 1
    fi

    if [ ! -d "$WASM_DIR/examples" ]; then
        echo -e "${YELLOW}Creating examples directory...${NC}"
        mkdir -p "$WASM_DIR/examples"
    fi
}

generate_executable() {
    local output_file="$WASM_DIR/examples/$EXECUTABLE_NAME.zig"

    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}Warning: File $output_file already exists${NC}"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted"
            exit 1
        fi
    fi

    echo -e "${BLUE}Generating $output_file...${NC}"

    sed -e "s/template/$EXECUTABLE_NAME/g" \
        -e "s/Template for creating new WASM executables for the moo-dang shell./$DESCRIPTION/g" \
        -e "s/const VERSION: \[\]const u8 = \"1.0.0\";/const VERSION: []const u8 = \"$VERSION\";/g" \
        -e "s/const PROGRAM_NAME: \[\]const u8 = \"template\";/const PROGRAM_NAME: []const u8 = \"$EXECUTABLE_NAME\";/g" \
        -e "s/const PROGRAM_DESCRIPTION: \[\]const u8 = \"Template WASM executable demonstrating shell API usage\";/const PROGRAM_DESCRIPTION: []const u8 = \"$DESCRIPTION\";/g" \
        "$TEMPLATE_FILE" > "$output_file"

    echo -e "${GREEN}✓ Created $output_file${NC}"
}

update_build_config() {
    local temp_file=$(mktemp)
    local new_entry="    .{ .name = \"$EXECUTABLE_NAME\", .description = \"$DESCRIPTION\" },"

    echo -e "${BLUE}Updating build configuration...${NC}"

    awk -v new_entry="$new_entry" '
        /^const examples = \[_\]Example\{/ {
            print $0
            in_array = 1
            next
        }
        in_array && /^\};/ {
            print new_entry
            print $0
            in_array = 0
            next
        }
        { print $0 }
    ' "$BUILD_FILE" > "$temp_file"

    if grep -q "$EXECUTABLE_NAME" "$temp_file"; then
        mv "$temp_file" "$BUILD_FILE"
        echo -e "${GREEN}✓ Updated build configuration${NC}"
    else
        rm "$temp_file"
        echo -e "${YELLOW}Warning: Could not automatically update build.zig${NC}"
        echo "Please manually add the following entry to the examples array:"
        echo "    $new_entry"
    fi
}

show_next_steps() {
    cat << EOF

${GREEN}✅ Executable '$EXECUTABLE_NAME' created successfully!${NC}

${YELLOW}Next steps:${NC}

1. ${BLUE}Build your new executable:${NC}
   cd $WASM_DIR
   zig build examples

2. ${BLUE}Test the build:${NC}
   ls zig-out/bin/$EXECUTABLE_NAME.wasm

3. ${BLUE}Run the executable in the shell:${NC}
   # Start the moo-dang app and run:
   $EXECUTABLE_NAME
   $EXECUTABLE_NAME --help

4. ${BLUE}Customize your executable:${NC}
   # Edit: $WASM_DIR/examples/$EXECUTABLE_NAME.zig
   # Implement your custom logic in main() and helper functions

5. ${BLUE}Build the entire project:${NC}
   cd $(dirname "$WASM_DIR")
   npm run build:wasm

${YELLOW}Files created/modified:${NC}
- $WASM_DIR/examples/$EXECUTABLE_NAME.zig
- $BUILD_FILE (updated)

${YELLOW}Template features included:${NC}
- Command-line argument processing
- Environment variable access
- Standard I/O operations
- Error handling patterns
- Help and version commands
- Multiple exported functions

🚀

EOF
}

main() {
    echo -e "${BLUE}WASM Executable Generator for moo-dang Shell${NC}\n"

    parse_args "$@"
    check_prerequisites
    generate_executable
    update_build_config
    show_next_steps
}

main "$@"
