#!/usr/bin/env bash

# Build script for moo-dang WASM executables
# This script compiles all Zig WASM executables and copies them to the public directory

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
WASM_DIR="src/wasm"
BUILD_DIR="$WASM_DIR/zig-out/bin"
PUBLIC_DIR="public/wasm"

echo -e "${YELLOW}Building Zig WASM executables...${NC}"

# Check if Zig is available
if ! command -v zig &> /dev/null; then
    echo -e "${RED}Error: Zig compiler not found. Please install Zig: https://ziglang.org/download/${NC}"
    exit 1
fi

# Create public/wasm directory if it doesn't exist
mkdir -p "$PUBLIC_DIR"

# Change to WASM directory
cd "$WASM_DIR"

echo "Current directory: $(pwd)"
echo "Building WASM executables..."

# Build all examples
zig build examples

# Check if build was successful
if [ ! -d "zig-out/bin" ]; then
    echo -e "${RED}Error: Build failed - no output directory found${NC}"
    exit 1
fi

# Go back to app root
cd ../..

echo "Copying WASM files to public directory..."

# Copy WASM files to public directory
for wasm_file in "$BUILD_DIR"/*.wasm; do
    if [ -f "$wasm_file" ]; then
        filename=$(basename "$wasm_file")
        cp "$wasm_file" "$PUBLIC_DIR/"
        echo -e "${GREEN}✓ Copied $filename${NC}"
    fi
done

echo -e "${GREEN}WASM build completed successfully!${NC}"
echo -e "WASM files available in: ${YELLOW}$PUBLIC_DIR${NC}"

# List built files
echo "Built executables:"
ls -la "$PUBLIC_DIR"/*.wasm 2>/dev/null || echo "No WASM files found"
