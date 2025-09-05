# Visual Regression Testing for Sparkle Theme System

This directory contains comprehensive visual regression tests for the Sparkle Design System's theme management package. These tests ensure that themed components render consistently across different themes and maintain visual integrity when changes are made to the theme system.

## Overview

The visual regression testing suite uses **Playwright** to capture screenshots of themed components in various states and configurations. Tests are run across multiple browsers and themes to ensure cross-platform consistency.

## Test Structure

### Test Files

- **`button.visual.test.ts`** - Tests for Button component across all variants and themes
- **`form.visual.test.ts`** - Tests for Form component and form controls in different themes
- **`theme-showcase.visual.test.ts`** - Tests for ThemeShowcase component and design token displays
- **`theme-integration.visual.test.ts`** - Cross-component integration and theme transition tests
- **`utils.ts`** - Utility functions for theme management and test helpers

### Test Coverage

#### Components Tested

- **Button Component**: All variants (primary, secondary, outline), sizes (sm, md, lg), semantic colors (success, warning, error), and states (focused, disabled)
- **Form Component**: Text inputs, validation states, disabled fields, focus states, different input types
- **ThemeShowcase Component**: Complete design token system, color palettes, typography, spacing, shadows, borders
- **Cross-Component Integration**: Multi-component layouts, theme transitions, responsive behavior

#### Themes Tested

- **Light Theme**: Default light appearance
- **Dark Theme**: Dark mode appearance
- **System Theme**: System preference-based theming
- **Custom Themes**: Brand customizations and extended palettes

#### Browsers Tested

- **Desktop Chrome** (Light & Dark themes)
- **Desktop Firefox** (Light & Dark themes)
- **Mobile Safari** (Light & Dark themes)

#### Viewports Tested

- **Mobile**: 375×667 (iPhone-sized)
- **Tablet**: 768×1024 (iPad-sized)
- **Desktop**: 1280×720 (Standard desktop)
- **Desktop Large**: 1920×1080 (Large desktop)

## Running Tests

### Prerequisites

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Install Playwright browsers**:

   ```bash
   pnpm test:install
   ```

3. **Start Storybook** (in separate terminal):
   ```bash
   pnpm dev
   ```

### Test Commands

```bash
# Run all visual regression tests
pnpm test:visual

# Run tests with browser UI (interactive mode)
pnpm test:visual:ui

# Run tests in headed mode (see browser)
pnpm test:visual:headed

# Debug specific test failures
pnpm test:visual:debug

# Update baseline screenshots (use carefully!)
pnpm test:visual:update
```

### From Root Directory

```bash
# Run visual tests using Turborepo
pnpm turbo test:visual --filter=@sparkle/storybook
```

## Configuration

### Playwright Configuration

The `playwright.config.ts` file configures:

- **Test Directory**: `./test/visual-regression`
- **Test Pattern**: `**/*.visual.test.ts`
- **Screenshot Thresholds**: 20-30% difference tolerance
- **Browser Matrix**: Chrome, Firefox, Safari across different themes
- **Timeouts**: Appropriate waits for component loading and theme transitions
- **Retry Logic**: 2 retries on CI, 0 locally

### Visual Comparison Settings

```typescript
// Visual comparison configuration in playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      threshold: 0.2, // 20% difference threshold
    },
    toMatchSnapshot: {
      threshold: 0.3, // 30% threshold for snapshot comparison
    },
  },
  // ... other configuration
})
```

## Understanding Test Results

### Successful Tests

When tests pass, it means:

- Components render identically to baseline screenshots
- Theme switching works consistently
- No visual regressions have been introduced

### Failed Tests

When tests fail, investigate:

- **Expected visual changes**: New features or intentional design updates
- **Unintended regressions**: Broken styling or theme application
- **Environmental differences**: Font rendering, browser updates, OS changes

### Test Report

After running tests, view the HTML report:

```bash
npx playwright show-report test-results/visual-regression-report
```

## Maintaining Tests

### Adding New Component Tests

1. **Create test file**: `new-component.visual.test.ts`
2. **Follow naming pattern**: `component-variant-theme.png`
3. **Test both themes**: Light and dark mode variants
4. **Include interactions**: Focus states, hover effects, error states
5. **Use utilities**: Leverage `utils.ts` for consistent theme switching

### Updating Baselines

⚠️ **CAUTION**: Only update baselines when you've verified the visual changes are intentional.

```bash
# Update all baselines
pnpm test:visual:update

# Update specific test
pnpm test:visual:update -- --grep "Button Component"

# Update specific browser
pnpm test:visual:update -- --project="Desktop Chrome - Light Theme"
```

### Best Practices

1. **Stable Selectors**: Use `data-testid` attributes for reliable element selection
2. **Wait for Loading**: Always wait for components and theme transitions to complete
3. **Consistent State**: Reset forms and component states between tests
4. **Focused Screenshots**: Capture specific components rather than entire pages
5. **Meaningful Names**: Use descriptive screenshot filenames that indicate component, variant, and theme

## Troubleshooting

### Common Issues

#### Flaky Tests

- **Cause**: Timing issues with theme transitions or component loading
- **Solution**: Increase wait times in `WAIT_TIMES` constants

#### Font Rendering Differences

- **Cause**: OS-specific font rendering variations
- **Solution**: Use higher threshold values or font-display: swap

#### CI/CD Failures

- **Cause**: Different rendering engines between local and CI
- **Solution**: Use Docker containers or adjust thresholds for CI

#### Screenshot Differences

- **Cause**: Browser updates, dependency changes, or theme modifications
- **Solution**: Review changes carefully and update baselines if intentional

### Debug Commands

```bash
# Run single test file
npx playwright test button.visual.test.ts

# Run with debug output
npx playwright test --debug

# Generate trace files
npx playwright test --trace on

# Show test in browser
npx playwright test --headed --slowMo=1000
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright
        run: pnpm test:install
      - name: Build Storybook
        run: pnpm turbo build --filter=@sparkle/storybook
      - name: Run visual tests
        run: pnpm turbo test:visual --filter=@sparkle/storybook
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-test-results
          path: packages/storybook/test-results/
```

## File Structure

```text
test/visual-regression/
├── button.visual.test.ts           # Button component tests
├── form.visual.test.ts             # Form component tests
├── theme-showcase.visual.test.ts   # ThemeShowcase tests
├── theme-integration.visual.test.ts # Cross-component tests
└── utils.ts                        # Test utilities

test-results/
├── visual-regression-report/       # HTML test report
├── playwright-output/              # Test artifacts
└── screenshots/                    # Baseline screenshots
    ├── button-primary-light.png
    ├── button-primary-dark.png
    └── ...
```

## Performance Considerations

- **Parallel Execution**: Tests run in parallel across browsers for speed
- **Selective Testing**: Use `--grep` patterns to run specific test subsets
- **Caching**: Screenshots are cached to speed up subsequent runs
- **Resource Cleanup**: Test artifacts are cleaned up automatically

## Contributing

When contributing to visual regression tests:

1. **Write comprehensive tests** for new components
2. **Document test scenarios** in component test files
3. **Follow naming conventions** for screenshots and test descriptions
4. **Test across all supported themes** and viewports
5. **Verify baselines** before committing screenshot updates
6. **Update documentation** when adding new test patterns

For questions or issues with visual regression testing, please refer to the main project documentation or open an issue in the repository.
