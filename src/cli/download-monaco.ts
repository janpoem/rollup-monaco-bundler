#!/usr/bin/env node
import { fetchDownload } from '@zenstone/ts-utils/fetch-download';
import { notEmptyStr } from '@zenstone/ts-utils/string';
import * as ansiColors from 'ansi-colors';
import { filesize } from 'filesize';
import * as fs from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ansiProgressBar, fetchNpmPackage, progressBar } from '../utils';

export type DownloadMonacoOptions = {
  version?: string;
  dir?: string;
  overwrite?: boolean;
};

export default async function downloadMonaco({
  version,
  dir,
  overwrite,
}: DownloadMonacoOptions) {
  const downloadDir =
    notEmptyStr(dir) && isAbsolute(dir) ? dir : resolve(`${process.cwd()}/tmp`);
  let dirExists = false;

  // 下载目录检查
  if (fs.existsSync(downloadDir)) {
    const st = fs.lstatSync(downloadDir);
    if (st.isSymbolicLink()) {
      throw new Error('Download dir cannot be symbolic link');
    }
    if (!st.isDirectory()) {
      throw new Error('Download dir should be directory');
    }
    dirExists = true;
  }

  // 先根据用户输入的 version 去 fetch 一次 package 信息
  const pkg = await fetchNpmPackage('monaco-editor', version);

  // 基于 package 信息中明确的版本号，去检查本地是否已经存在相关的版本号
  const versionDir = join(downloadDir, pkg.version);

  if (fs.existsSync(versionDir)) {
    const st = fs.lstatSync(downloadDir);
    if (st.isSymbolicLink()) {
      throw new Error(`Version "${pkg.version}" exists but it's symbolic link`);
    }
    if (st.isFile()) {
      throw new Error(
        `Version "${pkg.version}" exists but it's not a directory`,
      );
    }
    if (st.isDirectory()) {
      if (overwrite) {
        fs.rmSync(versionDir, { recursive: true });
      } else {
        throw new Error(`Version "${pkg.version}" exists`);
      }
    }
  }

  const naming = (name: string) => ansiColors.green(name);

  const title = `Download ${naming(`monaco-editor@${pkg.version}`)}`;

  // 开始下载
  const task = await fetchDownload(pkg.dist.tarball).read({
    onProgress(task) {
      ansiProgressBar('{title}: {progressBar} {progress} {speed}', {
        title,
        progressBar: () => progressBar(task.percent),
        progress: () => `${task.percent}%`,
        speed: () => ansiColors.gray(`(${filesize(task.speed)}/s)`),
      });
    },
    onComplete() {
      process.stdout.write('\n');
    },
  });

  if (task.chunks == null) {
    throw new Error('The download buffer is empty, please try again');
  }

  // 通过内存对 chunks 解压的速度太慢，不稳定，大文件容易出错
  // 所以这里 i/o 操作拆分，先把压缩包保存，再直接对压缩包路径进行解压处理
  const tgzFilename = `${pkg.version}.tgz`;
  const tgzPath = join(downloadDir, `${pkg.version}.tgz`);

  if (!dirExists) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  fs.writeFileSync(tgzPath, task.chunks);

  console.log(`Unzipping ${naming(tgzFilename)}...`);
  fs.mkdirSync(versionDir, { recursive: true });
  await _extract(tgzPath, versionDir);

  console.log(`Deleting ${naming(tgzFilename)}...`);
  fs.rmSync(tgzPath);
}

async function _extract(file: string, dir: string) {
  // @see https://github.com/oven-sh/bun/issues/12696
  const needTarWorkaround =
    typeof Bun !== 'undefined' && process.platform === 'win32';
  if (needTarWorkaround) process.env.__FAKE_PLATFORM__ = 'linux';

  const { extract } = await import('tar');
  await extract({ C: dir, file: file, strip: 1 });

  // biome-ignore lint/performance/noDelete: fix tar
  if (needTarWorkaround) delete process.env.__FAKE_PLATFORM__;
}

const { values } = parseArgs({
  args: process.argv,
  options: {
    version: {
      type: 'string',
      short: 'v',
      description:
        'Specify the version number of monaco-editor to download. If not specified will be "latest"',
    },
    dir: {
      type: 'string',
      short: 'd',
      description:
        'Specify the root directory for downloading and decompressing. If not specified will be `${process.cwd()}/tmp`',
    },
    overwrite: {
      type: 'boolean',
      short: 'o',
      default: false,
      description:
        'Whether to overwrite the existing version, the default value is "false". If "true" is selected, the existing version will be deleted first.',
    },
  },
  strict: true,
  allowPositionals: true,
});

downloadMonaco(values ?? {}).catch(console.error);
