// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { massifOf } from './massifs.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// A bulletin is issued once a day (around 16:00, sometimes re-issued): every
// 30 minutes is enough to see it within half an hour, and keeps the archive
// and the API far below any limit (DPBRA: 50 requests per minute).
export const REFRESH_MINUTES = 30;

export const DEFAULT_CONFIG = {
  massifs: [],
  api_key: '',
  language: 'fr',
};

/**
 * @param {object} raw configuration from Gladys
 * @returns {{codes: number[], apiKey: string, language: string}}
 */
export function normalizeConfig(raw = {}) {
  const config = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
  let values = config.massifs;
  if (typeof values === 'string') {
    // A value typed by hand, or stored by an older form: "8, 15".
    values = values.split(/[\s,;]+/);
  }
  const codes = [];
  for (const value of Array.isArray(values) ? values : []) {
    const massif = massifOf(String(value).trim());
    if (massif && !codes.includes(massif.code)) {
      codes.push(massif.code);
    }
  }
  const apiKey = typeof config.api_key === 'string' ? config.api_key.trim() : '';
  const language = LANGUAGES.includes(config.language) ? config.language : DEFAULT_CONFIG.language;
  return { codes, apiKey, language };
}
