import {
  ceil10,
  floor10,
  isNumberVal,
  limitNumberMinMax,
} from '@zenstone/ts-utils/number';
import * as ansiColors from 'ansi-colors';
import type { Direction } from 'node:tty';

type ValueType = string | number | boolean;

type CallbackProp = () => ValueType;

type CustomProp = ValueType | undefined | null | CallbackProp;

export type AnsiProgressBarProps = {
  progress: number | string | CallbackProp;
} & Record<string, CustomProp>;

export type AnsiProgressBarWriteStreamImpl = {
  clearLine?(dir: Direction, callback?: () => void): boolean;
  cursorTo?(x: number, y?: number, callback?: () => void): boolean;
  cursorTo?(x: number, callback: () => void): boolean;
  write(buffer: Uint8Array | string, cb?: (err?: Error) => void): boolean;
  write(
    str: Uint8Array | string,
    encoding?: BufferEncoding,
    cb?: (err?: Error) => void,
  ): boolean;
};

export const ansiProgressBar = (
  template: string,
  props: AnsiProgressBarProps,
  stream?: AnsiProgressBarWriteStreamImpl,
): void => {
  const out = stream ?? process.stdout;
  if (!template) {
    throw new Error('Missing template');
  }

  const filter = (key: string, value: ValueType): string => {
    if (key === 'progress' && isNumberVal(value)) {
      return `${ceil10(limitNumberMinMax(value, 0, 100))}%`;
    }
    return `${value}`;
  };

  const handleReplace = (_match: string, key: string) => {
    const prop = props[key];
    if (prop != null) {
      return filter(key, typeof prop === 'function' ? prop() : prop);
    }
    return '';
  };

  const text = template.replace(/{([^{}]+)}/gm, handleReplace);

  out.clearLine?.(0);
  out.cursorTo?.(0);
  out.write(text);
};

export const progressBar = (progress: number, displayWidth = 32) => {
  const progressWidth = floor10(
    (limitNumberMinMax(progress, 0, 100) / 100) * displayWidth,
  );

  // biome-ignore lint/style/useTemplate: <explanation>
  let bar = (progressWidth > 1 ? '='.repeat(progressWidth - 1) : '') + '>';
  if (progressWidth === displayWidth) {
    bar = '='.repeat(progressWidth);
  }

  return [
    ansiColors.gray('['),
    ansiColors.yellow(bar),
    ' '.repeat(displayWidth - progressWidth),
    ansiColors.gray(']'),
  ].join('');
};
