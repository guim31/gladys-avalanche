// -----------------------------------------------------------------------------
// The `avalanche` widget: content valid for the core (vocabulary and budget,
// checked by the SDK's validator), Gladys' device names, settings that hide the
// optional blocks, the off-season state.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY } from '../src/monitor.js';
import { levelColor, massifValue } from '../src/widgets.js';
import { createWorld } from './helpers/world.js';

const LANGS = ['en', 'fr', 'de', 'es'];

async function get(world, settings = {}, language = 'fr') {
  const ack = await world.fake.widgetGet(WIDGET_KEY, { settings, language, units: 'metric' });
  assert.equal(ack.success, true, ack.error);
  const content = ack.data.content;
  assert.deepEqual(validateWidgetContent(content), [], JSON.stringify(content));
  return content.components;
}

test('lists the followed massifs with their danger and the next-day trend', async () => {
  const world = await createWorld({ created: [3, 8, 40] });
  try {
    const components = await get(world);
    assert.deepEqual(components[0], {
      type: 'text',
      variant: 'heading',
      text: "Risque d'avalanche : 4 · Fort",
    });
    const status = components.find((c) => c.type === 'status');
    assert.deepEqual(
      status.items.map((i) => [i.label, i.value, i.color]),
      [
        ['Device 3', '4 · Fort · lendemain 5', 'danger'],
        ['Device 8', '4 · Fort · lendemain 4', 'danger'],
        ['Device 40', '3 · Marqué · lendemain 3', 'danger'],
      ],
    );
    for (const language of LANGS) {
      await get(world, {}, language);
    }
  } finally {
    await world.cleanup();
  }
});

test('the detail of a massif, with the comment and the PDF', async () => {
  const world = await createWorld({ created: [8] });
  try {
    const device = world.gladys.externalIds('massif', '8').device;
    for (const language of LANGS) {
      await get(world, { massif: device }, language);
    }
    const components = await get(world, { massif: device });
    const tiles = components.filter((c) => c.type === 'value');
    assert.deepEqual(
      tiles.map((t) => t.value),
      [4, 4],
    );
    const status = components.find((c) => c.type === 'status');
    assert.deepEqual(
      status.items.slice(0, 4).map((i) => [i.label, i.value]),
      [
        ['Sous 1700 m', '3 · Marqué'],
        ['Au-dessus de 1700 m', '4 · Fort'],
        ['Pentes les plus exposées', 'Toutes orientations'],
        ['Neige N / S à 2500 m', '270 / 210 cm'],
      ],
    );
    const body = components.find((c) => c.variant === 'body');
    assert.match(body.text, /^Au-dessus de 1700m/);
    const button = components.find((c) => c.type === 'button');
    assert.match(
      button.link.url,
      /^https:\/\/files\.data\.gouv\.fr\/.*BELLEDONNE_20260210152142\.pdf$/,
    );

    const bare = await get(world, { massif: device, show_comment: false, show_pdf: false });
    assert.equal(
      bare.find((c) => c.variant === 'body'),
      undefined,
    );
    assert.equal(
      bare.find((c) => c.type === 'button'),
      undefined,
    );
  } finally {
    await world.cleanup();
  }
});

test('off season, and empty states', async () => {
  const world = await createWorld({
    created: [3],
    clock: { now: Date.parse('2026-10-29T10:00:00Z') },
  });
  try {
    const list = await get(world);
    assert.equal(
      list.find((c) => c.type === 'status').items[0].value,
      'Pas de bulletin en vigueur',
    );
    const device = world.gladys.externalIds('massif', '3').device;
    const detail = await get(world, { massif: device });
    assert.match(detail[0].text, /^Aucun bulletin en vigueur/);
    const gone = await get(world, { massif: world.gladys.externalIds('massif', '8').device });
    assert.match(gone[0].text, /n'est plus suivi/);
  } finally {
    await world.cleanup();
  }
  const empty = await createWorld({ created: [] });
  try {
    const components = await get(empty, {}, 'en');
    assert.match(components[0].text, /^No massif yet/);
  } finally {
    await empty.cleanup();
  }
});

test('shows the name given in Gladys, and refreshes when it changes', async () => {
  const world = await createWorld({ created: [8] });
  try {
    const device = { ...world.fake.devices[0], name: 'Chamrousse' };
    const before = world.fake.widgetRefreshes.length;
    await world.fake.deviceUpdated(device);
    assert.ok(world.fake.widgetRefreshes.length > before);
    const status = (await get(world)).find((c) => c.type === 'status');
    assert.equal(status.items[0].label, 'Chamrousse');
  } finally {
    await world.cleanup();
  }
});

test('colours and values of the danger levels', () => {
  assert.deepEqual([null, 1, 2, 3, 4, 5].map(levelColor), [
    'neutral',
    'success',
    'warning',
    'danger',
    'danger',
    'danger',
  ]);
  const now = 0;
  const b = { validUntil: 1, riskMax: 5, riskTomorrow: 5 };
  for (const language of LANGS) {
    assert.ok(massifValue(b, now, language).length <= 40);
  }
  assert.equal(massifValue({ ...b, riskTomorrow: null }, now, 'de'), '5 · Sehr groß');
});
