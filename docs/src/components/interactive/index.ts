// Export both the React component and Astro wrapper for different use cases
export {CodeEditor} from './CodeEditor.tsx'
export type {CodeEditorProps} from './CodeEditor.tsx'

export {CopyButton} from './CopyButton.tsx'
export type {CopyButtonProps} from './CopyButton.tsx'

export {MultiViewportPreview, ResponsivePreview, VIEWPORTS} from './responsive-preview.tsx'
export type {MultiViewportPreviewProps, ResponsivePreviewProps, ViewportConfig} from './responsive-preview.tsx'

export {StorybookEmbed} from './StorybookEmbed.tsx'
export type {StorybookEmbedProps} from './StorybookEmbed.tsx'

export {ThemePreview} from './theme-preview.tsx'
export type {PreviewTheme, ThemePreviewProps} from './theme-preview.tsx'

export {ThemeToggle} from './theme-toggle.tsx'
export type {Theme, ThemeToggleProps} from './theme-toggle.tsx'

// Astro components are imported via the .astro file when needed
export const CodeEditorAstro = './CodeEditorAstro.astro'
export const SimpleCodeEditor = './SimpleCodeEditor.astro'
export const StorybookEmbedAstro = './StorybookEmbedAstro.astro'
export const ThemeToggleAstro = './ThemeToggle.astro'
export const ThemePreviewAstro = './ThemePreview.astro'
export const ResponsivePreviewAstro = './ResponsivePreview.astro'
