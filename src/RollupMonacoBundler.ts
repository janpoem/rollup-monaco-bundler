import { isInferObj } from '@zenstone/ts-utils/object';
import { notEmptyStr } from '@zenstone/ts-utils/string';
import { globSync } from 'glob';
import { existsSync, lstatSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import type { InputPluginOption, OutputOptions, RollupOptions } from 'rollup';
import stylesPlugin from 'rollup-plugin-styles';
import {
  type PluginOptions as RollupPluginSwc3Options,
  swc as swc3Plugin,
} from 'rollup-plugin-swc3';
import monacoNlsInject from './monacoNlsInject';

export type RollupPluginStylesOptions = Parameters<typeof stylesPlugin>[0];

export type RollupOptionsOverrideCallback<T> = (
  opts: T,
  entry: MonacoSourceEntry,
) => T;

export type RollupMonacoBundlerOptions = {
  srcDir: string;
  outputDir?: string;
  version?: string;
  onRollupOptions?: RollupOptionsOverrideCallback<RollupOptions>;
  onStylesOptions?: RollupOptionsOverrideCallback<RollupPluginStylesOptions>;
  onSwcOptions?: RollupOptionsOverrideCallback<RollupPluginSwc3Options>;
};

type PackageInfo = {
  version: string;
};

export enum MonacoSourceType {
  main = 'main',
  editorWorker = 'editor-worker',
  languageWorker = 'language-worker',
}

export type MonacoSourceEntry = {
  path: string;
  type: MonacoSourceType;
  priority: number;
};

export class RollupMonacoBundler {
  #srcDir: string;

  #entryDir: string;

  #outputDir: string;

  #version: string;

  #entries: MonacoSourceEntry[] = [];

  constructor(public readonly options: RollupMonacoBundlerOptions) {
    this.#srcDir = isAbsolute(options.srcDir)
      ? options.srcDir
      : resolve(process.cwd(), options.srcDir);
    this.#outputDir =
      notEmptyStr(options.outputDir) && isAbsolute(options.outputDir)
        ? options.outputDir
        : resolve(process.cwd(), options.outputDir || './dist');

    if (!existsSync(this.#srcDir)) {
      throw new Error('Source directory does not exist!');
    }
    const st = lstatSync(this.#srcDir);
    if (!st.isDirectory()) {
      throw new Error('Source directory path is not a directory!');
    }
    const pkg = readFileSync(join(this.#srcDir, 'package.json'), 'utf8');
    const json = JSON.parse(pkg);

    if (!isInferObj<PackageInfo>(json, (it) => notEmptyStr(it.version))) {
      throw new Error('Invalid package data, missing "version" property!"');
    }

    this.#version = json.version;
    this.#entryDir = join(this.#srcDir, 'esm/vs');
    this.#entries = [
      {
        path: join(this.#entryDir, 'editor/editor.main.js'),
        type: MonacoSourceType.main,
        priority: 0,
      },
      {
        path: join(this.#entryDir, 'editor/editor.worker.js'),
        type: MonacoSourceType.editorWorker,
        priority: 10,
      },
      ...globSync(`${this.#entryDir}/language/**/*.worker.js`, {
        absolute: true,
      }).map((it) => ({
        path: it,
        type: MonacoSourceType.languageWorker,
        priority: 50,
      })),
    ];
  }

  get srcDir() {
    return this.#srcDir;
  }

  get entryDir() {
    return this.#entryDir;
  }

  get outputDir() {
    return this.#outputDir;
  }

  get version() {
    return this.#version;
  }

  get entries() {
    return this.#entries.slice();
  }

  get defaultRollupOptions(): RollupOptions {
    return {
      context: 'window',
    };
  }

  get defaultStylesOptions(): RollupPluginStylesOptions {
    return {
      mode: [
        'inject',
        {
          container: 'head',
          singleTag: true,
          prepend: false,
          attributes: { id: 'monacoEditorStyles' },
        },
      ],
    };
  }

  get defaultSwcOptions(): RollupPluginSwc3Options {
    return {
      minify: true,
      jsc: {
        target: 'es2022',
      },
    };
  }

  makeEntryOutput = (entry: MonacoSourceEntry): OutputOptions => {
    const ext = extname(entry.path);
    const baseName = basename(entry.path, ext);
    const file = join(this.outputDir, `${baseName}.umd${ext}`);
    const format = 'umd';
    const output: OutputOptions = { file, format };

    if (entry.type === MonacoSourceType.main) {
      output.name = 'monaco';
      output.inlineDynamicImports = true;
      output.assetFileNames = '[name][extname]';
    } else {
      output.name = `monaco-${baseName.replace(/\./gm, '-')}`;
    }
    return output;
  };

  makeStylesPlugin = (entry: MonacoSourceEntry) => {
    const options = this.defaultStylesOptions;
    if (this.options.onStylesOptions != null) {
      return stylesPlugin(this.options.onStylesOptions(options, entry));
    }
    return stylesPlugin(options);
  };

  makeSwcPlugin = (entry: MonacoSourceEntry) => {
    const options = this.defaultSwcOptions;
    if (this.options.onSwcOptions != null) {
      return swc3Plugin(this.options.onSwcOptions(options, entry));
    }
    return swc3Plugin(options);
  };

  makeNlsInjectPlugin = (entry: MonacoSourceEntry) => {
    return monacoNlsInject({
      entry: this.entryDir,
      version: this.version,
    });
  };

  makeEntryPlugins = (entry: MonacoSourceEntry): InputPluginOption => {
    if (entry.type === MonacoSourceType.main) {
      return [
        // @ts-ignore
        rmdirPlugin(this.outputDir),
        this.makeStylesPlugin(entry),
        this.makeNlsInjectPlugin(entry),
        this.makeSwcPlugin(entry),
      ];
    }
    return [this.makeSwcPlugin(entry)];
  };

  makeEntryOptions = (entry: MonacoSourceEntry): RollupOptions => {
    const options = {
      ...this.defaultRollupOptions,
      input: entry.path,
      output: this.makeEntryOutput(entry),
      plugins: this.makeEntryPlugins(entry),
    };

    if (this.options.onRollupOptions != null) {
      return this.options.onRollupOptions(options, entry);
    }

    return options;
  };
}

const rmdirPlugin = (dir: string) =>
  dir &&
  existsSync(dir) &&
  statSync(dir).isDirectory() &&
  rmSync(dir, { recursive: true });
