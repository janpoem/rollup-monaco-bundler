/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// esm/vs/nls.js
const isPseudo =
  getNLSLanguage() === 'pseudo' ||
  (typeof document !== 'undefined' &&
    document.location &&
    document.location.hash.indexOf('pseudo=true') >= 0);

function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index = rest[0];
      const arg = args[index];
      let result = match;
      if (typeof arg === 'string') {
        result = arg;
      } else if (
        typeof arg === 'number' ||
        typeof arg === 'boolean' ||
        arg === void 0 ||
        arg === null
      ) {
        result = String(arg);
      }
      return result;
    });
  }
  if (isPseudo) {
    // FF3B and FF3D is the Unicode zenkaku representation for [ and ]
    result = '\uFF3B' + result.replace(/[aouei]/g, '$&$&') + '\uFF3D';
  }
  return result;
}

/**
 * @skipMangle
 */
export function localize(
  data /* | number when built */,
  message /* | null when built */,
  ...args
) {
  if (typeof data === 'number') {
    return _format(lookupMessage(data, message), args);
  }
  return _format(message, args);
}

/**
 * Only used when built: Looks up the message in the global NLS table.
 * This table is being made available as a global through bootstrapping
 * depending on the target context.
 */
function lookupMessage(index, fallback) {
  const message = getNLSMessages()?.[index];
  if (typeof message !== 'string') {
    if (typeof fallback === 'string') {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index} !!!`);
  }
  return message;
}

/**
 * @skipMangle
 */
export function localize2(
  data /* | number when built */,
  originalMessage,
  ...args
) {
  let message;
  if (typeof data === 'number') {
    message = lookupMessage(data, originalMessage);
  } else {
    message = originalMessage;
  }
  const value = _format(message, args);
  return {
    value,
    original:
      originalMessage === message ? value : _format(originalMessage, args),
  };
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// esm/vs/nls.message.js

function getNLSMessages() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}

export { getNLSLanguage, getNLSMessages };

/**
 * @skipMangle
 */
export function getConfiguredDefaultLocale(_) {
  // This returns undefined because this implementation isn't used and is overwritten by the loader
  // when loaded.
  return undefined;
}

export function createLocalize(ns) {
  ns = ns.startsWith('vs/') ? ns : 'vs/' + ns;
  const _localize =
    type =>
      (data, message, ...args) => {
        const original = _format(getLocaleMessage(ns, data, message), args);
        return type > 0
          ? {
            value: original,
            original,
          }
          : original;
      };

  return {
    localize: _localize(0),
    localize2: _localize(1),
    getConfiguredDefaultLocale,
    getNLSLanguage,
    getNLSMessages
  };
}

const monacoLocale = {
  isInit: false,
  locale: null,
};

function initMonacoLocale() {
  if (monacoLocale.isInit) return monacoLocale.locale;
  const env = globalThis.MonacoEnvironment || {};
  monacoLocale.locale = env.locale || null;
  monacoLocale.isInit = true;
  return monacoLocale.locale;
}

function getLocaleMessage(ns, data, message) {
  const all = globalThis.MonacoLocales || {};
  const locale = initMonacoLocale();
  if (locale != null && all[locale] != null && all[locale][ns] != null) {
    let key = '';
    if (data != null) {
      if (typeof data === 'string') {
        key = data;
      } else if (typeof data === 'object' && 'key' in data) {
        key = data['key'];
      }
    }
    return all[locale][ns][key] || message;
  }
  return message;
}
