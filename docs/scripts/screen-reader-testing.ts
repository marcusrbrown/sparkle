#!/usr/bin/env tsx

/**
 * Screen Reader Testing Documentation Generator
 *
 * Generates comprehensive screen reader testing guides, procedures, and result templates
 * for NVDA, JAWS, VoiceOver, and ORCA screen readers to ensure WCAG 2.1 AA compliance.
 */

import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

interface ScreenReaderInfo {
  name: string
  platform: string
  type: 'free' | 'commercial' | 'built-in'
  downloadUrl?: string
  shortcuts: Record<string, string>
  testingNotes: string[]
}

interface TestCase {
  id: string
  title: string
  category: string
  description: string
  steps: string[]
  expectedBehavior: string[]
  wcagCriteria: string[]
}

/**
 * Screen reader configurations and information
 */
const SCREEN_READERS: ScreenReaderInfo[] = [
  {
    name: 'NVDA',
    platform: 'Windows',
    type: 'free',
    downloadUrl: 'https://www.nvaccess.org/download/',
    shortcuts: {
      'Start/Stop': 'Ctrl + Alt + N',
      'Next Heading': 'H',
      'Next Link': 'K',
      'Next Button': 'B',
      'Next Form Field': 'F',
      'Next List': 'L',
      'Next Table': 'T',
      'Next Landmark': 'D',
      'Elements List': 'NVDA + F7',
      'Read Next': 'Down Arrow',
      'Read Previous': 'Up Arrow',
      'Say All': 'NVDA + Down Arrow',
    },
    testingNotes: [
      'NVDA is the most popular free screen reader for Windows',
      'Highly compatible with Firefox and Chrome browsers',
      'Excellent support for ARIA attributes and modern web standards',
      'Regularly updated with new features and bug fixes',
    ],
  },
  {
    name: 'JAWS',
    platform: 'Windows',
    type: 'commercial',
    downloadUrl: 'https://www.freedomscientific.com/products/software/jaws/',
    shortcuts: {
      'Next Heading': 'H',
      'Next Link': 'K',
      'Next Button': 'B',
      'Next Form Field': 'F',
      'Next List': 'L',
      'Next Table': 'T',
      'Next Landmark': 'R',
      'Elements List': 'Insert + F7',
      'Read Next': 'Down Arrow',
      'Read Previous': 'Up Arrow',
      'Say All': 'Insert + Down Arrow',
      'Virtual Cursor On/Off': 'Insert + Z',
    },
    testingNotes: [
      'JAWS is the most widely used commercial screen reader',
      'Excellent enterprise support and training resources',
      'Offers 40-minute demo mode for testing without purchase',
      'Strong compatibility with Windows applications and browsers',
    ],
  },
  {
    name: 'VoiceOver',
    platform: 'macOS/iOS',
    type: 'built-in',
    shortcuts: {
      'Start/Stop': 'Command + F5',
      'Next Heading': 'VO + Command + H',
      'Next Link': 'VO + Command + L',
      'Next Form Control': 'VO + Command + J',
      'Next List': 'VO + Command + X',
      'Next Table': 'VO + Command + T',
      Rotor: 'VO + U',
      'Read Next': 'VO + Right Arrow',
      'Read Previous': 'VO + Left Arrow',
      'Interact with Element': 'VO + Shift + Down Arrow',
      'Stop Interacting': 'VO + Shift + Up Arrow',
    },
    testingNotes: [
      'VoiceOver is built into all Apple devices at no additional cost',
      'Excellent integration with Safari browser on macOS',
      'Touch gestures available on iOS for mobile testing',
      'Uses "Rotor" for quick navigation to specific element types',
    ],
  },
  {
    name: 'ORCA',
    platform: 'Linux',
    type: 'built-in',
    shortcuts: {
      'Start/Stop': 'Super + Alt + S',
      'Next Heading': 'H',
      'Next Link': 'K',
      'Next Button': 'B',
      'Next Form Field': 'Tab',
      'Next List': 'L',
      'Next Table': 'T',
      'Read Next': 'KP_Add (Numpad Plus)',
      'Read Previous': 'KP_Enter (Numpad Enter)',
      'Say All': 'KP_Add (Numpad Plus, twice)',
    },
    testingNotes: [
      'ORCA is the default screen reader for many Linux distributions',
      'Works well with Firefox and Chrome on Linux',
      'Free and open-source with active community support',
      'Configuration may vary by Linux distribution',
    ],
  },
]

/**
 * Comprehensive test cases for screen reader testing
 */
const TEST_CASES: TestCase[] = [
  {
    id: 'SR-001',
    title: 'Page Title and Language Announcement',
    category: 'Page Structure',
    description: 'Verify that the page title and language are announced correctly when page loads',
    steps: [
      'Navigate to the documentation homepage',
      'Listen to the initial announcement when screen reader loads the page',
      'Verify page title is announced',
      'Check that language is correctly identified',
    ],
    expectedBehavior: [
      'Screen reader announces the page title clearly',
      'Language is identified as English (or appropriate language)',
      'No errors or warnings about page structure',
    ],
    wcagCriteria: ['2.4.2 Page Titled', '3.1.1 Language of Page'],
  },
  {
    id: 'SR-002',
    title: 'Heading Navigation and Hierarchy',
    category: 'Content Structure',
    description: 'Test navigation through headings using screen reader heading shortcuts',
    steps: [
      'Press the heading navigation key (H) to jump between headings',
      'Navigate through all headings on the page',
      'Verify heading levels are announced correctly (H1, H2, H3, etc.)',
      'Check that heading hierarchy is logical and sequential',
    ],
    expectedBehavior: [
      'Each heading is announced with its level (e.g., "Heading level 2, Introduction")',
      'Heading hierarchy follows logical order (H1 → H2 → H3)',
      'No headings are skipped in the hierarchy',
      'Heading content accurately describes the section',
    ],
    wcagCriteria: ['1.3.1 Info and Relationships', '2.4.6 Headings and Labels'],
  },
  {
    id: 'SR-003',
    title: 'Landmark Navigation',
    category: 'Page Structure',
    description: 'Test navigation through page landmarks (main, navigation, complementary, etc.)',
    steps: [
      'Use landmark navigation key to jump between regions',
      'Identify all landmarks on the page (header, nav, main, aside, footer)',
      'Verify each landmark is properly labeled',
      'Test "skip to main content" link',
    ],
    expectedBehavior: [
      'All major page regions are identified as landmarks',
      'Landmarks have appropriate labels (e.g., "navigation", "main content")',
      'Skip navigation link works and jumps to main content',
      'No unlabeled or ambiguous landmarks',
    ],
    wcagCriteria: ['2.4.1 Bypass Blocks', '1.3.1 Info and Relationships'],
  },
  {
    id: 'SR-004',
    title: 'Link Announcement and Purpose',
    category: 'Navigation',
    description: 'Verify that links are announced with clear purpose and context',
    steps: [
      'Navigate through all links using link navigation key (K)',
      'Listen to how each link is announced',
      'Check if link purpose is clear from announcement alone',
      'Test links in navigation and content areas',
    ],
    expectedBehavior: [
      'Links are announced as "link" followed by link text',
      'Link purpose is clear from text alone (avoid "click here" or "read more")',
      'Link state is announced (visited/unvisited if applicable)',
      'External links are clearly identified',
    ],
    wcagCriteria: ['2.4.4 Link Purpose (In Context)', '4.1.2 Name, Role, Value'],
  },
  {
    id: 'SR-005',
    title: 'Button Identification and State',
    category: 'Interactive Elements',
    description: 'Test that buttons are properly identified with role, label, and state',
    steps: [
      'Navigate through all buttons using button navigation key (B)',
      'Verify each button has a descriptive label',
      'Check that button states are announced (pressed, expanded, etc.)',
      'Test toggle buttons for proper state announcement',
    ],
    expectedBehavior: [
      'Buttons are announced as "button" with their label',
      'Button purpose is clear from label alone',
      'Toggle states are announced (e.g., "pressed", "not pressed")',
      'Expanded/collapsed states are announced for expandable controls',
    ],
    wcagCriteria: ['4.1.2 Name, Role, Value', '2.4.6 Headings and Labels'],
  },
  {
    id: 'SR-006',
    title: 'Form Field Labels and Instructions',
    category: 'Forms',
    description: 'Verify form fields have proper labels, instructions, and descriptions',
    steps: [
      'Navigate through form fields using form navigation key (F)',
      'Verify each field has an associated label',
      'Check for helper text and instructions',
      'Test required field indication',
    ],
    expectedBehavior: [
      'Each form field is announced with its label',
      'Field type is announced (text input, checkbox, radio, etc.)',
      'Helper text and instructions are announced',
      'Required fields are clearly identified',
    ],
    wcagCriteria: ['3.3.2 Labels or Instructions', '4.1.2 Name, Role, Value'],
  },
  {
    id: 'SR-007',
    title: 'Form Validation and Error Messages',
    category: 'Forms',
    description: 'Test that validation errors are announced and associated with fields',
    steps: [
      'Trigger a form validation error (e.g., submit empty required field)',
      'Listen for error announcement',
      'Navigate to the field with the error',
      'Verify error message is associated with the field',
    ],
    expectedBehavior: [
      'Validation errors are announced immediately when they occur',
      'Error messages are associated with the relevant form field',
      'Error messages provide clear guidance on how to fix the issue',
      'Focus moves to first error field (or error summary)',
    ],
    wcagCriteria: ['3.3.1 Error Identification', '3.3.3 Error Suggestion'],
  },
  {
    id: 'SR-008',
    title: 'List Structure and Items',
    category: 'Content Structure',
    description: 'Verify lists are properly announced with item count and structure',
    steps: [
      'Navigate to lists using list navigation key (L)',
      'Listen to list announcement',
      'Navigate through list items',
      'Check nested lists if present',
    ],
    expectedBehavior: [
      'Lists are announced as "list with X items"',
      'List items are announced with their position (e.g., "item 1 of 5")',
      'Nested lists are properly identified and announced',
      'List type is identified (ordered, unordered, definition)',
    ],
    wcagCriteria: ['1.3.1 Info and Relationships'],
  },
  {
    id: 'SR-009',
    title: 'Table Structure and Headers',
    category: 'Content Structure',
    description: 'Test table announcement with headers, captions, and cell relationships',
    steps: [
      'Navigate to tables using table navigation key (T)',
      'Listen to table announcement including dimensions',
      'Navigate through table cells',
      'Verify header associations are announced',
    ],
    expectedBehavior: [
      'Tables are announced with dimensions (e.g., "table with 5 rows and 3 columns")',
      'Table caption or summary is announced if present',
      'Column and row headers are announced with each data cell',
      'Table navigation keys work properly',
    ],
    wcagCriteria: ['1.3.1 Info and Relationships', '4.1.2 Name, Role, Value'],
  },
  {
    id: 'SR-010',
    title: 'Image Alternative Text',
    category: 'Media',
    description: 'Verify images have appropriate alt text or are marked as decorative',
    steps: [
      'Navigate through all images on the page',
      'Listen to alt text announcement',
      'Identify decorative vs. informative images',
      'Check complex images for detailed descriptions',
    ],
    expectedBehavior: [
      'Informative images have descriptive alt text',
      'Decorative images are properly hidden from screen readers',
      'Alt text conveys the purpose/information of the image',
      'Complex images have extended descriptions if needed',
    ],
    wcagCriteria: ['1.1.1 Non-text Content'],
  },
  {
    id: 'SR-011',
    title: 'Code Block Accessibility',
    category: 'Interactive Elements',
    description: 'Test code blocks for proper announcement and copy functionality',
    steps: [
      'Navigate to a code block on the documentation',
      'Verify code block is announced with proper role',
      'Test copy button with screen reader',
      'Check if code language is announced',
    ],
    expectedBehavior: [
      'Code blocks are identified as code regions',
      'Programming language is announced if specified',
      'Copy button is accessible and announces action',
      'Success/failure of copy action is announced',
    ],
    wcagCriteria: ['4.1.2 Name, Role, Value', '4.1.3 Status Messages'],
  },
  {
    id: 'SR-012',
    title: 'Component Showcase Tab Navigation',
    category: 'Interactive Elements',
    description: 'Test tab pattern in component showcases for proper ARIA implementation',
    steps: [
      'Navigate to a component showcase with tabs',
      'Verify tab list is announced with role',
      'Navigate between tabs using arrow keys',
      'Check tab panel content announcement',
    ],
    expectedBehavior: [
      'Tab list is announced as "tab list"',
      'Each tab is announced with its label and selection state',
      'Selected tab is identified as "selected"',
      'Tab panel content is announced when switching tabs',
    ],
    wcagCriteria: ['4.1.2 Name, Role, Value', '2.1.1 Keyboard'],
  },
  {
    id: 'SR-013',
    title: 'Search Functionality',
    category: 'Navigation',
    description: 'Test search input and results for screen reader accessibility',
    steps: [
      'Navigate to search input using form navigation',
      'Enter a search query',
      'Listen to search results announcement',
      'Navigate through search results',
    ],
    expectedBehavior: [
      'Search input is properly labeled',
      'Search results count is announced',
      'Search results are properly structured and navigable',
      'No results message is announced if applicable',
    ],
    wcagCriteria: ['4.1.3 Status Messages', '3.3.2 Labels or Instructions'],
  },
  {
    id: 'SR-014',
    title: 'Dynamic Content Updates',
    category: 'Interactive Elements',
    description: 'Verify that dynamic content changes are announced to screen readers',
    steps: [
      'Trigger an action that updates content dynamically (e.g., expanding section)',
      'Listen for announcement of content change',
      'Verify focus management after update',
      'Test loading states if applicable',
    ],
    expectedBehavior: [
      'Content changes are announced via ARIA live regions',
      'Announcements are not too verbose or frequent',
      'Focus is managed appropriately after updates',
      'Loading states are announced clearly',
    ],
    wcagCriteria: ['4.1.3 Status Messages', '2.4.3 Focus Order'],
  },
  {
    id: 'SR-015',
    title: 'Keyboard Shortcuts and Instructions',
    category: 'Navigation',
    description: 'Test that keyboard shortcuts are documented and accessible',
    steps: [
      'Look for keyboard shortcut documentation',
      'Test announced keyboard shortcuts',
      'Verify no conflicts with screen reader shortcuts',
      'Check if custom shortcuts can be accessed',
    ],
    expectedBehavior: [
      'Keyboard shortcuts are documented in accessible format',
      'Shortcuts do not conflict with screen reader controls',
      'Alternative methods are available if shortcuts conflict',
      'Keyboard instructions are clear and complete',
    ],
    wcagCriteria: ['2.1.1 Keyboard', '3.3.2 Labels or Instructions'],
  },
  {
    id: 'SR-016',
    title: 'Modal Dialog Accessibility',
    category: 'Interactive Elements',
    description: 'Test modal dialogs for proper focus trapping and announcement',
    steps: [
      'Open a modal dialog if available',
      'Verify modal is announced when opened',
      'Test focus trap (Tab/Shift+Tab stays within modal)',
      'Close modal and verify focus returns',
    ],
    expectedBehavior: [
      'Modal opening is announced',
      'Focus moves to modal content',
      'Focus is trapped within modal',
      'Escape key closes modal',
      'Focus returns to trigger element when closed',
    ],
    wcagCriteria: ['2.4.3 Focus Order', '4.1.2 Name, Role, Value'],
  },
  {
    id: 'SR-017',
    title: 'Breadcrumb Navigation',
    category: 'Navigation',
    description: 'Verify breadcrumb navigation is properly announced and navigable',
    steps: [
      'Navigate to breadcrumb navigation',
      'Listen to breadcrumb announcement',
      'Navigate through breadcrumb links',
      'Verify current page indication',
    ],
    expectedBehavior: [
      'Breadcrumb is announced as navigation region',
      'Each breadcrumb level is clearly identified',
      'Current page is indicated (usually not a link)',
      'Separators are handled appropriately (hidden or announced)',
    ],
    wcagCriteria: ['2.4.8 Location', '1.3.1 Info and Relationships'],
  },
  {
    id: 'SR-018',
    title: 'Theme Toggle Accessibility',
    category: 'Interactive Elements',
    description: 'Test theme toggle button for proper state announcement',
    steps: [
      'Locate theme toggle button',
      'Verify current theme state is announced',
      'Toggle theme and listen to state change',
      'Verify new theme is applied and announced',
    ],
    expectedBehavior: [
      'Theme toggle button is properly labeled',
      'Current theme state is announced (light/dark)',
      'Theme change is announced when toggled',
      'Visual changes do not break screen reader navigation',
    ],
    wcagCriteria: ['4.1.2 Name, Role, Value', '1.4.1 Use of Color'],
  },
  {
    id: 'SR-019',
    title: 'Sidebar Navigation Structure',
    category: 'Navigation',
    description: 'Test sidebar navigation for proper structure and collapsible sections',
    steps: [
      'Navigate to sidebar navigation',
      'Verify navigation landmark is announced',
      'Test expandable/collapsible sections',
      'Navigate through nested navigation items',
    ],
    expectedBehavior: [
      'Sidebar is identified as navigation landmark',
      'Expandable sections announce their state',
      'Nested navigation is properly structured',
      'Current page is indicated in navigation',
    ],
    wcagCriteria: ['2.4.1 Bypass Blocks', '4.1.2 Name, Role, Value'],
  },
  {
    id: 'SR-020',
    title: 'Reading Order and Content Flow',
    category: 'Content Structure',
    description: 'Verify that content is announced in logical reading order',
    steps: [
      'Use "read all" or continuous reading mode',
      'Listen to entire page content',
      'Verify reading order matches visual order',
      'Check for any missing or out-of-order content',
    ],
    expectedBehavior: [
      'Content is read in logical, meaningful order',
      'Reading order matches visual presentation',
      'No important content is skipped',
      'No confusing jumps in content flow',
    ],
    wcagCriteria: ['1.3.2 Meaningful Sequence', '2.4.3 Focus Order'],
  },
]

/**
 * Generate comprehensive screen reader testing guide
 */
function generateScreenReaderGuide(): string {
  let guide = `# Screen Reader Testing Guide for Sparkle Documentation

## Overview

This guide provides comprehensive instructions for testing the Sparkle Design System documentation with screen readers to ensure WCAG 2.1 AA compliance and optimal accessibility for users with visual impairments.

## Supported Screen Readers

We test with the following screen readers to ensure broad compatibility:

`

  SCREEN_READERS.forEach(sr => {
    guide += `### ${sr.name} (${sr.platform})

**Type**: ${sr.type}
${sr.downloadUrl ? `**Download**: ${sr.downloadUrl}\n` : ''}

${sr.testingNotes.map(note => `- ${note}`).join('\n')}

**Common Keyboard Shortcuts**:

| Action | Shortcut |
|--------|----------|
${Object.entries(sr.shortcuts)
  .map(([action, shortcut]) => `| ${action} | \`${shortcut}\` |`)
  .join('\n')}

---

`
  })

  guide += `## Testing Environment Setup

### Prerequisites

1. **Install Screen Reader**: Download and install the screen reader for your platform
2. **Browser Compatibility**: Use recommended browser for each screen reader:
   - NVDA: Firefox or Chrome
   - JAWS: Chrome or Edge
   - VoiceOver: Safari
   - ORCA: Firefox or Chrome
3. **Documentation Site**: Ensure the documentation site is running:
   \`\`\`bash
   pnpm --filter @sparkle/docs dev
   \`\`\`
4. **Test Environment**: Navigate to http://localhost:4321

### Testing Preparation

- Close unnecessary applications to reduce distractions
- Use headphones for clear audio
- Have a quiet testing environment
- Take notes or record sessions for detailed analysis
- Test with JavaScript enabled and disabled (where applicable)

## Test Execution Procedure

For each test case in this guide:

1. **Understand the Test**: Read the test description and expected behavior
2. **Follow Steps**: Execute each step methodically
3. **Record Results**: Document whether the test passes or fails
4. **Note Issues**: Record specific issues, including:
   - What was announced (or not announced)
   - Expected vs. actual behavior
   - Severity of the issue (critical, serious, moderate, minor)
5. **Suggest Fixes**: Propose remediation if issues are found

## Test Cases

${TEST_CASES.map(
  testCase => `### ${testCase.id}: ${testCase.title}

**Category**: ${testCase.category}
**WCAG Criteria**: ${testCase.wcagCriteria.join(', ')}

**Description**: ${testCase.description}

**Testing Steps**:
${testCase.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Expected Behavior**:
${testCase.expectedBehavior.map(behavior => `- ${behavior}`).join('\n')}

**Result**: [ ] Pass [ ] Fail [ ] Partial

**Notes**:
_Record observations here_

**Issues Found**:
_Document any accessibility issues_

**Recommendations**:
_Suggest fixes for any issues_

---

`,
).join('\n')}

## Common Issues and Resolutions

### Issue: Links announced as "blank" or without context
- **Fix**: Ensure link text is descriptive and self-explanatory
- **Example**: Change "click here" to "view button component documentation"

### Issue: Buttons not identified as buttons
- **Fix**: Ensure proper \`role="button"\` and semantic \`<button>\` elements
- **Check**: ARIA labels are present and descriptive

### Issue: Form fields without labels
- **Fix**: Associate \`<label>\` elements with form inputs using \`for\` and \`id\`
- **Alternative**: Use \`aria-label\` or \`aria-labelledby\` for complex scenarios

### Issue: Heading hierarchy skipped
- **Fix**: Ensure headings follow sequential order (H1 → H2 → H3)
- **Check**: Only one H1 per page, all subheadings properly nested

### Issue: Dynamic content changes not announced
- **Fix**: Use ARIA live regions (\`aria-live="polite"\` or \`aria-live="assertive"\`)
- **Check**: Status messages use \`role="status"\` or \`role="alert"\`

### Issue: Modal dialogs lose focus
- **Fix**: Implement focus trap within modal
- **Check**: Focus returns to trigger element when modal closes

## Reporting Results

After completing all test cases, compile your results:

1. **Summary Statistics**:
   - Total tests performed: ___
   - Tests passed: ___
   - Tests failed: ___
   - Critical issues found: ___
   - Serious issues found: ___

2. **Detailed Report**: Use the screen reader test results template (JSON format)

3. **Remediation Plan**: Prioritize issues by severity and create action items

## Best Practices for Screen Reader Testing

### General Testing Tips

- **Test Multiple Pages**: Don't just test the homepage - test various page types
- **Test Different Scenarios**: Try both successful and error states
- **Test Navigation Patterns**: Use all navigation methods (links, headings, landmarks)
- **Test Forms Thoroughly**: Fill out forms completely, trigger validation
- **Test Dynamic Content**: Expand/collapse sections, open modals, trigger updates

### Cross-Screen Reader Testing

- **Core Functionality**: All screen readers should handle basic content equally well
- **ARIA Support**: Modern screen readers have excellent ARIA support
- **Browser Differences**: Same screen reader may behave differently in different browsers
- **Regular Updates**: Keep screen readers updated for best compatibility

### Documentation for Developers

When reporting issues:

- **Specific Location**: Note exact page URL and element description
- **Reproduction Steps**: Provide step-by-step instructions to reproduce
- **Expected vs. Actual**: Clearly state what should happen vs. what does happen
- **Screen Reader/Browser**: Specify which combination exhibits the issue
- **WCAG Criterion**: Reference specific WCAG success criteria violated

## Additional Resources

### WCAG 2.1 Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### Screen Reader Documentation
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [JAWS Documentation](https://www.freedomscientific.com/training/jaws/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [ORCA Wiki](https://help.gnome.org/users/orca/stable/)

### Testing Tools
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Deque Screen Reader Testing Guide](https://www.deque.com/blog/dont-screen-readers-alone/)

---

**Document Version**: 1.0
**Last Updated**: ${new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
**Maintained By**: Sparkle Design System Team
`

  return guide
}

/**
 * Generate screen reader test results template
 */
function generateResultsTemplate(): string {
  const template = {
    metadata: {
      testDate: new Date().toISOString(),
      tester: '',
      screenReader: {
        name: '',
        version: '',
        platform: '',
      },
      browser: {
        name: '',
        version: '',
      },
      documentationVersion: '',
      baseUrl: 'http://localhost:4321',
    },
    summary: {
      totalTests: TEST_CASES.length,
      passed: 0,
      failed: 0,
      partial: 0,
      notTested: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0,
    },
    testResults: TEST_CASES.map(testCase => ({
      testId: testCase.id,
      title: testCase.title,
      category: testCase.category,
      wcagCriteria: testCase.wcagCriteria,
      result: 'not-tested', // 'pass' | 'fail' | 'partial' | 'not-tested'
      notes: '',
      issuesFound: [] as {
        severity: 'critical' | 'serious' | 'moderate' | 'minor'
        description: string
        location: string
        expectedBehavior: string
        actualBehavior: string
        recommendation: string
      }[],
      screenshots: [] as string[],
      audioRecording: '',
    })),
    overallAssessment: {
      strengths: [] as string[],
      weaknesses: [] as string[],
      recommendations: [] as string[],
      complianceLevel: '', // 'WCAG 2.1 A' | 'WCAG 2.1 AA' | 'WCAG 2.1 AAA' | 'Not Compliant'
    },
  }

  return JSON.stringify(template, null, 2)
}

/**
 * Generate quick reference guide for each screen reader
 */
function generateQuickReference(screenReader: ScreenReaderInfo): string {
  return `# ${screenReader.name} Quick Reference for Testing

## Platform: ${screenReader.platform}
## Type: ${screenReader.type}
${screenReader.downloadUrl ? `## Download: ${screenReader.downloadUrl}\n` : ''}

## Testing Notes

${screenReader.testingNotes.map(note => `- ${note}`).join('\n')}

## Essential Keyboard Shortcuts

${Object.entries(screenReader.shortcuts)
  .map(([action, shortcut]) => `**${action}**: \`${shortcut}\``)
  .join('\n\n')}

## Testing Checklist

- [ ] Screen reader starts and loads properly
- [ ] Page title is announced correctly
- [ ] Can navigate by headings
- [ ] Can navigate by links
- [ ] Can navigate by buttons
- [ ] Can navigate by form fields
- [ ] Can navigate by landmarks
- [ ] Can navigate by lists
- [ ] Can navigate by tables
- [ ] All interactive elements are accessible
- [ ] Form labels are properly associated
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced
- [ ] Focus management works correctly
- [ ] Reading order is logical

## Common Issues to Watch For

### Heading Hierarchy Problems
- Verify headings follow proper order (H1 → H2 → H3)
- Check that heading text is descriptive

### Form Accessibility Issues
- Ensure all form fields have labels
- Check that required fields are identified
- Verify error messages are associated with fields

### Link Context Problems
- Avoid generic link text like "click here"
- Ensure link purpose is clear from text alone

### Dynamic Content Issues
- Check that content updates are announced
- Verify loading states are communicated
- Test modal dialogs for proper focus management

## Browser Compatibility

Recommended browsers for ${screenReader.name}:

${
  screenReader.platform === 'Windows'
    ? '- Chrome (recommended)\n- Firefox (recommended)\n- Edge'
    : screenReader.platform === 'macOS/iOS'
      ? '- Safari (recommended)\n- Chrome\n- Firefox'
      : '- Firefox (recommended)\n- Chrome'
}

## Testing Workflow

1. **Start ${screenReader.name}** using the appropriate shortcut
2. **Load Documentation Site** at http://localhost:4321
3. **Listen to Page Load** - note initial announcements
4. **Navigate by Headings** - test heading hierarchy
5. **Navigate by Landmarks** - test page structure
6. **Test Interactive Elements** - buttons, links, forms
7. **Test Dynamic Content** - expandable sections, modals
8. **Document Issues** - record any accessibility problems
9. **Complete Test Report** - fill out results template

---

For complete testing procedures, see the main Screen Reader Testing Guide.
`
}

/**
 * Main execution
 */
async function main() {
  const outputDir = join(process.cwd(), 'accessibility-reports')

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, {recursive: true})
  }

  console.log('📋 Generating screen reader testing documentation...')
  console.log('')

  // Generate main testing guide
  const guide = generateScreenReaderGuide()
  const guidePath = join(outputDir, 'screen-reader-testing-guide.md')
  writeFileSync(guidePath, guide)
  console.log(`✅ Screen reader testing guide: ${guidePath}`)

  // Generate results template
  const resultsTemplate = generateResultsTemplate()
  const resultsPath = join(outputDir, 'screen-reader-test-results.json')
  writeFileSync(resultsPath, resultsTemplate)
  console.log(`✅ Test results template: ${resultsPath}`)

  // Generate quick reference for each screen reader
  SCREEN_READERS.forEach(sr => {
    const quickRef = generateQuickReference(sr)
    const quickRefPath = join(outputDir, `${sr.name.toLowerCase()}-quick-reference.md`)
    writeFileSync(quickRefPath, quickRef)
    console.log(`✅ ${sr.name} quick reference: ${quickRefPath}`)
  })

  console.log('')
  console.log('🎉 Screen reader testing documentation generated successfully!')
  console.log('')
  console.log('📖 Next steps:')
  console.log('   1. Review the screen reader testing guide')
  console.log('   2. Install screen readers for your platform')
  console.log('   3. Execute test cases systematically')
  console.log('   4. Record results in the JSON template')
  console.log('   5. Report issues and create remediation plan')
  console.log('')
  console.log('🔍 Testing Tips:')
  console.log('   - Test with multiple screen readers for comprehensive coverage')
  console.log('   - Record audio of testing sessions for detailed analysis')
  console.log('   - Test both with and without visual display')
  console.log('   - Involve users with visual impairments when possible')
}

main().catch(error => {
  console.error('Error generating screen reader testing documentation:', error)
  process.exit(1)
})
