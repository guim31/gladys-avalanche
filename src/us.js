// -----------------------------------------------------------------------------
// Reads the forecast of a US avalanche center from the public API of
// avalanche.org (no key), one request per zone:
//   https://api.avalanche.org/v2/public/product?type=forecast&center_id=UAC&zone_id=1738
//
// The answer is the zone's current product. Only a `forecast` with at least
// one rating for the day becomes a bulletin; a `summary` (early or late in the
// season), an off-season product or a "no rating" day gives null: nothing is
// invented, the device then only says "not in force".
//
// The North American danger scale has the same five levels as the European
// one. A center rates three elevation bands (below, near and above treeline)
// for the day (`current`) and often for the next one (`tomorrow`); the
// bulletin's level is the highest band. -1 and 0 mean "no rating".
//
// The result has the shape of a Météo-France bulletin (see bra.js
// parseBulletin) so that devices, widget and triggers read both alike; what
// avalanche.org does not give (split altitude, snow depths) is null or empty.
// -----------------------------------------------------------------------------

import { ASPECTS } from './bra.js';
import { getText, SourceError } from './source.js';

export const US_PRODUCT_URL = 'https://api.avalanche.org/v2/public/product';

const DIRECTIONS = {
  north: 'N',
  northeast: 'NE',
  east: 'E',
  southeast: 'SE',
  south: 'S',
  southwest: 'SW',
  west: 'W',
  northwest: 'NW',
};

/** URL of the product of a zone (see us-zones.js). */
export function usProductUrl(zone) {
  const query = new URLSearchParams({
    type: 'forecast',
    center_id: zone.center,
    zone_id: String(zone.id),
  });
  return `${US_PRODUCT_URL}?${query}`;
}

const level = (value) => (Number.isInteger(value) && value >= 1 && value <= 5 ? value : null);

const time = (text) => {
  const ms = typeof text === 'string' ? Date.parse(text) : NaN;
  return Number.isFinite(ms) ? ms : null;
};

/** The three bands of a day ('current' or 'tomorrow'), each 1-5 or null. */
function bandsOf(danger, day) {
  const entry = (Array.isArray(danger) ? danger : []).find((d) => d?.valid_day === day);
  return {
    lower: level(entry?.lower),
    middle: level(entry?.middle),
    upper: level(entry?.upper),
  };
}

const highest = (bands) => {
  const levels = Object.values(bands).filter((value) => value !== null);
  return levels.length > 0 ? Math.max(...levels) : null;
};

// An out-of-range entity ("&#99999999;") is dropped rather than thrown.
const codePoint = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');

/** Plain text of the HTML the centers write ("<p>The most dangerous…</p>"). */
export function plainText(html) {
  if (typeof html !== 'string') {
    return null;
  }
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;|&#39;|&apos;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

/** Aspects of the avalanche problems ("north upper", "west middle"…), in compass order. */
function aspectsOf(problems) {
  const found = new Set();
  for (const problem of Array.isArray(problems) ? problems : []) {
    for (const location of Array.isArray(problem?.location) ? problem.location : []) {
      const aspect = DIRECTIONS[String(location).trim().split(/\s+/)[0]?.toLowerCase()];
      if (aspect) {
        found.add(aspect);
      }
    }
  }
  return ASPECTS.filter((aspect) => found.has(aspect));
}

/**
 * The bulletin of a US zone, or null without a rated forecast.
 * @param {object} product JSON answer of the product API
 * @param {object} zone see us-zones.js
 */
export function parseUsForecast(product, zone) {
  if (!product || product.product_type !== 'forecast') {
    return null;
  }
  const issuedAt = time(product.published_time);
  const validUntil = time(product.expires_time);
  const bands = bandsOf(product.danger, 'current');
  const riskMax = highest(bands);
  if (issuedAt === null || validUntil === null || riskMax === null) {
    return null;
  }
  const bottomLine = plainText(product.bottom_line);
  return {
    code: zone.code,
    massif: zone.name,
    issuedAt,
    validUntil,
    amended: false,
    riskMax,
    riskTomorrow: highest(bandsOf(product.danger, 'tomorrow')),
    riskBelow: null,
    riskAbove: null,
    splitAltitude: null,
    bands,
    comment: bottomLine,
    aspects: aspectsOf(product.forecast_avalanche_problems),
    summary: bottomLine,
    snowLevels: [],
  };
}

/**
 * The bulletin of a US zone (null without a rated forecast). Network and HTTP
 * errors are SourceErrors marked `us`, for the connection status.
 */
export async function fetchUsForecast(fetchImpl, zone) {
  let product;
  try {
    const text = await getText(fetchImpl, usProductUrl(zone), {
      headers: { Accept: 'application/json' },
    });
    product = text === null ? null : JSON.parse(text);
  } catch (err) {
    const error =
      err instanceof SourceError ? err : new SourceError(`avalanche.org: ${err.message}`);
    error.us = true;
    throw error;
  }
  return parseUsForecast(product, zone);
}
