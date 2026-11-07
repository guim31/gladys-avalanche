// -----------------------------------------------------------------------------
// US avalanche centers (avalanche.org), against the real answers of the product
// API recorded on 7 November 2026 (test/fixtures/us/, author removed):
//   - CAIC_2752: a rated forecast (Colorado, "moderate" above treeline). CAIC is
//     not offered in the list (see src/us-zones.js), so it is served here as
//     the answer for Salt Lake (UAC): the parser does not depend on the zone;
//   - UAC_1738: a forecast without any rating (start of the season);
//   - NWAC_3028: a pre-season "summary"; KPAC_2990: an off-season summary;
//   - unknown: the answer for a zone the API does not know.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from '../src/config.js';
import { buildDevice, codeOfExternalId, massifIds } from '../src/devices.js';
import { TRIGGERS, WIDGET_KEY } from '../src/monitor.js';
import { STATUS } from '../src/messages.js';
import { US_PRODUCT_URL, parseUsForecast, plainText, usProductUrl } from '../src/us.js';
import { US_ZONES, usZoneLabel, usZoneOf } from '../src/us-zones.js';
import { createWorld, fixtureFetch, response } from './helpers/world.js';

const fixture = async (name) =>
  readFile(new URL(`./fixtures/us/${name}.json`, import.meta.url), 'utf8');

const SALT_LAKE = 'us-1738';
const MT_HOOD = 'us-3032';
// 7 November 2026, noon UTC: the CAIC forecast (23:30 UTC on the 6th to
// 23:30 UTC on the 7th) is in force.
const NOV_7_NOON = Date.parse('2026-11-07T12:00:00Z');

/** A fetch answering the product API with the fixtures named per zone code. */
async function usFetch(byZone, calls = []) {
  const bodies = {};
  for (const [code, name] of Object.entries(byZone)) {
    // A fixture name, or the JSON body itself.
    bodies[usProductUrl(usZoneOf(code))] = name.startsWith('{') ? name : await fixture(name);
  }
  return fixtureFetch({
    calls,
    overrides: [
      [
        (url) => url.startsWith(US_PRODUCT_URL),
        (url) => (url in bodies ? response(200, bodies[url]) : response(404)),
      ],
    ],
  });
}

const usWorld = async ({ byZone, created = [SALT_LAKE], config, calls, now = NOV_7_NOON }) =>
  createWorld({
    config: config ?? { massifs: [SALT_LAKE, MT_HOOD], language: 'en' },
    created,
    fetch: await usFetch(byZone, calls),
    clock: { now },
  });

test('the zone table: unique ids, labels that fit, CAIC left out', () => {
  assert.equal(new Set(US_ZONES.map((z) => z.id)).size, US_ZONES.length);
  assert.equal(US_ZONES.length, 83);
  assert.ok(US_ZONES.every((z) => z.center !== 'CAIC'));
  for (const zone of US_ZONES) {
    assert.match(zone.link, /^https?:\/\//);
    for (const language of ['en', 'fr', 'de', 'es']) {
      assert.ok(usZoneLabel(zone, language).length <= 60, usZoneLabel(zone, language));
    }
  }
  assert.equal(usZoneLabel(usZoneOf(SALT_LAKE), 'fr'), 'Utah · UAC · Salt Lake');
  assert.equal(usZoneLabel(usZoneOf('us-1833'), 'fr'), 'Californie · MSAC · Mount Shasta');
});

test('the configuration keeps the massif numbers and accepts US zones', () => {
  assert.deepEqual(normalizeConfig({ massifs: ['8', SALT_LAKE, 'us-9999', 'us-2752'] }).codes, [
    8,
    SALT_LAKE,
  ]);
  assert.deepEqual(normalizeConfig({ massifs: '8, us-1738' }).codes, [8, SALT_LAKE]);
});

test('a US zone is a device of its own type; the massif ids do not change', async () => {
  const world = await usWorld({ byZone: {} });
  try {
    const device = buildDevice(world.gladys, SALT_LAKE, 'en');
    assert.equal(device.external_id, world.gladys.externalIds('us_zone', '1738').device);
    assert.equal(device.name, 'Salt Lake');
    assert.equal(device.model, 'Utah Avalanche Center');
    assert.equal(device.should_poll, false);
    assert.deepEqual(
      device.features.map((f) => f.external_id),
      ['risk_max', 'risk_tomorrow', 'aspects', 'issued_at', 'valid_until', 'in_force'].map((key) =>
        world.gladys.externalIds('us_zone', '1738').feature(key),
      ),
    );
    assert.equal(codeOfExternalId(world.gladys, device.external_id), SALT_LAKE);
    assert.equal(codeOfExternalId(world.gladys, device.features[0].external_id), SALT_LAKE);
    assert.equal(
      codeOfExternalId(world.gladys, world.gladys.externalIds('us_zone', '2752').device),
      null,
    );
    // Unchanged: the massif 8 keeps the ids of version 1.0.
    assert.equal(massifIds(world.gladys, 8).device, world.gladys.externalIds('massif', '8').device);
    assert.equal(codeOfExternalId(world.gladys, world.gladys.externalIds('massif', '8').device), 8);
  } finally {
    await world.cleanup();
  }
});

test('parses a rated forecast: highest band, next day, aspects, bottom line', async () => {
  const bulletin = parseUsForecast(JSON.parse(await fixture('CAIC_2752')), usZoneOf(SALT_LAKE));
  assert.equal(bulletin.code, SALT_LAKE);
  assert.equal(bulletin.riskMax, 2);
  assert.equal(bulletin.riskTomorrow, 1);
  assert.deepEqual(bulletin.bands, { lower: 1, middle: 1, upper: 2 });
  assert.deepEqual(bulletin.aspects, ['N', 'NE', 'E', 'SE', 'W', 'NW']);
  assert.equal(bulletin.issuedAt, Date.parse('2026-11-06T23:30:00Z'));
  assert.equal(bulletin.validUntil, Date.parse('2026-11-07T23:30:00Z'));
  assert.match(bulletin.comment, /^The most dangerous areas are steep, planar slopes/);
  assert.doesNotMatch(bulletin.comment, /<|&nbsp;/);
  assert.equal(bulletin.splitAltitude, null);
  assert.deepEqual(bulletin.snowLevels, []);
});

test('no rating, summaries, off season and unknown zones give no bulletin', async () => {
  const zone = usZoneOf(SALT_LAKE);
  for (const name of ['UAC_1738', 'NWAC_3028', 'KPAC_2990', 'unknown']) {
    assert.equal(parseUsForecast(JSON.parse(await fixture(name)), zone), null, name);
  }
  assert.equal(parseUsForecast(null, zone), null);
  // -1 and 0 are "no rating".
  const product = JSON.parse(await fixture('CAIC_2752'));
  product.danger = [{ lower: -1, middle: 0, upper: -1, valid_day: 'current' }];
  assert.equal(parseUsForecast(product, zone), null);
  assert.equal(plainText('<p>A&nbsp;b &amp; c&ndash;d</p>'), 'A b & c–d');
});

test('publishes a rated zone, and only in_force for a zone without rating', async () => {
  const calls = [];
  const world = await usWorld({
    byZone: { [SALT_LAKE]: 'CAIC_2752', [MT_HOOD]: 'NWAC_3028' },
    created: [SALT_LAKE, MT_HOOD],
    calls,
  });
  try {
    const salt = massifIds(world.gladys, SALT_LAKE);
    const last = (id) => world.fake.lastState(id);
    assert.equal(last(salt.in_force), 1);
    assert.equal(last(salt.risk_max), 2);
    assert.equal(last(salt.risk_tomorrow), 1);
    assert.equal(last(salt.aspects), 'N, NE, E, SE, W, NW');
    assert.ok(last(salt.valid_until));
    for (const key of ['risk_below', 'risk_above', 'split_altitude', 'snow_north', 'snow_south']) {
      assert.equal(last(salt[key]), undefined, key);
    }
    const hood = massifIds(world.gladys, MT_HOOD);
    assert.equal(last(hood.in_force), 0);
    assert.equal(last(hood.risk_max), undefined);
    assert.equal(world.fake.connectionStatus.connected, true);
    // One request per zone, no request to the French archive.
    assert.deepEqual(
      calls.map((c) => c.url),
      [usProductUrl(usZoneOf(SALT_LAKE)), usProductUrl(usZoneOf(MT_HOOD))],
    );
  } finally {
    await world.cleanup();
  }
});

test('an expired forecast is no longer in force', async () => {
  const world = await usWorld({
    byZone: { [SALT_LAKE]: 'CAIC_2752' },
    now: Date.parse('2026-11-08T01:00:00Z'),
  });
  try {
    const salt = massifIds(world.gladys, SALT_LAKE);
    assert.equal(world.fake.lastState(salt.in_force), 0);
    assert.equal(world.fake.lastState(salt.risk_max), undefined);
  } finally {
    await world.cleanup();
  }
});

test('fires the triggers on a new US forecast, not on the first one', async () => {
  const first = await fixture('CAIC_2752');
  const next = JSON.parse(first);
  next.published_time = '2026-11-07T23:30:00+00:00';
  next.expires_time = '2026-11-08T23:30:00+00:00';
  next.danger = [
    { lower: 2, middle: 3, upper: 4, valid_day: 'current' },
    { lower: 2, middle: 3, upper: 3, valid_day: 'tomorrow' },
  ];
  const byZone = { [SALT_LAKE]: first };
  const world = await createWorld({
    config: { massifs: [SALT_LAKE], language: 'en' },
    created: [SALT_LAKE],
    fetch: await usFetch(byZone),
    clock: { now: NOV_7_NOON },
  });
  try {
    assert.deepEqual(world.fake.sceneEvents, []);
    world.monitor.fetch = await usFetch({ [SALT_LAKE]: JSON.stringify(next) });
    world.clock.now = Date.parse('2026-11-08T00:00:00Z');
    await world.monitor.runCycle();
    const events = world.fake.sceneEvents;
    assert.deepEqual(
      events.filter((e) => e.key === TRIGGERS.RISK_REACHED).map((e) => e.data.threshold),
      ['3', '4'],
    );
    const issued = events.find((e) => e.key === TRIGGERS.BULLETIN_ISSUED);
    assert.equal(issued.data.massif, massifIds(world.gladys, SALT_LAKE).device);
    assert.equal(issued.data.massif_name, `Device ${SALT_LAKE}`);
    assert.equal(issued.data.level, 4);
    assert.equal(issued.data.level_tomorrow, 3);
    assert.equal(issued.data.pdf_url, undefined);
    assert.match(issued.data.summary, /^The most dangerous areas/);
  } finally {
    await world.cleanup();
  }
});

test('an unreachable avalanche.org gives its own status, once, then recovers', async () => {
  let down = true;
  const ok = await fixture('CAIC_2752');
  const world = await createWorld({
    config: { massifs: [SALT_LAKE], language: 'en' },
    created: [SALT_LAKE],
    fetch: async (url) =>
      down ? response(503) : response(url.startsWith(US_PRODUCT_URL) ? 200 : 404, ok),
    clock: { now: NOV_7_NOON },
  });
  try {
    assert.equal(world.fake.connectionStatus.connected, false);
    assert.deepEqual(world.fake.connectionStatus.message, STATUS.usDown);
    down = false;
    await world.monitor.runCycle();
    assert.equal(world.fake.connectionStatus.connected, true);
    assert.equal(world.fake.lastState(massifIds(world.gladys, SALT_LAKE).risk_max), 2);
  } finally {
    await world.cleanup();
  }
});

test('the widget: overview with both sources, detail, off season', async () => {
  const world = await createWorld({
    config: { massifs: ['8', SALT_LAKE, MT_HOOD], language: 'en' },
    created: [8, SALT_LAKE, MT_HOOD],
    fetch: await usFetch({ [SALT_LAKE]: 'CAIC_2752', [MT_HOOD]: 'KPAC_2990' }),
    clock: { now: NOV_7_NOON },
  });
  const get = async (settings = {}, language = 'en') => {
    const ack = await world.fake.widgetGet(WIDGET_KEY, { settings, language, units: 'metric' });
    assert.equal(ack.success, true, ack.error);
    assert.deepEqual(validateWidgetContent(ack.data.content), []);
    return ack.data.content.components;
  };
  try {
    const overview = await get();
    const status = overview.find((c) => c.type === 'status');
    assert.deepEqual(
      status.items.map((i) => [i.label, i.value]),
      [
        ['Device 8', 'No bulletin in force'],
        [`Device ${SALT_LAKE}`, '2 · Moderate · next day 1'],
        [`Device ${MT_HOOD}`, 'No bulletin in force'],
      ],
    );
    assert.equal(
      overview.at(-1).text,
      'Météo-France · avalanche.org · read the full bulletin before going out',
    );

    const salt = massifIds(world.gladys, SALT_LAKE).device;
    for (const language of ['en', 'fr', 'de', 'es']) {
      await get({ massif: salt }, language);
    }
    const detail = await get({ massif: salt });
    assert.deepEqual(
      detail.filter((c) => c.type === 'value').map((c) => c.value),
      [2, 1],
    );
    const items = detail.find((c) => c.type === 'status').items;
    assert.deepEqual(
      items.slice(0, 3).map((i) => [i.label, i.value]),
      [
        ['Above treeline', '2 · Moderate'],
        ['Near treeline', '1 · Low'],
        ['Below treeline', '1 · Low'],
      ],
    );
    assert.ok(!items.some((i) => /Snow/.test(i.label)));
    assert.match(detail.find((c) => c.variant === 'caption').text, /^UAC, issued /);
    const button = detail.find((c) => c.type === 'button');
    assert.equal(button.link.url, usZoneOf(SALT_LAKE).link);
    const hidden = await get({ massif: salt, show_pdf: false, show_comment: false });
    assert.ok(!hidden.some((c) => c.type === 'button' || c.variant === 'body'));

    // Off season: says so, with the link to the center's forecast.
    const hood = await get({ massif: massifIds(world.gladys, MT_HOOD).device });
    assert.match(hood[0].text, /^No danger rating in force/);
    assert.equal(hood[1].link.url, usZoneOf(MT_HOOD).link);
  } finally {
    await world.cleanup();
  }
});
