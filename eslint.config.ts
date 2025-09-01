import config, {composeConfig} from '@bfra.me/eslint-config'

export default await composeConfig(config).insertAfter('@bfra.me/ignores', {
  name: 'sparkle/ignores',
  ignores: ['.ai/', '.github/copilot-instructions.md'],
})
