import { RollupMonacoBundler } from './src';

// const version = '0.50.0';
const version = '0.52.2';

const bundler = new RollupMonacoBundler({
  srcDir: `tmp/${version}`,
  outputDir: `tmp_dist/${version}`,
  // onSwcOptions: (opts) => ({
  //   ...opts,
  //   minify: false,
  // }),
});

const opts = bundler.entries.map(bundler.makeEntryOptions);

export default opts;
