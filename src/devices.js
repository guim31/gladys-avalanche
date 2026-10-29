// -----------------------------------------------------------------------------
// One Gladys device per followed massif.
//
// Features (couples checked against the Gladys front, see
// test/gladys-rules.test.js):
//   - risk_max, risk_tomorrow, risk_below, risk_above: the danger level, 1 to 5
//     (European scale), as counter-sensor/integer. Not risk/integer: the
//     Gladys front labels that one 0 to 3 ("no risk" to "high") and would show
//     "unknown" for 4 and 5. risk_max is the highest level of the bulletin's
//     day, risk_tomorrow the trend for the day after, risk_below / risk_above
//     the level under and over the split altitude (the same one when the
//     bulletin has no split);
//   - split_altitude: distance-sensor/decimal in metres, 0 when the bulletin
//     gives one level for the whole massif;
//   - aspects: text/text, the slopes the bulletin singles out;
//   - issued_at, valid_until: text/text, dates of the bulletin;
//   - snow_north, snow_south: distance-sensor/decimal in cm, snow depth at the
//     top altitude of the bulletin's table (2000 or 2500 m, see massifs.js);
//   - in_force: input/binary, 1 while a bulletin covers now (0 off season).
//
// Published with should_poll: false: the refresh runs in the container
// (src/monitor.js). The massif number is the platform id.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { snowAt } from './bra.js';
import { massifOf } from './massifs.js';
import { aspectsText } from './messages.js';
import { formatDateTime } from './time.js';

export const DEVICE_TYPE = 'massif';
export const FEATURE_KEYS = [
  'risk_max',
  'risk_tomorrow',
  'risk_below',
  'risk_above',
  'split_altitude',
  'aspects',
  'issued_at',
  'valid_until',
  'snow_north',
  'snow_south',
  'in_force',
];

// Feature names, frozen at creation in Gladys (language of the configuration).
// `{altitude}` is the reference altitude of the snow depths.
export const NAMES = {
  en: {
    risk_max: 'Avalanche danger (1-5)',
    risk_tomorrow: 'Danger trend, next day',
    risk_below: 'Danger below the split altitude',
    risk_above: 'Danger above the split altitude',
    split_altitude: 'Split altitude',
    aspects: 'Most exposed aspects',
    issued_at: 'Bulletin issued on',
    valid_until: 'Valid until',
    snow_north: 'Snow on north side at {altitude} m',
    snow_south: 'Snow on south side at {altitude} m',
    in_force: 'Bulletin in force',
  },
  fr: {
    risk_max: "Risque d'avalanche (1-5)",
    risk_tomorrow: 'Tendance du risque, lendemain',
    risk_below: "Risque sous l'altitude limite",
    risk_above: "Risque au-dessus de l'altitude limite",
    split_altitude: 'Altitude limite',
    aspects: 'Pentes les plus exposées',
    issued_at: 'Bulletin émis le',
    valid_until: "Valable jusqu'au",
    snow_north: 'Neige versant nord à {altitude} m',
    snow_south: 'Neige versant sud à {altitude} m',
    in_force: 'Bulletin en vigueur',
  },
  de: {
    risk_max: 'Lawinengefahr (1-5)',
    risk_tomorrow: 'Tendenz der Gefahr, Folgetag',
    risk_below: 'Gefahr unter der Höhengrenze',
    risk_above: 'Gefahr über der Höhengrenze',
    split_altitude: 'Höhengrenze',
    aspects: 'Gefährlichste Expositionen',
    issued_at: 'Bericht erstellt am',
    valid_until: 'Gültig bis',
    snow_north: 'Schnee Nordseite auf {altitude} m',
    snow_south: 'Schnee Südseite auf {altitude} m',
    in_force: 'Bericht gültig',
  },
  es: {
    risk_max: 'Riesgo de aludes (1-5)',
    risk_tomorrow: 'Tendencia del riesgo, día siguiente',
    risk_below: 'Riesgo bajo la altitud límite',
    risk_above: 'Riesgo sobre la altitud límite',
    split_altitude: 'Altitud límite',
    aspects: 'Orientaciones más expuestas',
    issued_at: 'Boletín emitido el',
    valid_until: 'Válido hasta',
    snow_north: 'Nieve cara norte a {altitude} m',
    snow_south: 'Nieve cara sur a {altitude} m',
    in_force: 'Boletín vigente',
  },
};

const LEVEL_FEATURES = ['risk_max', 'risk_tomorrow', 'risk_below', 'risk_above'];
const MAX_ALTITUDE_M = 5000;
const MAX_SNOW_CM = 1000;

/** External ids of a massif device and of its features. */
export function massifIds(gladys, code) {
  const ids = gladys.externalIds(DEVICE_TYPE, String(code));
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURE_KEYS.map((key) => [key, ids.feature(key)])),
  };
}

/** The massif code of a device or feature external id (null if not ours). */
export function codeOfExternalId(gladys, externalId) {
  const prefix = gladys.externalIds(DEVICE_TYPE, '').device;
  if (typeof externalId !== 'string' || !externalId.startsWith(prefix)) {
    return null;
  }
  const massif = massifOf(externalId.slice(prefix.length).split(':')[0]);
  return massif ? massif.code : null;
}

/** Feature name in a language, the altitude filled in. */
export function featureName(key, language, massif) {
  const names = NAMES[language] ?? NAMES.fr;
  return names[key].replace('{altitude}', String(massif.snowAltitude));
}

function feature(key, ids, language, massif) {
  const base = {
    name: featureName(key, language, massif),
    external_id: ids[key],
    read_only: true,
    has_feedback: false,
  };
  if (LEVEL_FEATURES.includes(key)) {
    return {
      ...base,
      category: CATEGORIES.COUNTER_SENSOR,
      type: TYPES.SENSOR.INTEGER,
      keep_history: true,
      min: 1,
      max: 5,
    };
  }
  if (key === 'split_altitude') {
    return {
      ...base,
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.DECIMAL,
      unit: UNITS.M,
      keep_history: true,
      min: 0,
      max: MAX_ALTITUDE_M,
    };
  }
  if (key === 'snow_north' || key === 'snow_south') {
    return {
      ...base,
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.DECIMAL,
      unit: UNITS.CM,
      keep_history: true,
      min: 0,
      max: MAX_SNOW_CM,
    };
  }
  if (key === 'in_force') {
    return {
      ...base,
      category: CATEGORIES.INPUT,
      type: TYPES.INPUT.BINARY,
      keep_history: true,
      min: 0,
      max: 1,
    };
  }
  return {
    ...base,
    category: CATEGORIES.TEXT,
    type: TYPES.TEXT.TEXT,
    keep_history: false,
    min: 0,
    max: 0,
  };
}

/** The discovery payload of a massif. */
export function buildDevice(gladys, code, language = 'fr') {
  const massif = massifOf(code);
  const ids = massifIds(gladys, massif.code);
  return {
    name: massif.name,
    external_id: ids.device,
    model: 'Météo-France BERA',
    should_poll: false,
    params: [{ name: 'MASSIF_NUMBER', value: String(massif.code) }],
    features: FEATURE_KEYS.map((key) => feature(key, ids, language, massif)),
  };
}

/**
 * States of a massif device. Without a bulletin in force, only `in_force` (0):
 * the other values are not invented, and the last ones age in Gladys.
 * @param {object} gladys
 * @param {number} code
 * @param {object|null} bulletin see bra.js parseBulletin
 * @param {number} now ms
 * @param {string} language
 */
export function deviceStates(gladys, code, bulletin, now, language) {
  const ids = massifIds(gladys, code);
  const inForce = Boolean(bulletin) && bulletin.validUntil > now;
  const states = [{ device_feature_external_id: ids.in_force, state: inForce ? 1 : 0 }];
  if (!inForce) {
    return states;
  }
  const add = (key, value) => {
    if (value !== null && value !== undefined) {
      states.push({ device_feature_external_id: ids[key], state: value });
    }
  };
  const addText = (key, text) => {
    if (text) {
      states.push({ device_feature_external_id: ids[key], text });
    }
  };
  add('risk_max', bulletin.riskMax);
  add('risk_tomorrow', bulletin.riskTomorrow);
  add('risk_below', bulletin.riskBelow);
  add('risk_above', bulletin.riskAbove);
  add('split_altitude', bulletin.riskBelow === null ? null : (bulletin.splitAltitude ?? 0));
  addText('aspects', aspectsText(bulletin.aspects, language));
  addText('issued_at', formatDateTime(bulletin.issuedAt, language));
  addText('valid_until', formatDateTime(bulletin.validUntil, language));
  const snow = snowAt(bulletin, massifOf(code).snowAltitude);
  add('snow_north', snow?.north);
  add('snow_south', snow?.south);
  return states;
}
