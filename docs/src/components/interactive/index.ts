// Export both the React component and Astro wrapper for different use cases
export {StorybookEmbed} from './StorybookEmbed.tsx'
export type {StorybookEmbedProps} from './StorybookEmbed.tsx'

// Astro component is imported via the .astro file when needed
export const StorybookEmbedAstro = './StorybookEmbedAstro.astro'
