import * as fs from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import type { Plugin } from 'rollup';
import * as semver from 'semver';

export type MonacoNlsInjectPluginOptions = {
  entry: string;
  version: string;
};

const baseVersion = '0.50.0';

export default function monacoNlsInject({
  entry,
  version,
}: MonacoNlsInjectPluginOptions): Plugin {
  const nlsFile = semver.gt(baseVersion, version) ? 'nls-0.50.0.js' : 'nls.js';

  const nlsSource = fs
    .readFileSync(resolve(__dirname, `../nls/${nlsFile}`))
    .toString('utf8');

  return {
    name: 'monaco-nls-inject',
    load(moduleId) {
      const nlsEnd = `${sep}nls.js`;
      if (moduleId.endsWith(nlsEnd)) {
        return nlsSource;
      }
    },
    transform(code, id) {
      if (code.includes('../nls')) {
        const row = /^(import\s+.*nls(.js)?[\'\"];?)$/gim.exec(code);
        const nlsId = relative(entry, id)
          // replace extname
          .replace(/.js$/, '')
          // replace window sep to http sep
          .replace(/\\/gm, '/');
        if (row != null) {
          const [head, ...tail] = code.split(row[0]);
          const source = row[0].replace(
            /import[\s]+(.*)[\s]+from[\s]+([\'\"])([^\'\"]+)\2;?/gm,
            ($0, $1, $2, $3) => {
              return [
                `import { createLocalize } from '${$3}';`,
                $1.trimStart().startsWith('*')
                  ? `const nls = createLocalize('${nlsId}');`
                  : `const ${$1} = createLocalize('${nlsId}');`,
              ].join('\n');
            },
          );
          return [head, source, ...tail].join('\n');
        }
      }
      return code;
    },
  };
}
