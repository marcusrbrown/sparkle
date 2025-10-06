import config, {composeConfig} from '@bfra.me/eslint-config'

export default await composeConfig(config).insertAfter('@bfra.me/ignores', {
  name: 'sparkle/ignores',
  ignores: ['.ai/', '**/.astro/', '.github/copilot-instructions.md', 'docs/src/content/docs/api/', 'audit-*.md'],
})
