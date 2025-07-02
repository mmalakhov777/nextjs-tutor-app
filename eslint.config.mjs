import { createConfig } from '@eslint/eslintrc';
import nextPlugin from 'eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default createConfig({
  plugins: {
    next: nextPlugin,
    react: reactPlugin,
    'react-hooks': hooksPlugin,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@next/next/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
});
