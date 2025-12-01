import config, {composeConfig, GLOB_MARKDOWN_CODE} from '@bfra.me/eslint-config'

export default await composeConfig(config)
  .append(
    {
      name: 'sparkle/rules',
      rules: {
        'markdown/no-missing-label-refs': 'off',
      },
    },
    {
      files: [GLOB_MARKDOWN_CODE],
      rules: {
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'no-restricted-globals': 'off',
        'unicorn/prefer-add-event-listener': 'off',
      },
    },
    {
      files: ['docs/src/content/docs/**/*.md'],
      rules: {
        'markdown/no-multiple-h1': 'off',
      },
    },
    {
      files: ['docs/src/content/docs/**/*.md/*.ts', 'docs/src/content/docs/**/*.md/*.tsx'],
      rules: {
        '@typescript-eslint/no-extraneous-class': 'off',
        'import-x/no-duplicates': 'off',
        'no-duplicate-imports': 'off',
      },
    },
  )
  .insertAfter('@bfra.me/ignores', {
    name: 'sparkle/ignores',
    ignores: ['.ai/', '**/.astro/', '.github/copilot-instructions.md', 'docs/src/content/docs/api/', 'audit-*.md'],
  })
