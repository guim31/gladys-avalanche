// -----------------------------------------------------------------------------
// Where the bulletins come from.
//
// 1. Default, keyless: the open archive Météo-France publishes on data.gouv.fr
//    ("Archive des bulletins avalanches", Licence Ouverte 2.0):
//      https://files.data.gouv.fr/meteofrance/data/BULLETIN/BRA/YYYY/MM/DD/xml/
//    one directory per French date of issue, one file per massif and per
//    issue ("Belledonne_20260210162000.xml"; a massif can have two the same
//    day when the forecaster re-issues it), and the PDFs next to it in pdf/
//    ("BELLEDONNE_20260210152142.pdf"). The directory index is an HTML page;
//    the files redirect to an object storage.
//    The bulletin is issued around 16:00 for the next day: the one in force is
//    in today's or yesterday's directory. Two days back are also read, so a
//    late upload still shows (as "not in force" once expired).
//
// 2. Optional: the DPBRA API of the Météo-France portal
//    (https://portail-api.meteofrance.fr), with the user's free API key, one
//    request per massif: same XML document. Developed from its documentation,
//    without a key: feedback welcome.
// -----------------------------------------------------------------------------

import { massifOf, massifOfFileName } from './massifs.js';
import { parisDayPath } from './time.js';

export const ARCHIVE_ORIGIN = 'https://files.data.gouv.fr';
export const ARCHIVE_BASE = `${ARCHIVE_ORIGIN}/meteofrance/data/BULLETIN/BRA`;
export const DPBRA_URL = 'https://public-api.meteofrance.fr/public/DPBRA/v1/massif/BRA';
export const DAYS_BACK = 2;

export const USER_AGENT =
  'gladys-avalanche (Gladys Assistant integration; +https://github.com/guim31/gladys-avalanche)';

export class SourceError extends Error {
  /**
   * @param {string} message never holds the API key
   * @param {object} [details]
   * @param {number|null} [details.status] HTTP status, null for a network error
   * @param {boolean} [details.keyRefused] the DPBRA API refused the key
   */
  constructor(message, { status = null, keyRefused = false } = {}) {
    super(message);
    this.name = 'SourceError';
    this.status = status;
    this.keyRefused = keyRefused;
  }
}

/**
 * GET a text document. Resolves null on 404 (a directory that does not exist
 * yet: off season, or before the first issue of the day).
 */
export async function getText(fetchImpl, url, { headers = {}, timeoutMs = 30000 } = {}) {
  const host = new URL(url).host;
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, ...headers },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err?.name === 'TimeoutError' ? `no answer in ${timeoutMs / 1000} s` : String(err?.message);
    throw new SourceError(`${host}: ${reason}`);
  }
  if (response.status === 404) {
    return null;
  }
  if (response.status !== 200) {
    throw new SourceError(`${host}: HTTP ${response.status}`, {
      status: response.status,
      keyRefused: Boolean(headers.apikey) && (response.status === 401 || response.status === 403),
    });
  }
  return response.text();
}

const FILE_LINK = /href="([^"]*\/([^"/]+)_(\d{14})\.(xml|pdf))"/gi;

/**
 * The files of an archive directory index, newest issue last.
 * @returns {Array<{massif: object, stamp: string, url: string}>}
 */
export function parseIndex(html) {
  const files = [];
  for (const [, href, rawName, stamp] of String(html ?? '').matchAll(FILE_LINK)) {
    let name;
    try {
      name = decodeURIComponent(rawName);
    } catch {
      continue;
    }
    const massif = massifOfFileName(name);
    if (!massif) {
      continue;
    }
    const url = href.startsWith('http') ? href : `${ARCHIVE_ORIGIN}${href}`;
    files.push({ massif, stamp, url });
  }
  return files.sort((a, b) => a.stamp.localeCompare(b.stamp));
}

/** The newest file of each massif in an index: Map code → file. */
function latestByMassif(files) {
  const latest = new Map();
  for (const file of files) {
    latest.set(file.massif.code, file); // sorted: the last one wins
  }
  return latest;
}

/**
 * Finds, in the archive, the newest bulletin file of each massif, looking at
 * today's directory then up to DAYS_BACK days before.
 * @param {Function} fetchImpl
 * @param {number[]} codes massif codes
 * @param {number} now ms
 * @returns {Promise<Map<number, {url: string, stamp: string, day: string}>>}
 */
export async function findArchiveFiles(fetchImpl, codes, now) {
  const found = new Map();
  for (let back = 0; back <= DAYS_BACK && found.size < codes.length; back += 1) {
    const day = parisDayPath(now, back);
    const html = await getText(fetchImpl, `${ARCHIVE_BASE}/${day}/xml/`);
    const latest = latestByMassif(parseIndex(html));
    for (const code of codes) {
      if (!found.has(code) && latest.has(code)) {
        const file = latest.get(code);
        found.set(code, { url: file.url, stamp: file.stamp, day });
      }
    }
  }
  return found;
}

/**
 * The PDF of the bulletins of a day directory: Map code → url of the newest.
 * A missing PDF directory is an empty map.
 */
export async function findArchivePdfs(fetchImpl, day) {
  const html = await getText(fetchImpl, `${ARCHIVE_BASE}/${day}/pdf/`);
  const pdfs = new Map();
  for (const [code, file] of latestByMassif(parseIndex(html))) {
    pdfs.set(code, file.url);
  }
  return pdfs;
}

/** The bulletin of a massif from the DPBRA API (XML), or null if none is published. */
export async function fetchFromApi(fetchImpl, code, apiKey) {
  if (!massifOf(code)) {
    return null;
  }
  return getText(fetchImpl, `${DPBRA_URL}?id-massif=${code}&format=xml`, {
    headers: { apikey: apiKey, Accept: 'application/xml' },
  });
}
