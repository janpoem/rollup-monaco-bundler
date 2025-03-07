import { isInferObj } from '@zenstone/ts-utils/object';
import { notEmptyStr } from '@zenstone/ts-utils/string';

export class NpmPackageError extends Error {
  constructor(
    msg: string,
    public readonly name: string,
    public readonly version?: string,
  ) {
    super(msg);
  }
}

export type NpmPackageInfo = {
  _id: string;
  name: string;
  version: string;
  dist: NpmPackageDist;
};

export type NpmPackageDist = {
  shasum: string;
  tarball: string;
};

export const isNpmPackageDist = (obj: unknown) =>
  isInferObj<NpmPackageDist>(
    obj,
    (it) => notEmptyStr(it.shasum) && notEmptyStr(it.tarball),
  );

export const isNpmPackageInfo = (obj: unknown) =>
  isInferObj<NpmPackageInfo>(
    obj,
    (it) =>
      notEmptyStr(it._id) &&
      notEmptyStr(it.name) &&
      notEmptyStr(it.version) &&
      isNpmPackageDist(it.dist),
  );

const apiBaseUrl = 'https://registry.npmjs.org';

export const verifyPackageName = (name: string) => {
  // biome-ignore lint/complexity/useRegexLiterals: use package.json schema
  const pattern = new RegExp(
    '^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?/)?[a-z0-9-~][a-z0-9-._~]*$',
    'gm',
  );
  if (!pattern.test(name)) {
    throw new Error('Invalid package name: not match pattern');
  }
  if (name.length < 1 || name.length > 214) {
    throw new Error('Invalid package name: length should between 1 to 214');
  }
};

export const fetchNpmPackage = async (name: string, version?: string) => {
  const ver = version || 'latest';
  verifyPackageName(name);
  const resp = await fetch(`${apiBaseUrl}/${name}/${ver}`);
  const json = await resp.json();
  if (typeof json === 'string') {
    throw new NpmPackageError(json, name, ver);
  }
  if (isNpmPackageInfo(json)) {
    return json;
  }
  throw new NpmPackageError('Invalid package info return', name, ver);
};
