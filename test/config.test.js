import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';

test('defaults', () => {
  assert.deepEqual(normalizeConfig(undefined), { codes: [], apiKey: '', language: 'fr' });
  assert.deepEqual(DEFAULT_CONFIG.massifs, []);
});

test('massifs: known codes only, once, in order; a typed list is accepted', () => {
  assert.deepEqual(normalizeConfig({ massifs: ['8', '71', '8', '65', 'x'] }).codes, [8, 65]);
  assert.deepEqual(normalizeConfig({ massifs: '40; 3, 999' }).codes, [40, 3]);
  assert.deepEqual(normalizeConfig({ massifs: null }).codes, []);
});

test('API key trimmed, language among the four', () => {
  const config = normalizeConfig({ api_key: '  k  ', language: 'it' });
  assert.equal(config.apiKey, 'k');
  assert.equal(config.language, 'fr');
  assert.equal(normalizeConfig({ language: 'de' }).language, 'de');
});
