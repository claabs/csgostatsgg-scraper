/* eslint-disable import/no-extraneous-dependencies */
import resolve from '@rollup/plugin-node-resolve';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('./package.json');

const entryFile = 'index';

// const defaultExportOutro = `
//   module.exports = exports.default || {}
//   Object.entries(exports).forEach(([key, value]) => { module.exports[key] = value })
// `;

export default {
  input: `src/${entryFile}.ts`,
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      // outro: defaultExportOutro,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
      exports: 'named',
    },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Compile TypeScript files
    typescript({ tsconfig: './tsconfig.json', rootDir: 'src', exclude: '*.spec.ts' }),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    commonjs(),
    // Resolve source maps to the original source
    sourceMaps(),
  ],
};
