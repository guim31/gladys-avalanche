// -----------------------------------------------------------------------------
// The bulletin reader, on real Météo-France files of the 2025-2026 season:
// Alps (split and no split), Pyrenees, Corsica, a risk rising during the day,
// the end of the season; plus the archive index and the French dates.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BulletinError, parseBulletin, snowAt } from '../src/bra.js';
import { massifOfFileName, MASSIFS, nameKey } from '../src/massifs.js';
import { ARCHIVE_BASE, findArchiveFiles, parseIndex } from '../src/source.js';
import { parisDayPath, parisLocalToMs } from '../src/time.js';
import { fixtureFetch, fixturePath } from './helpers/world.js';

const read = (path) => readFile(fixturePath(`${ARCHIVE_BASE}/${path}`), 'utf8');
const bulletin = async (path) => parseBulletin(await read(path));

test('Belledonne, 10 February 2026: danger 4 above 1700 m, 3 below', async () => {
  const b = await bulletin('2026/02/10/xml/Belledonne_20260210162000.xml');
  assert.equal(b.code, 8);
  assert.equal(new Date(b.issuedAt).toISOString(), '2026-02-10T15:00:00.000Z');
  assert.equal(new Date(b.validUntil).toISOString(), '2026-02-11T17:00:00.000Z');
  assert.equal(b.riskMax, 4);
  assert.equal(b.riskTomorrow, 4);
  assert.equal(b.riskBelow, 3);
  assert.equal(b.riskAbove, 4);
  assert.equal(b.splitAltitude, 1700);
  assert.deepEqual(b.aspects, ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
  assert.equal(b.comment, 'Au-dessus de 1700m indice de risque fort, plus bas indice marqué.');
  assert.match(b.summary, /^Départs spontanés : Nombreuses avalanches/);
  // The snow table of the day, not the past days of the BSH block.
  assert.deepEqual(snowAt(b, 2500), { altitude: 2500, north: 270, south: 210 });
  assert.equal(b.snowLevels.length, 3);
});

test('Mont-Blanc, same day: one level for the whole massif, 5 the day after', async () => {
  const b = await bulletin('2026/02/10/xml/Mont-Blanc_20260210161200.xml');
  assert.equal(b.riskMax, 4);
  assert.equal(b.riskTomorrow, 5);
  assert.equal(b.riskBelow, 4);
  assert.equal(b.riskAbove, 4);
  assert.equal(b.splitAltitude, null);
});

test('Aspe-Ossau (Pyrenees) and Cinto-Rotondo (Corsica)', async () => {
  const aspe = await bulletin('2026/02/10/xml/Aspe Ossau_20260210162700.xml');
  assert.equal(aspe.code, 65);
  assert.equal(aspe.riskMax, 4);
  assert.equal(aspe.riskTomorrow, 3);
  const cinto = await bulletin('2026/02/10/xml/Cinto Rotondo_20260210163500.xml');
  assert.equal(cinto.code, 40);
  assert.deepEqual([cinto.riskBelow, cinto.riskAbove, cinto.splitAltitude], [1, 3, 2000]);
  assert.deepEqual(cinto.aspects, ['N', 'NE', 'E', 'SE', 'NW']);
  assert.deepEqual(snowAt(cinto, 2000), { altitude: 2000, north: 245, south: 180 });
});

test('a risk that rises during the day counts at its higher level', async () => {
  // Chartreuse, 20 November 2025: RISQUE1="1" EVOLURISQUE1="2", RISQUEMAXI="2".
  const b = await bulletin('2025/11/20/xml/Chartreuse_20251120155900.xml');
  assert.equal(b.riskBelow, 2);
  assert.equal(b.riskMax, 2);
});

test('end of season, Mont-Blanc 7 June 2026: danger 2 above 3400 m only', async () => {
  const b = await bulletin('2026/06/07/xml/Mont-Blanc_20260607153900.xml');
  assert.deepEqual([b.riskBelow, b.riskAbove, b.splitAltitude], [1, 2, 3400]);
  assert.deepEqual(b.aspects, ['N', 'NE', 'NW']);
  // Summer time: 16:00 in Paris is 14:00 UTC.
  assert.equal(new Date(b.issuedAt).toISOString(), '2026-06-07T14:00:00.000Z');
});

test('the official test bulletin of the DPBRA API documentation reads the same', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<BULLETINS_NEIGE_AVALANCHE TYPEBULLETIN="BRA" ID="8" MASSIF="Belledonne" DATEBULLETIN="2023-10-26T10:00:00" DATEVALIDITE="2023-10-27T18:00:00" AMENDEMENT="false">
  <CARTOUCHERISQUE>
    <RISQUE RISQUE1="2" EVOLURISQUE1="" LOC1="&lt;2100" ALTITUDE="2100" RISQUE2="3" EVOLURISQUE2="2" LOC2="&gt;2100" RISQUEMAXI="3" COMMENTAIRE="Au-dessus de 2100m risque marqué > limité." RISQUEMAXIJ2="2" DATE_RISQUE_J2="2023-10-28T00:00:00"/>
    <PENTE NE="true" E="false" SE="false" S="true" SW="false" W="false" NW="true" N="false" COMMENTAIRE="Test affichage"/>
  </CARTOUCHERISQUE>
</BULLETINS_NEIGE_AVALANCHE>`;
  const b = parseBulletin(xml);
  assert.deepEqual([b.riskBelow, b.riskAbove, b.splitAltitude, b.riskMax], [2, 3, 2100, 3]);
  assert.equal(b.comment, 'Au-dessus de 2100m risque marqué > limité.');
  assert.deepEqual(b.aspects, ['NE', 'S', 'NW']);
  assert.deepEqual(b.snowLevels, []);
  assert.equal(b.summary, null);
});

test('a document that is not a bulletin is refused', () => {
  assert.throws(() => parseBulletin('<html>Not found</html>'), BulletinError);
  assert.throws(() => parseBulletin(undefined), BulletinError);
  assert.throws(
    () => parseBulletin('<BULLETINS_NEIGE_AVALANCHE ID="x" DATEBULLETIN="soon"/>'),
    BulletinError,
  );
});

test('French dates, whatever the time zone of the machine', () => {
  assert.equal(parisLocalToMs('2026-02-10T16:00:00'), Date.parse('2026-02-10T15:00:00Z'));
  assert.equal(parisLocalToMs('2026-06-07T16:00:00'), Date.parse('2026-06-07T14:00:00Z'));
  // Around the switch to summer time (29 March 2026, 02:00 → 03:00).
  assert.equal(parisLocalToMs('2026-03-29T04:00:00'), Date.parse('2026-03-29T02:00:00Z'));
  assert.equal(parisLocalToMs('nope'), null);
  // 23:30 UTC on 9 February is already the 10th in Paris.
  assert.equal(parisDayPath(Date.parse('2026-02-09T23:30:00Z')), '2026/02/10');
  assert.equal(parisDayPath(Date.parse('2026-03-01T10:00:00Z'), 1), '2026/02/28');
});

test('every file name of the archive belongs to its massif', async () => {
  for (const day of ['2026/02/10', '2025/11/20', '2025/11/03', '2026/06/07']) {
    const html = await read(`${day}/xml/`);
    const names = [...html.matchAll(/>([^<>]+)_\d{14}\.xml</g)].map((m) => m[1]);
    assert.ok(names.length > 10);
    for (const name of names) {
      assert.ok(massifOfFileName(name), `${day}: unknown massif file "${name}"`);
    }
  }
  const pdfs = await read('2026/02/10/pdf/');
  for (const [, name] of pdfs.matchAll(/>([^<>]+)_\d{14}\.pdf</g)) {
    assert.ok(massifOfFileName(name), `unknown PDF "${name}"`);
  }
  // Both spellings of Embrunais-Parpaillon.
  assert.equal(massifOfFileName('Embrunnais Parpaillon').code, 20);
  assert.equal(massifOfFileName('EMBRUNAIS-PARPAILLON').code, 20);
  assert.equal(new Set(MASSIFS.map((m) => nameKey(m.name))).size, MASSIFS.length);
});

test('the index gives the newest file of each massif, with its full address', async () => {
  const files = parseIndex(await read('2026/02/10/xml/'));
  assert.equal(new Set(files.map((f) => f.massif.code)).size, 35);
  const oisans = files.filter((f) => f.massif.code === 15);
  assert.deepEqual(
    oisans.map((f) => f.stamp),
    ['20260210162000', '20260210171500'],
  );
  const aspe = files.find((f) => f.massif.code === 65);
  assert.equal(
    aspe.url,
    'https://files.data.gouv.fr/meteofrance/data/BULLETIN/BRA/2026/02/10/xml/Aspe%20Ossau_20260210162700.xml',
  );
  const found = await findArchiveFiles(
    fixtureFetch(),
    [15, 65],
    Date.parse('2026-02-11T08:00:00Z'),
  );
  assert.equal(found.get(15).day, '2026/02/10');
  assert.match(found.get(15).url, /Oisans_20260210171500\.xml$/);
});
