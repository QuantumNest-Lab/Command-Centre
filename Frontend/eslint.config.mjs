import js from '@eslint/js'
import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'node_modules/**'] },
  js.configs.recommended,
  ...nextVitals,
  {
    languageOptions: { globals: { React: 'readonly' } },
    rules: {
      'no-unused-vars': 'off',
      // The application intentionally hydrates browser-persisted drafts and preferences in effects.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react/no-unescaped-entities': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-unreachable': 'off',
    },
  },
]

export default config
