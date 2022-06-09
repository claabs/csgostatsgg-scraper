module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'jest'],
  rules: {
    'import/extensions': 0,
    'import/prefer-default-export': 0,
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/await-thenable': ['error'],
    'import/no-cycle': 0,
  },
  settings: {
    'import/extensions': ['.js', '.ts'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  ignorePatterns: ['node_modules', 'dist', '**/*.d.ts', '.eslintrc.js'],
};
