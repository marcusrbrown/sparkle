import {docsLoader} from '@astrojs/starlight/loaders'
import {docsSchema} from '@astrojs/starlight/schema'
import {glob} from 'astro/loaders'
import {defineCollection, z} from 'astro:content'

// Define common content types
const contentTypes = z.enum([
  'component',
  'api-reference',
  'guide',
  'tutorial',
  'getting-started',
  'reference',
  'overview',
])

const componentCategories = z.enum(['form', 'layout', 'navigation', 'feedback', 'input', 'display', 'utility'])

// Schema for component props documentation
const componentPropSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
})

// Schema for JSDoc tags
const jsdocTagSchema = z.object({
  tag: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
})

// Schema for component examples
const componentExampleSchema = z.object({
  title: z.string(),
  code: z.string(),
  language: z.string().default('tsx'),
  description: z.string().optional(),
})

// Extended schema for different content types
const extendedDocsSchema = z.object({
  // Component-specific metadata
  componentName: z.string().optional(),
  category: componentCategories.optional(),
  version: z.string().optional(),
  since: z.string().optional(),
  deprecated: z.boolean().optional(),
  deprecationMessage: z.string().optional(),

  // Component props and API
  props: z.array(componentPropSchema).optional(),
  examples: z.array(componentExampleSchema).optional(),

  // JSDoc metadata
  jsdoc: z
    .object({
      description: z.string().optional(),
      tags: z.array(jsdocTagSchema).optional(),
    })
    .optional(),

  // Source file information
  sourceFile: z.string().optional(),
  packageName: z.string().optional(),

  // Related components and cross-references
  relatedComponents: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),

  // Content organization
  contentType: contentTypes.optional(),

  // SEO and meta
  keywords: z.array(z.string()).optional(),

  // API reference specific fields
  apiType: z.enum(['class', 'interface', 'function', 'type', 'enum', 'variable']).optional(),
  signature: z.string().optional(),
  returnType: z.string().optional(),

  // Parameters and properties
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().default(false),
        description: z.string().optional(),
      }),
    )
    .optional(),

  // TypeScript specific
  generics: z.array(z.string()).optional(),
  extends: z.array(z.string()).optional(),
  implements: z.array(z.string()).optional(),

  // Cross-references
  seeAlso: z.array(z.string()).optional(),

  // Guide and tutorial specific fields
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimatedTime: z.string().optional(), // e.g., "15 minutes"
  prerequisites: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  // Tutorial specific
  steps: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        code: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .optional(),

  // Learning outcomes
  objectives: z.array(z.string()).optional(),
  whatYouWillLearn: z.array(z.string()).optional(),

  // Related content
  relatedGuides: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),

  // Validation
  lastUpdated: z
    .string()
    .or(z.date())
    .transform(val => new Date(val))
    .optional(),
  reviewedBy: z.string().optional(),
})

export const collections = {
  // Main docs collection with extended schema
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: extendedDocsSchema,
    }),
  }),

  // Dedicated collection for component data (JSON files)
  componentData: defineCollection({
    loader: glob({
      pattern: '**/component-docs.json',
      base: './src/generated',
    }),
    schema: z.array(
      z.object({
        name: z.string(),
        filePath: z.string(),
        description: z.string().optional(),
        jsdoc: z
          .object({
            description: z.string().optional(),
            tags: z.array(jsdocTagSchema).optional(),
          })
          .optional(),
        props: z.array(componentPropSchema).optional(),
        examples: z.array(componentExampleSchema).optional(),
        isDefault: z.boolean().default(false),
      }),
    ),
  }),
}
