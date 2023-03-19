import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  {
    input: `src/index.ts`,
    output: [
      {
        file: `dist/cjs/index.js`,
        format: 'cjs',
      },
      {
        file: `dist/esm/index.js`,
        format: 'esm',
      },
    ],
    plugins: [typescript(), commonjs()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
]);
