import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'react-hooks/incompatible-library': 'off'
    }
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**']
  }
];

export default eslintConfig;
