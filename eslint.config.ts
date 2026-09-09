import config, {composeConfig, GLOB_MARKDOWN_CODE} from '@bfra.me/eslint-config'

export default await composeConfig(config)
  .append(
    {
      name: 'sparkle/rules',
      rules: {
        'markdown/no-missing-label-refs': 'off',
        'no-restricted-syntax': [
          'error',
          'TSEnumDeclaration[const=true]',
          'TSExportAssignment',
          'ForInStatement',
          'LabeledStatement',
          'WithStatement',
          {
            selector: 'ClassDeclaration[superClass=null]',
            message:
              'Prefer a function or closure factory. If this class is justified by a fluent builder or cohesive stateful lifecycle, add an eslint-disable-next-line with the reason.',
          },
          {
            selector: 'ClassExpression[superClass=null]',
            message:
              'Prefer a function or closure factory. If this class is justified by a fluent builder or cohesive stateful lifecycle, add an eslint-disable-next-line with the reason.',
          },
        ],
      },
    },
    {
      files: [GLOB_MARKDOWN_CODE],
      rules: {
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'no-restricted-globals': 'off',
        'no-restricted-syntax': 'off',
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
        'no-restricted-syntax': 'off',
      },
    },
  )
  .insertAfter('@bfra.me/ignores', {
    name: 'sparkle/ignores',
    ignores: [
      '.ai/',
      '**/.astro/',
      '.github/copilot-instructions.md',
      'docs/src/content/docs/api/',
      'audit-*.md',
      '.deciduous/sync/**',
      'docs/public/graph-data.json',
      'docs/public/git-history.json',
    ],
  })
