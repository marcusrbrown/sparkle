import {parse as parseJSDoc} from 'doctrine'
import {describe, expect, it} from 'vitest'

/**
 * Regression tests pinning doctrine's `parse(text, {unwrap: true})` behavior against
 * the exact JSDoc shapes `docs/scripts/extract-jsdoc.ts` encounters in `packages/ui/src`.
 *
 * Only two fields are consumed by the pipeline (see extract-jsdoc.ts:193, 210, 268):
 *   description = jsdoc.description || ''
 *   examples = jsdoc.tags?.filter(tag => tag.title === 'example').map(tag => tag.description || '')
 *
 * These tests pin observed doctrine output, including known mangling, not desired behavior.
 * doctrine (eslint/doctrine) has been archived since 2018-12-03; see issue #2032.
 */
describe('doctrine JSDoc parsing (contract for docs/scripts/extract-jsdoc.ts)', () => {
  it('extracts a plain description with no tags', () => {
    // packages/ui/src/components/Form/Form.tsx:44-46
    const comment = `/**
   * Form component with accessible validation and submission handling
   */`

    const result = parseJSDoc(comment, {unwrap: true})

    expect(result.description).toBe('Form component with accessible validation and submission handling')
    expect(result.tags).toEqual([])
  })

  it('extracts description and a single @example with an intact fenced code block', () => {
    // packages/ui/src/components/Button/Button.tsx:37-64
    const comment = `/**
   * Button component with theme-aware styling and semantic color variants
   *
   * @example Basic usage
   * \`\`\`tsx
   * import { Button } from '@sparkle/ui'
   *
   * function Example() {
   *   return (
   *     <Button onClick={() => console.log('Clicked!')}>
   *       Click Me
   *     </Button>
   *   )
   * }
   * \`\`\`
   */`

    const result = parseJSDoc(comment, {unwrap: true})
    const examples = (result.tags ?? [])
      .filter(tag => tag.title === 'example')
      .map(tag => tag.description || '')
      .filter(Boolean)

    expect(result.description).toBe('Button component with theme-aware styling and semantic color variants')
    expect(examples).toHaveLength(1)
    expect(examples[0]).toContain('```tsx')
    expect(examples[0]).toContain("import { Button } from '@sparkle/ui'")
    expect(examples[0]).toContain('```')
  })

  it('collects multiple @example tags in source order', () => {
    // packages/ui/src/components/Button/Button.tsx:53, 66, 103 (condensed)
    const comment = `/**
   * Button component with theme-aware styling and semantic color variants
   *
   * @example Basic usage
   * \`\`\`tsx
   * <Button onClick={() => console.log('Clicked!')}>Click Me</Button>
   * \`\`\`
   *
   * @example Style variants
   * \`\`\`tsx
   * <Button variant="primary">Save Changes</Button>
   * \`\`\`
   *
   * @example Size variants
   * \`\`\`tsx
   * <Button size="sm">Small</Button>
   * \`\`\`
   */`

    const result = parseJSDoc(comment, {unwrap: true})
    const examples = (result.tags ?? [])
      .filter(tag => tag.title === 'example')
      .map(tag => tag.description || '')
      .filter(Boolean)

    expect(examples).toHaveLength(3)
    expect(examples[0]).toContain('Basic usage')
    expect(examples[1]).toContain('Style variants')
    expect(examples[2]).toContain('Size variants')
  })

  it('does not pollute description with @param and @returns tags', () => {
    // packages/ui/src/components/Form/Form.tsx:22-30 (onValidate prop)
    const comment = `/**
   * Custom validation handler called before submission
   * @param formData - Form data object containing all field values
   * @returns boolean or Promise<boolean> - Return false to prevent submission
   *
   * @remarks
   * This handler is called AFTER built-in HTML5 constraint validation passes.
   * Use this for custom async validation like API calls or complex business logic.
   */`

    const result = parseJSDoc(comment, {unwrap: true})

    expect(result.description).toBe('Custom validation handler called before submission')
    expect(result.tags?.map(tag => tag.title)).toEqual(['param', 'returns', 'remarks'])
  })

  it('does not throw or corrupt description when non-standard hyphenated tags are present', () => {
    // packages/ui/src/components/Button/Button.tsx:37-51, 191-211 (condensed)
    const comment = `/**
   * Button component with theme-aware styling and semantic color variants
   *
   * @features
   * - **Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes
   *
   * @accessibility
   * - Keyboard navigation: Enter/Space to activate, Tab to focus
   *
   * @theme-tokens
   * - \`--theme-primary-*\`: Primary button variants
   *
   * @best-practices
   * - Use semantic variants for contextual actions (success, warning, error)
   */`

    expect(() => parseJSDoc(comment, {unwrap: true})).not.toThrow()

    const result = parseJSDoc(comment, {unwrap: true})

    expect(result.description).toBe('Button component with theme-aware styling and semantic color variants')

    // Finding for #2032: doctrine splits hyphenated tag names at the first hyphen.
    // `@theme-tokens` becomes title "theme" with the description mangled to start
    // with the "-tokens" remainder, and `@best-practices` becomes title "best" with
    // description starting "-practices". Pinning the mangling, not endorsing it.
    const titles = result.tags?.map(tag => tag.title)
    expect(titles).toEqual(['features', 'accessibility', 'theme', 'best'])
    expect(result.tags?.[2]?.description).toMatch(/^-tokens/)
    expect(result.tags?.[3]?.description).toMatch(/^-practices/)
  })

  it('parses @default without throwing, tolerating the quoted value', () => {
    // packages/ui/src/components/Button/Button.tsx:5-14 (variant prop)
    const comment = `/**
   * The visual style variant of the button
   * @default "primary"
   *
   * - \`primary\`: High emphasis for main call-to-action
   * - \`secondary\`: Medium emphasis for supporting actions
   */`

    const result = parseJSDoc(comment, {unwrap: true})

    expect(result.description).toBe('The visual style variant of the button')
    expect(result.tags).toHaveLength(1)
    expect(result.tags?.[0]?.title).toBe('default')
  })

  it('extracts a short single-line prop-level comment', () => {
    const comment = `/** Whether the field is disabled */`

    const result = parseJSDoc(comment, {unwrap: true})

    expect(result.description).toBe('Whether the field is disabled')
    expect(result.tags).toEqual([])
  })
})
