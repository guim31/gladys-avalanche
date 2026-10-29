// -----------------------------------------------------------------------------
// Reads a Météo-France avalanche bulletin (BERA, "BRA" files), XML format of
// the open archive and of the DPBRA API (same document; format described in
// "Descriptif bulletin avalanche format XML" of the data.gouv dataset).
//
// The document is small and flat: a few regular expressions read the parts the
// integration uses, without an XML dependency (the sandbox has 256 MB).
//
//   <BULLETINS_NEIGE_AVALANCHE ID="8" MASSIF="Belledonne"
//       DATEBULLETIN="2026-02-10T16:00:00" DATEVALIDITE="2026-02-11T18:00:00" ...>
//     <CARTOUCHERISQUE>
//       <RISQUE RISQUE1="3" EVOLURISQUE1="" ALTITUDE="1700" RISQUE2="4"
//               EVOLURISQUE2="" RISQUEMAXI="4" COMMENTAIRE="..." RISQUEMAXIJ2="4"
//               DATE_RISQUE_J2="2026-02-12T00:00:00"/>
//       <PENTE NE="true" E="true" ... N="true"/>
//       <RESUME><![CDATA[...]]></RESUME>
//     </CARTOUCHERISQUE>
//     <ENNEIGEMENT DATE="..." LimiteSud="1400" LimiteNord="900">
//       <NIVEAU ALTI="2500" N="270" S="210"/> ...
//
// RISQUE1 is the risk below ALTITUDE (or everywhere when RISQUE2 is empty),
// RISQUE2 above it; EVOLURISQUE1/2, when set, is the level the risk reaches
// later in the day (warming, snowfall): the level of a zone is the higher of
// the two. Every date is French local time.
// -----------------------------------------------------------------------------

import { parisLocalToMs } from './time.js';

export class BulletinError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BulletinError';
  }
}

// Aspects in the order of the compass rose, as the bulletin names them.
export const ASPECTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** Attributes of the first `<tag ...>` (opening or empty element) after `from`. */
function attributesOf(xml, tag, from = 0) {
  // Attribute values may hold a raw ">" (legal in XML): match them whole.
  const re = new RegExp(`<${tag}((?:\\s+[\\w:-]+\\s*=\\s*"[^"]*")*)\\s*/?>`, 'g');
  re.lastIndex = from;
  const match = re.exec(xml);
  if (!match) {
    return null;
  }
  const attributes = {};
  for (const [, name, value] of (match[1] ?? '').matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    attributes[name] = decode(value);
  }
  return attributes;
}

/** Text content of the first `<tag>...</tag>`, CDATA unwrapped; null if absent or empty. */
function textOf(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  if (!match) {
    return null;
  }
  const text = match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) => inner)
    .replace(/<[^>]+>/g, '');
  const clean = decode(text).trim();
  return clean === '' ? null : clean;
}

/** A level of the European avalanche danger scale (1 to 5), or null. */
function level(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** A non-negative integer (altitude, snow depth), or null. */
function whole(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  return Number(text);
}

const zoneLevel = (risk, evolution) => {
  const levels = [level(risk), level(evolution)].filter((n) => n !== null);
  return levels.length === 0 ? null : Math.max(...levels);
};

/**
 * @param {string} xml the bulletin
 * @returns {object} the bulletin, see the fields below
 * @throws {BulletinError} when the document is not a bulletin
 */
export function parseBulletin(xml) {
  if (typeof xml !== 'string') {
    throw new BulletinError('empty document');
  }
  const root = attributesOf(xml, 'BULLETINS_NEIGE_AVALANCHE');
  if (!root) {
    throw new BulletinError('not an avalanche bulletin');
  }
  const code = whole(root.ID);
  const issuedAt = parisLocalToMs(root.DATEBULLETIN);
  const validUntil = parisLocalToMs(root.DATEVALIDITE ?? textOf(xml, 'DateValidite'));
  if (code === null || issuedAt === null || validUntil === null) {
    throw new BulletinError('bulletin without massif number or dates');
  }

  const risk = attributesOf(xml, 'RISQUE') ?? {};
  let below = zoneLevel(risk.RISQUE1, risk.EVOLURISQUE1);
  const aboveLevel = zoneLevel(risk.RISQUE2, risk.EVOLURISQUE2);
  let split = aboveLevel === null ? null : whole(risk.ALTITUDE);
  let above = aboveLevel ?? below;
  if (aboveLevel !== null && split === null) {
    // Two levels without a readable altitude: the higher one for the whole
    // massif, never the lower one.
    below = Math.max(below ?? 0, aboveLevel);
    above = below;
    split = null;
  }
  const declaredMax = level(risk.RISQUEMAXI);
  const max =
    declaredMax ?? (below === null && above === null ? null : Math.max(below ?? 0, above ?? 0));

  const slope = attributesOf(xml, 'PENTE') ?? {};
  const aspects = ASPECTS.filter((aspect) => {
    // The bulletin writes SW / W / NW, older ones SO / O / NO.
    const french = aspect.replace('W', 'O');
    return slope[aspect] === 'true' || slope[french] === 'true';
  });

  // The first ENNEIGEMENT is the one of the day; the BSH block repeats past days.
  const snowStart = xml.search(/<ENNEIGEMENT[\s>]/);
  const snowEnd = snowStart < 0 ? -1 : xml.indexOf('</ENNEIGEMENT>', snowStart);
  const snowLevels = [];
  if (snowStart >= 0 && snowEnd > snowStart) {
    const block = xml.slice(snowStart, snowEnd);
    for (let at = block.indexOf('<NIVEAU'); at >= 0; at = block.indexOf('<NIVEAU', at + 1)) {
      const attributes = attributesOf(block, 'NIVEAU', at) ?? {};
      const altitude = whole(attributes.ALTI);
      if (altitude !== null) {
        snowLevels.push({ altitude, north: whole(attributes.N), south: whole(attributes.S) });
      }
    }
  }

  return {
    code,
    massif: root.MASSIF ?? null,
    issuedAt,
    validUntil,
    amended: root.AMENDEMENT === 'true',
    riskMax: max,
    riskTomorrow: level(risk.RISQUEMAXIJ2),
    riskBelow: below,
    riskAbove: above,
    splitAltitude: split,
    comment: risk.COMMENTAIRE?.trim() || null,
    aspects,
    summary: textOf(xml, 'RESUME'),
    snowLevels,
  };
}

/** Snow depth (cm) at an altitude of the bulletin's table, north and south; null if absent. */
export function snowAt(bulletin, altitude) {
  return bulletin.snowLevels.find((entry) => entry.altitude === altitude) ?? null;
}
