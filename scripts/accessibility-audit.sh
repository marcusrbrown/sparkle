#!/bin/bash

# Comprehensive Accessibility Audit Script for Form Components
# This script runs multiple accessibility testing tools against the Form components

set -e

echo "🔍 Starting comprehensive accessibility audit for Form components..."
echo ""

# Check if Storybook is running
if ! curl -s http://localhost:6006 > /dev/null; then
    echo "❌ Storybook is not running. Please start it with 'pnpm dev' first."
    exit 1
fi

echo "✅ Storybook is running on http://localhost:6006"
echo ""

# Test Form stories with axe-core
echo "🔧 Running axe-core accessibility tests on Form stories..."

# Create URLs for Form component stories
FORM_STORIES=(
    "http://localhost:6006/iframe.html?id=form--default"
    "http://localhost:6006/iframe.html?id=form--validation-states"
    "http://localhost:6006/iframe.html?id=form--field-types"
    "http://localhost:6006/iframe.html?id=form--size-variants"
    "http://localhost:6006/iframe.html?id=form--accessibility-demo"
    "http://localhost:6006/iframe.html?id=form--complex-form"
)

echo "Testing ${#FORM_STORIES[@]} Form component stories..."

# Run axe tests on each story
for story_url in "${FORM_STORIES[@]}"; do
    story_name=$(echo "$story_url" | grep -o 'id=form--[^&]*' | sed 's/id=form--//')
    echo ""
    echo "📝 Testing story: $story_name"
    echo "   URL: $story_url"

    # Wait a moment for story to load
    sleep 2

    # Run axe-core test
    if npx axe "$story_url" --timeout 10000; then
        echo "   ✅ $story_name: No accessibility violations found"
    else
        echo "   ❌ $story_name: Accessibility violations detected (see details above)"
    fi
done

echo ""
echo "🚀 Running Lighthouse accessibility audit on main Form story..."

# Run Lighthouse accessibility audit on primary Form story
npx lhci autorun --upload.target=filesystem --upload.outputDir=./lighthouse-reports --collect.url="http://localhost:6006/iframe.html?id=form--default" --collect.settings.chromeFlags="--no-sandbox" || true

echo ""
echo "📊 Accessibility audit summary:"
echo "   - axe-core tests completed for all Form stories"
echo "   - Lighthouse report generated in ./lighthouse-reports/"
echo "   - Check Storybook's Accessibility addon panel for interactive testing"
echo ""

echo "🎯 Manual accessibility testing checklist:"
echo "   □ Test keyboard navigation (Tab, Shift+Tab, Enter, Escape)"
echo "   □ Test with screen reader (VoiceOver on macOS)"
echo "   □ Verify color contrast meets WCAG 2.1 AA standards"
echo "   □ Test form validation announcements"
echo "   □ Verify focus indicators are visible"
echo "   □ Test error message associations"
echo ""

echo "✅ Accessibility audit completed!"
echo "   Open http://localhost:6006 and check the Accessibility tab for interactive testing"
