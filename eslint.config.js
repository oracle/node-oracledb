/** @type {import('eslint').Linter.Config} */
const js = require('@eslint/js');
module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...require('globals').node,
        ...require('globals').es2020,
        ...require('globals').es2024,
        ...require('globals').mocha
      }
    },
    rules: {
      'require-await': 'error',
      'brace-style': 'error',
      'computed-property-spacing': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'no-trailing-spaces': 'error',
      'prefer-const': 'error',
      'space-before-function-paren': ['error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
      'key-spacing': ['error', { mode: 'strict' }],
      'space-in-parens': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': [2, { words: true, nonwords: false }],
      'space-before-blocks': 'error',
      'no-tabs': 'error',
      'keyword-spacing': 'error',
      'eol-last': 'error',
      'indent': [2, 2, { SwitchCase: 1 }],
      'quotes': [0, 'double'],
      'linebreak-style': [2, 'unix'],
      'semi': [2, 'always'],
      'no-console': [0]
    }
  }
];
