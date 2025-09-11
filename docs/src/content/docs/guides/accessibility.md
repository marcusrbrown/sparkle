---
title: Accessibility Guidelines
description: Comprehensive accessibility guidelines and WCAG 2.1 AA compliance information for the Sparkle Design System documentation.
---

The Sparkle Design System documentation is committed to providing an accessible experience for all users, including those using assistive technologies.

## Our Accessibility Commitment

We strive to conform to the [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/) Level AA standards. These guidelines help ensure our documentation is accessible to people with disabilities and provides a better user experience for everyone.

## Accessibility Features

### ⌨️ Keyboard Navigation

- **Tab Navigation**: All interactive elements can be accessed using the Tab key
- **Focus Indicators**: Clear visual focus indicators meet WCAG contrast requirements
- **Skip Links**: Skip navigation links allow users to jump to main content
- **Logical Tab Order**: Focus moves through elements in a logical sequence

### 🎯 Screen Reader Support

- **Semantic HTML**: Proper use of headings, lists, and landmarks
- **ARIA Labels**: Enhanced labels for complex interactive elements
- **Alt Text**: Descriptive alternative text for all informative images
- **Live Regions**: Dynamic content changes are announced to screen readers

### 🎨 Visual Design

- **Color Contrast**: Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Color Independence**: Information is not conveyed by color alone
- **Responsive Design**: Content adapts to different screen sizes and zoom levels
- **Focus Styles**: Clear focus indicators with 3:1 contrast ratio

### 📱 Mobile Accessibility

- **Touch Targets**: Interactive elements are at least 44×44 CSS pixels
- **Responsive Layout**: Content reflows properly on all screen sizes
- **Orientation Support**: Functions work in both portrait and landscape modes
- **Zoom Support**: Content remains functional when zoomed to 200%

## Testing Tools and Methods

### Automated Testing

We use several automated tools to continuously monitor accessibility:

- **axe-core**: Industry-standard accessibility testing engine
- **Lighthouse**: Google's built-in accessibility auditing
- **WAVE**: Web accessibility evaluation tool

### Manual Testing

Our manual testing process includes:

- **Keyboard Navigation**: Testing all functionality without a mouse
- **Screen Reader Testing**: Verification with NVDA, VoiceOver, and ORCA
- **Color Contrast Analysis**: Ensuring proper contrast ratios
- **Zoom Testing**: Verifying functionality at 200% zoom

## Browser and Assistive Technology Support

### Supported Browsers

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Supported Screen Readers

- **NVDA** (Windows) - Free screen reader
- **VoiceOver** (macOS/iOS) - Built-in screen reader
- **ORCA** (Linux) - Built-in screen reader
- **JAWS** (Windows) - Commercial screen reader

## Known Issues and Limitations

We are aware of the following accessibility considerations:

- **Dynamic Content**: Some interactive examples may require additional screen reader navigation
- **Code Examples**: Syntax highlighting may reduce contrast in some cases
- **Third-party Embeds**: Storybook embeds inherit their own accessibility features

## Feedback and Reporting

We welcome feedback about the accessibility of our documentation. If you encounter accessibility barriers, please:

1. **Open a GitHub Issue**: [Report accessibility issues](https://github.com/marcusrbrown/sparkle/issues/new?template=accessibility.md)
2. **Email us directly**: [git@mrbro.dev](mailto:git@mrbro.dev)
3. **Include details**: Describe the issue, your setup, and expected behavior

We aim to respond to accessibility feedback within 2 business days.

## Accessibility Statement

This accessibility statement applies to the Sparkle Design System documentation website at [sparkle.mrbro.dev](https://sparkle.mrbro.dev).

### Compliance Status

We believe this website is **partially compliant** with WCAG 2.1 Level AA standards. Some content may not be fully accessible due to:

- Third-party embedded content (Storybook components)
- Complex interactive examples requiring additional context
- Dynamic content that may need enhanced announcements

### Assessment Methods

This website has been assessed using:

- **Self-evaluation**: Regular internal accessibility reviews
- **Automated testing**: axe-core, Lighthouse, and WAVE tools
- **User testing**: Feedback from users with disabilities
- **Expert review**: Accessibility specialist evaluation

### Date of Assessment

This statement was created on September 10, 2025, and was last reviewed on September 10, 2025.

## Resources

### Learn More About Accessibility

- [WebAIM](https://webaim.org/) - Web accessibility resources
- [A11Y Project](https://www.a11yproject.com/) - Community-driven accessibility resources
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) - Official WCAG guidelines

### Tools for Testing Accessibility

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) - Color contrast testing tool

---

_This accessibility guide is continuously updated to reflect our ongoing commitment to digital accessibility._
