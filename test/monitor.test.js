// -----------------------------------------------------------------------------
// The monitor against the fake Gladys and the real Météo-France files of
// 10 February 2026 (danger 4 in most massifs, 5 forecast for the 12th).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HEARTBEAT_MS, TRIGGERS } from '../src/monitor.js';
import { massifIds } from '../src/devices.js';
import { ARCHIVE_BASE, DPBRA_URL } from '../src/source.js';
import {
  FEB_10_EVENING,
  createWorld,
  fixtureFetch,
  fixturePath,
  response,
} from './helpers/world.js';

const HOUR = 3600 * 1000;
const ids = (gladys, code) => massifIds(gladys, code);
const xmlOf = (path) => readFile(fixturePath(`${ARCHIVE_BASE}/${path}`), 'utf8');

test('publishes one device per configured massif, polled by the container', async () => {
  const world = await createWorld();
  try {
    const devices = world.fake.discoveredDevices;
    assert.deepEqual(
      devices.map((d) => d.name),
      ['Mont-Blanc', 'Belledonne', 'Aspe-Ossau', 'Cinto-Rotondo'],
    );
    for (const device of devices) {
      assert.equal(device.should_poll, false);
      assert.equal(device.poll_frequency, undefined);
      assert.equal(device.features.length, 11);
    }
    assert.equal(devices[0].external_id, world.gladys.externalIds('massif', '3').device);
    assert.equal(world.fake.connectionStatus.connected, true);
  } finally {
    await world.cleanup();
  }
});

test('publishes the bulletin in force of a created massif', async () => {
  const world = await createWorld({
    created: [8, 40],
    config: { massifs: ['8', '40'], language: 'en' },
  });
  try {
    const belledonne = ids(world.gladys, 8);
    const last = (id) => world.fake.lastState(id);
    assert.equal(last(belledonne.in_force), 1);
    assert.equal(last(belledonne.risk_max), 4);
    assert.equal(last(belledonne.risk_tomorrow), 4);
    assert.equal(last(belledonne.risk_below), 3);
    assert.equal(last(belledonne.risk_above), 4);
    assert.equal(last(belledonne.split_altitude), 1700);
    assert.equal(last(belledonne.aspects), 'All aspects');
    assert.match(last(belledonne.valid_until), /11\/02\/2026,? 18:00/);
    assert.equal(last(belledonne.snow_north), 270);
    assert.equal(last(belledonne.snow_south), 210);

    // Corsica: snow table up to 2000 m, a split at 2000 m, five aspects.
    const cinto = ids(world.gladys, 40);
    assert.equal(last(cinto.risk_below), 1);
    assert.equal(last(cinto.risk_above), 3);
    assert.equal(last(cinto.snow_north), 245);
    assert.equal(last(cinto.aspects), 'N, NE, E, SE, NW');

    // Not created: nothing published.
    assert.equal(last(ids(world.gladys, 3).in_force), undefined);
  } finally {
    await world.cleanup();
  }
});

test('takes the newest issue of the day when a massif was issued twice', async () => {
  const world = await createWorld({ created: [15], config: { massifs: ['15'] } });
  try {
    const entry = world.monitor.entries[15];
    assert.match(entry.url, /Oisans_20260210171500\.xml$/);
    assert.equal(new Date(entry.bulletin.issuedAt).toISOString(), '2026-02-10T16:00:00.000Z');
    assert.match(entry.pdfUrl, /OISANS_20260210161602\.pdf$/);
  } finally {
    await world.cleanup();
  }
});

test('a massif whose bulletin is no longer valid is "not in force", nothing else invented', async () => {
  // 13 February: the bulletin of the 10th expired, no newer file in the fixtures.
  const clock = { now: Date.parse('2026-02-12T09:00:00Z') };
  const calls = [];
  const world = await createWorld({
    created: [3],
    config: { massifs: ['3'] },
    clock,
    fetch: fixtureFetch({ calls }),
  });
  try {
    const mont = ids(world.gladys, 3);
    assert.equal(world.fake.lastState(mont.in_force), 0);
    assert.equal(world.fake.lastState(mont.risk_max), undefined);
    // Today and the two days before are read, then the search stops.
    assert.deepEqual(
      calls.map((c) => c.url.slice(ARCHIVE_BASE.length)),
      [
        '/2026/02/12/xml/',
        '/2026/02/11/xml/',
        '/2026/02/10/xml/',
        '/2026/02/10/xml/Mont-Blanc_20260210161200.xml',
        '/2026/02/10/pdf/',
      ],
    );
  } finally {
    await world.cleanup();
  }
});

test('off season: no file anywhere, not in force, no error', async () => {
  const world = await createWorld({
    created: [3],
    config: { massifs: ['3'] },
    clock: { now: Date.parse('2026-10-29T10:00:00Z') },
  });
  try {
    assert.equal(world.fake.lastState(ids(world.gladys, 3).in_force), 0);
    assert.equal(world.fake.connectionStatus.connected, true);
    assert.deepEqual(world.fake.sceneEvents, []);
  } finally {
    await world.cleanup();
  }
});

test('the bulletin expires at its validity end, with the next cycle', async () => {
  const world = await createWorld({ created: [8], config: { massifs: ['8'] } });
  try {
    const belledonne = ids(world.gladys, 8);
    assert.equal(world.fake.lastState(belledonne.in_force), 1);
    world.clock.now = Date.parse('2026-02-11T17:00:01Z'); // 18:00:01 in Paris
    await world.monitor.runCycle();
    assert.equal(world.fake.lastState(belledonne.in_force), 0);
  } finally {
    await world.cleanup();
  }
});

/** A world whose first bulletin is the one of Belledonne on 3 November 2025 (danger 2). */
async function worldWithReference(dataDir) {
  const clock = { now: Date.parse('2025-11-03T17:00:00Z') };
  const world = await createWorld({ created: [8], config: { massifs: ['8'] }, clock, dataDir });
  return world;
}

test('fires the triggers on a new bulletin, never on the first one read', async () => {
  const world = await worldWithReference();
  try {
    assert.deepEqual(world.fake.sceneEvents, [], 'the first bulletin only sets the reference');
    // The bulletin of 10 February: 2 → 4.
    world.clock.now = FEB_10_EVENING;
    await world.monitor.runCycle();
    const events = world.fake.sceneEvents;
    const reached = events.filter((e) => e.key === TRIGGERS.RISK_REACHED);
    assert.deepEqual(
      reached.map((e) => e.data.threshold),
      ['3', '4'],
    );
    const device = world.gladys.externalIds('massif', '8').device;
    assert.equal(reached[1].data.massif, device);
    assert.equal(reached[1].data.level, 4);
    assert.equal(reached[1].data.level_name, 'Fort');
    assert.equal(reached[1].data.massif_name, 'Device 8');
    const issued = events.filter((e) => e.key === TRIGGERS.BULLETIN_ISSUED);
    assert.equal(issued.length, 1);
    assert.equal(issued[0].data.level_tomorrow, 4);
    assert.match(issued[0].data.pdf_url, /BELLEDONNE_20260210152142\.pdf$/);
    assert.match(issued[0].data.summary, /^Départs spontanés/);

    // The same bulletin again: nothing.
    await world.monitor.runCycle();
    assert.equal(world.fake.sceneEvents.length, events.length);
  } finally {
    await world.cleanup();
  }
});

test('the reference survives a restart', async () => {
  const first = await worldWithReference();
  await first.app.stop();
  const restarted = await createWorld({
    created: [8],
    config: { massifs: ['8'] },
    dataDir: first.directory,
  });
  try {
    assert.deepEqual(
      restarted.fake.sceneEvents
        .filter((e) => e.key === TRIGGERS.RISK_REACHED)
        .map((e) => e.data.threshold),
      ['3', '4'],
    );
  } finally {
    await restarted.cleanup();
    await first.cleanup();
  }
});

test('a danger going down fires only the new-bulletin trigger', async () => {
  const world = await createWorld({ created: [3], config: { massifs: ['3'] } });
  try {
    world.clock.now = Date.parse('2026-06-07T15:00:00Z');
    await world.monitor.runCycle();
    assert.deepEqual(
      world.fake.sceneEvents.map((e) => e.key),
      [TRIGGERS.BULLETIN_ISSUED],
    );
  } finally {
    await world.cleanup();
  }
});

test('onDeviceCreated publishes everything again and refreshes the widget', async () => {
  const world = await createWorld({ config: { massifs: ['8'] } });
  try {
    const belledonne = ids(world.gladys, 8);
    assert.equal(world.fake.lastState(belledonne.risk_max), undefined);
    const device = world.fake.discoveredDevices[0];
    const before = world.fake.widgetRefreshes.length;
    await world.fake.deviceCreated(device);
    assert.equal(world.fake.lastState(belledonne.risk_max), 4);
    assert.equal(world.fake.lastState(belledonne.in_force), 1);
    assert.ok(world.fake.widgetRefreshes.length > before);
  } finally {
    await world.cleanup();
  }
});

test('publishes only what changed, with a 12-hour heartbeat', async (t) => {
  const world = await createWorld({ created: [8], config: { massifs: ['8'] } });
  try {
    const calls = [];
    t.mock.method(world.gladys, 'publishChangedStates', async (states, options) => {
      calls.push({ states, options });
      return { success: true, count: 0 };
    });
    await world.monitor.runCycle();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.heartbeat, HEARTBEAT_MS);
    assert.equal(HEARTBEAT_MS, 12 * HOUR);
  } finally {
    await world.cleanup();
  }
});

test('the archive file already read is not downloaded again', async () => {
  const calls = [];
  const world = await createWorld({ config: { massifs: ['8'] }, fetch: fixtureFetch({ calls }) });
  try {
    calls.length = 0;
    await world.monitor.runCycle();
    assert.deepEqual(
      calls.map((c) => c.url.slice(ARCHIVE_BASE.length)),
      ['/2026/02/10/xml/'],
    );
  } finally {
    await world.cleanup();
  }
});

test('refreshes on its own timer: onPoll reads again only after half a period', async () => {
  const calls = [];
  const world = await createWorld({
    created: [8],
    config: { massifs: ['8'] },
    fetch: fixtureFetch({ calls }),
  });
  try {
    const device = world.fake.devices[0];
    calls.length = 0;
    await world.fake.poll(device);
    assert.equal(calls.length, 0, 'a recent cycle: states only');
    world.clock.now += 15 * 60 * 1000;
    await world.fake.poll(device);
    assert.equal(calls.length, 1);
  } finally {
    await world.cleanup();
  }
});

test('an unreachable archive: one status, values kept, then back', async () => {
  let down = false;
  const fetch = fixtureFetch({ overrides: [[() => down, () => response(503)]] });
  const world = await createWorld({ created: [8], config: { massifs: ['8'] }, fetch });
  try {
    down = true;
    await world.monitor.runCycle();
    await world.monitor.runCycle();
    const statuses = world.fake.connectionStatuses;
    const last = statuses.at(-1);
    assert.equal(last.connected, false);
    assert.equal(typeof last.message, 'object');
    assert.deepEqual(Object.keys(last.message).sort(), ['de', 'en', 'es', 'fr']);
    assert.equal(statuses.filter((s) => s.connected === false).length, 1);
    assert.equal(world.fake.lastState(ids(world.gladys, 8).risk_max), 4);

    down = false;
    world.clock.now += HOUR;
    await world.monitor.runCycle();
    assert.equal(world.fake.connectionStatuses.at(-1).connected, true);
  } finally {
    await world.cleanup();
  }
});

test('with an API key, reads the DPBRA API instead of the archive', async () => {
  const calls = [];
  const xml = await xmlOf('2026/02/10/xml/Belledonne_20260210162000.xml');
  const fetch = fixtureFetch({
    calls,
    overrides: [[(url) => url.startsWith(DPBRA_URL), () => response(200, xml)]],
  });
  const world = await createWorld({
    created: [8],
    config: { massifs: ['8'], api_key: ' secret-key ' },
    fetch,
  });
  try {
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${DPBRA_URL}?id-massif=8&format=xml`);
    assert.equal(calls[0].options.headers.apikey, 'secret-key');
    assert.equal(world.fake.lastState(ids(world.gladys, 8).risk_max), 4);
    assert.equal(world.monitor.pdfUrl(8), null);
  } finally {
    await world.cleanup();
  }
});

test('a refused API key says so, without the key', async () => {
  const fetch = fixtureFetch({
    overrides: [[(url) => url.startsWith(DPBRA_URL), () => response(401)]],
  });
  const world = await createWorld({
    config: { massifs: ['8', '3'], api_key: 'secret-key' },
    fetch,
  });
  try {
    const status = world.fake.connectionStatus;
    assert.equal(status.connected, false);
    assert.match(status.message.en, /API key/);
    assert.doesNotMatch(JSON.stringify(world.fake.connectionStatuses), /secret-key/);
  } finally {
    await world.cleanup();
  }
});

test('a file holding another massif is never taken for this one', async () => {
  const wrong = await xmlOf('2026/02/10/xml/Mont-Blanc_20260210161200.xml');
  const fetch = fixtureFetch({
    overrides: [
      [(url) => url.endsWith('Belledonne_20260210162000.xml'), () => response(200, wrong)],
    ],
  });
  const world = await createWorld({ created: [8], config: { massifs: ['8'] }, fetch });
  try {
    assert.equal(world.monitor.bulletin(8), null);
    assert.equal(world.fake.lastState(ids(world.gladys, 8).in_force), 0);
  } finally {
    await world.cleanup();
  }
});

test('a configuration change publishes the devices and reads the new massifs', async () => {
  const world = await createWorld({ config: { massifs: ['8'] } });
  try {
    await world.fake.configUpdated({ massifs: ['8', '65'] });
    assert.deepEqual(
      world.fake.discoveredDevices.map((d) => d.name),
      ['Belledonne', 'Aspe-Ossau'],
    );
    assert.equal(world.monitor.bulletin(65).riskMax, 4);
  } finally {
    await world.cleanup();
  }
});

test('the paths of the fixtures are the paths of the archive', () => {
  assert.equal(
    fixturePath(`${ARCHIVE_BASE}/2026/02/10/xml/Aspe%20Ossau_20260210162700.xml`),
    join(fixturePath(`${ARCHIVE_BASE}/2026/02/10/xml/`), '..', 'Aspe Ossau_20260210162700.xml'),
  );
});

test('a failed start is tried again at the next connection', async (t) => {
  const { createFakeGladys } = await import('@gladysassistant/integration-sdk/testing');
  const { registerHandlers } = await import('../src/app.js');
  const { Store } = await import('../src/store.js');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'gladys-avalanche-'));
  const gladys = createFakeGladys({ config: { massifs: ['8'] } });
  const app = registerHandlers(gladys, {
    store: new Store(dir),
    fetch: fixtureFetch(),
    timers: false,
    now: () => FEB_10_EVENING,
  });
  t.after(async () => {
    await app.stop();
    await rm(dir, { recursive: true, force: true });
  });
  let fail = true;
  const original = gladys.publishDiscoveredDevices.bind(gladys);
  t.mock.method(gladys, 'publishDiscoveredDevices', async (devices) => {
    if (fail) {
      throw new Error('Gladys still starting');
    }
    return original(devices);
  });
  await gladys.connect();
  assert.equal(gladys.fake.connectionStatus.connected, false);
  fail = false;
  await gladys.disconnect();
  await gladys.connect();
  assert.equal(gladys.fake.discoveredDevices.length, 1);
  assert.equal(app.monitor.bulletin(8).riskMax, 4);
  assert.equal(gladys.fake.connectionStatus.connected, true);
});

test('a configuration change during a cycle is read right after it', async () => {
  const world = await createWorld({ config: { massifs: ['8'] } });
  try {
    const running = world.monitor.runCycle();
    await world.fake.configUpdated({ massifs: ['8', '65'] });
    await running;
    assert.equal(world.monitor.bulletin(65).riskMax, 4);
  } finally {
    await world.cleanup();
  }
});

test('the API path: an unchanged bulletin writes nothing, missing values are left out of events', async (t) => {
  const xmls = [
    await xmlOf('2025/11/03/xml/Belledonne_20251103151800.xml'),
    await xmlOf('2026/02/10/xml/Belledonne_20260210162000.xml'),
  ];
  let index = 0;
  const fetch = fixtureFetch({
    overrides: [[(url) => url.startsWith(DPBRA_URL), () => response(200, xmls[index])]],
  });
  const world = await createWorld({
    created: [8],
    config: { massifs: ['8'], api_key: 'k' },
    fetch,
  });
  try {
    const saves = t.mock.method(world.monitor.store, 'save');
    await world.monitor.runCycle();
    assert.equal(saves.mock.callCount(), 0);
    index = 1;
    await world.monitor.runCycle();
    const issued = world.fake.sceneEvents.find((e) => e.key === TRIGGERS.BULLETIN_ISSUED);
    assert.ok(issued);
    assert.equal('pdf_url' in issued.data, false);
    assert.ok(Object.values(issued.data).every((value) => value !== null));
  } finally {
    await world.cleanup();
  }
});

test('a device whose massif left the configuration is no longer published', async () => {
  const world = await createWorld({ created: [8, 3], config: { massifs: ['8'] } });
  try {
    assert.deepEqual(world.monitor.created(), [8]);
    assert.equal(world.fake.lastState(ids(world.gladys, 3).in_force), undefined);
  } finally {
    await world.cleanup();
  }
});
