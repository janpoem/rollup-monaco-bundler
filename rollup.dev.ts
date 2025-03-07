import { notEmptyStr } from '@zenstone/ts-utils/string';
import { parseArgs } from 'node:util';
import { RollupMonacoBundler } from './src';

const latestVersion = '0.52.2';

function getConfig(ver?: string | boolean) {
  const version = notEmptyStr(ver) ? ver : latestVersion;

  const bundler = new RollupMonacoBundler({
    srcDir: `tmp/${version}`,
    outputDir: `tmp_dist/${version}`,
    // onSwcOptions: (opts) => ({
    //   ...opts,
    //   minify: false,
    // }),
  });

  return bundler.entries.map(bundler.makeEntryOptions);
}

const { values } = parseArgs({
  args: process.argv,
  options: {
    buildVersion: {
      type: 'string',
    },
  },
  strict: false,
  allowPositionals: true,
});

export default getConfig(values.buildVersion);
