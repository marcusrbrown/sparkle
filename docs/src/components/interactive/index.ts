// Export both the React component and Astro wrapper for different use cases
export {CodeEditor} from './CodeEditor.tsx'
export type {CodeEditorProps} from './CodeEditor.tsx'

export {StorybookEmbed} from './StorybookEmbed.tsx'
export type {StorybookEmbedProps} from './StorybookEmbed.tsx'

// Astro components are imported via the .astro file when needed
export const CodeEditorAstro = './CodeEditorAstro.astro'
export const SimpleCodeEditor = './SimpleCodeEditor.astro'
export const StorybookEmbedAstro = './StorybookEmbedAstro.astro'
