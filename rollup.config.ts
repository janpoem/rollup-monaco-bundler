import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { globSync } from 'glob';
import fs from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import type { RollupOptions } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import { swc } from 'rollup-plugin-swc3';

const outputDir = resolve(process.cwd(), './dist');
const srcDir = resolve(process.cwd(), 'src');

const rmdir = (dir: string) =>
  dir &&
  fs.existsSync(dir) &&
  fs.statSync(dir).isDirectory() &&
  fs.rmSync(dir, { recursive: true });

const external = [
  'rollup',
  'rollup-plugin-swc3',
  'rollup-plugin-styles',
  'node:tty',
  'node:path',
  'node:fs',
  'tar',
];

const options: RollupOptions[] = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: join(outputDir, 'index.cjs'),
        format: 'cjs',
      },
      {
        file: join(outputDir, 'index.js'),
        format: 'es',
        exports: 'named',
      },
    ],
    plugins: [
      // @ts-ignore
      rmdir(outputDir),
      alias({
        entries: [{ find: 'fs', replacement: 'node:fs' }],
      }),
      swc({
        include: /\.[mc]?[jt]sx?$/,
        exclude: /node_modules/,
        tsconfig: 'tsconfig.json',
        jsc: {
          target: 'es2022',
        },
      }),
      nodeResolve({}),
      commonjs({
        extensions: ['.node', '.cjs', '.js', '.mjs'],
      }),
    ],
    external,
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: join(outputDir, 'index.d.ts'),
        format: 'es',
      },
    ],
    plugins: [dts()],
    external,
  },
];

const cliEntries = globSync('./src/cli/**/*.ts', { absolute: true });

for (const entry of cliEntries) {
  const ext = extname(entry);
  const baseName = basename(entry, ext);
  options.push({
    input: entry,
    output: [
      {
        file: join(outputDir, `cli/${baseName}.cjs`),
        format: 'cjs',
        dynamicImportInCjs: false,
      },
      {
        file: join(outputDir, `cli/${baseName}.js`),
        format: 'es',
        exports: 'named',
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      swc({
        include: /\.[mc]?[jt]sx?$/,
        exclude: /node_modules/,
        tsconfig: 'tsconfig.json',
        jsc: {
          target: 'es2022',
        },
      }),
      nodeResolve({}),
      commonjs({
        extensions: ['.node', '.cjs', '.js', '.mjs'],
      }),
    ],
    external,
  });
  options.push({
    input: entry,
    output: [
      {
        file: join(outputDir, `cli/${baseName}.d.ts`),
        format: 'es',
      },
    ],
    plugins: [dts()],
    external,
  });
}

// console.log(options.map((it) => it.output));
//
// throw new Error('aaa');

export default options;
