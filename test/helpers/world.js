// -----------------------------------------------------------------------------
// Test world: the SDK's fake Gladys, the real wiring (src/app.js), and a fake
// fetch serving the real Météo-France files recorded under test/fixtures/bra/
// (same paths as the archive). No network.
// -----------------------------------------------------------------------------

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { ARCHIVE_BASE } from '../../src/source.js';
import { Store } from '../../src/store.js';

const FIXTURES = fileURLToPath(new URL('../fixtures/bra/', import.meta.url));

// 10 February 2026, 18:30 in Paris: the bulletins issued that afternoon are in
// force (valid until the 11th, 18:00).
export const FEB_10_EVENING = Date.parse('2026-02-10T17:30:00Z');

export const response = (status, body = '') => ({ status, text: async () => body });

/** Path of an archive URL under test/fixtures/bra/, or null. */
export function fixturePath(url) {
  if (!url.startsWith(ARCHIVE_BASE)) {
    return null;
  }
  const rest = decodeURIComponent(url.slice(ARCHIVE_BASE.length + 1));
  return join(FIXTURES, rest.endsWith('/') ? `${rest}index.html` : rest);
}

/**
 * A fetch serving the fixtures; 404 for anything else. `overrides` maps a URL
 * (or a predicate) to a response, for the error cases.
 */
export function fixtureFetch({ overrides = [], calls = [] } = {}) {
  return async (url, options) => {
    calls.push({ url, options });
    for (const [match, answer] of overrides) {
      if (typeof match === 'function' ? match(url) : match === url) {
        return typeof answer === 'function' ? answer(url) : answer;
      }
    }
    const path = fixturePath(url);
    if (!path) {
      return response(404);
    }
    try {
      return response(200, await readFile(path, 'utf8'));
    } catch {
      return response(404);
    }
  };
}

/**
 * Starts the integration against the fake Gladys.
 * @param {object} [options]
 * @param {object} [options.config] integration configuration
 * @param {number[]} [options.created] massif codes whose device the user created
 * @param {Function} [options.fetch]
 * @param {object} [options.clock] { now } mutable clock
 * @param {string} [options.dataDir] reuse a /data directory (restart)
 */
export async function createWorld({
  config = { massifs: ['3', '8', '65', '40'] },
  created = [],
  fetch = fixtureFetch(),
  clock = { now: FEB_10_EVENING },
  dataDir,
} = {}) {
  const directory = dataDir ?? (await mkdtemp(join(tmpdir(), 'gladys-avalanche-')));
  const gladys = createFakeGladys({ config });
  gladys.fake.devices = created.map((code) => ({
    name: `Device ${code}`,
    external_id: gladys.externalIds('massif', String(code)).device,
    features: [],
  }));
  const app = registerHandlers(gladys, {
    store: new Store(directory),
    fetch,
    timers: false,
    now: () => clock.now,
  });
  await gladys.connect();
  await app.ready;
  return {
    gladys,
    fake: gladys.fake,
    app,
    monitor: app.monitor,
    clock,
    directory,
    async cleanup() {
      await app.stop();
      if (!dataDir) {
        await rm(directory, { recursive: true, force: true });
      }
    },
  };
}

/** Captures what the SDK logger writes (console.log / console.error) at `level`. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
