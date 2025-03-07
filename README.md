# rollup-monaco-bundler

[![version](https://img.shields.io/npm/v/rollup-monaco-bundler?style=for-the-badge)](https://www.npmjs.com/package/rollup-monaco-bundler)
[![dt](https://img.shields.io/npm/dt/rollup-monaco-bundler?style=for-the-badge)](https://www.npmjs.com/package/rollup-monaco-bundler)

基于 [Rollup](https://rollupjs.org/)
实现的 [monaco-editor](https://microsoft.github.io/monaco-editor/) UMD 打包器。

主要特性：

- 以 `umd` 方式打包，便于将 `monaco-editor` 相关依赖外置，而不需要混入到主应用程序中。
- 注入 `nls` 优化，可在 `monaco-editor` 运行时动态加载多语言包。

该库主要提供三个内容：

- `RollupMonacoBundler` 用于快速生成 monaco-editor 打包项目环境的
  `rollup.config.ts`
- `monacoNlsInject` nls 多语言环境注入插件
- `cli/download-monaco` 用于指定下载不同版本的 monaco-editor 的源代码（基于 npm
  仓库）

## nls 说明

`0.50.0` 版本是一个重要的分水岭（`monaco-editor` 目前版本是 `0.52.0`）。

`0.50.0` 以前（包含 `0.50.0`），nls
是旧机制，对应 [nls-0.50.0.js](nls/nls-0.50.0.js)。

`0.50.0` 以后，nls
采用一套新的机制，但目前这个机制作用依旧等于没有（本地测试还有bug），对应 [nls.js](nls/nls-0.51.0.js)。

`RollupMonacoBundler` 会根据指定的源代码版本，识别对应的 nls 注入包。

众所周知，monaco-editor 和 vscode 是同宗，所以两者的多语言本地化是可以通用的。目前的
nls 注入机制，可以兼容 vscode 的翻译。

多语言示例参考：

[zh-cn.js](locale/zh-cn.js)

## 使用说明

示例项目：

- [rollup-monaco-bundler-npm-example](https://github.com/janpoem/rollup-monaco-bundler-npm-example)
- [rollup-monaco-bundler-bun-example](https://github.com/janpoem/rollup-monaco-bundler-bun-example)

添加包：

```bash
bun add rollup-monaco-bundler rollup rollup-plugin-swc3 rollup-plugin-styles
# or
npm install rollup-monaco-bundler rollup rollup-plugin-swc3 rollup-plugin-styles
```

下载所需的 `monaco-editor` 的源代码：

```bash
# 下载最后的版本 - latest
download-monaco
# 指定版本下载
download-monaco -v 0.50.0
# 指定下载目录
download-monaco -v 0.52.2 -d ./tmp 
```

修改项目的 `rollup.config.js` 文件

```js
import { RollupMonacoBundler } from 'rollup-monaco-bundler';

// const version = '0.50.0';
const version = '0.52.2';

const bundler = new RollupMonacoBundler({
  srcDir: `tmp/${version}`,
  outputDir: `dist/${version}`,
});

export default bundler.entries.map(bundler.makeEntryOptions);
```

在项目根目录添加 `tsconfig.json` 文件（swc 编译需要），请根据自己编译代码时需要的环境进行调整。

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleDetection": "force",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

### RollupMonacoBundler 的用法

```ts
import { RollupMonacoBundler } from 'rollup-monaco-bundler';

const version = '0.52.2';

const bundler = new RollupMonacoBundler({
  srcDir: `tmp/${version}`,
  outputDir: `dist/${version}`,
  // 生成 swc 配置时候重载默认配置
  onSwcOptions: (opts, entry) => ({
    ...opts,
    minify: false,
  }),
  // 重载生成 css 的配置
  onStylesOptions: (opts, entry) => ({}),
  // 重载每一个 rollup 的 options（每一个 entry 的配置）
  onRollupOptions: (opts, entry) => ({
    ...opts,
  }),
});
```
