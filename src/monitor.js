// -----------------------------------------------------------------------------
// The heart of the integration: reads the bulletins of the followed massifs
// every 30 minutes, publishes the states of the created devices, fires the
// scene triggers and keeps the connection status.
//
// Cycle: the archive index of today (then of the days before) gives the newest
// file of each massif; a file already read is not downloaded again. With an
// API key, the DPBRA API is asked for each massif instead.
//
// States: `publishChangedStates` sends only what changed, plus a heartbeat
// every 12 hours (Gladys shows "no recent value" after 48 hours). Everything
// is published again in onDeviceCreated, and on a reconnection.
//
// Triggers, on a bulletin newer than the last one read (never on the very
// first one, which only sets the reference):
//   - bulletin_issued: every new bulletin;
//   - risk_reached: one event per threshold (2 to 5) the danger level crosses
//     upwards, so "reaches or exceeds 3" fires once when it goes 2 → 4.
// The reference survives restarts (src/store.js).
//
// The refresh runs on the container's own timer: devices are published with
// should_poll: false; onPoll, if a Gladys polls anyway, reads again only when
// the last cycle is older than half a period.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { BulletinError, parseBulletin } from './bra.js';
import { REFRESH_MINUTES } from './config.js';
import { buildDevice, codeOfExternalId, deviceStates, massifIds } from './devices.js';
import { massifOf } from './massifs.js';
import { LEVEL_NAMES, STATUS } from './messages.js';
import { fetchFromApi, findArchiveFiles, findArchivePdfs, getText, SourceError } from './source.js';
import { formatDateTime } from './time.js';

const logger = createLogger({ name: 'avalanche-monitor' });

export const WIDGET_KEY = 'avalanche';
export const TRIGGERS = { RISK_REACHED: 'risk_reached', BULLETIN_ISSUED: 'bulletin_issued' };
export const SCENE_TRIGGER_KEYS = Object.values(TRIGGERS);
export const THRESHOLDS = [2, 3, 4, 5];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const HEARTBEAT_MS = 12 * HOUR;
// requestWidgetRefresh is rate-limited to one call every 10 s by the core.
const WIDGET_REFRESH_GAP_MS = 10 * 1000;
const MAX_EVENT_TEXT = 1000;

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {object} options.store see store.js
   * @param {Function} [options.fetch]
   * @param {boolean} [options.timers] false in tests: no interval, no delayed refresh
   * @param {Function} [options.now] clock (ms)
   */
  constructor({ gladys, store, fetch, timers = true, now }) {
    this.gladys = gladys;
    this.store = store;
    this.fetch = fetch ?? globalThis.fetch;
    this.timers = timers;
    this.now = now ?? (() => Date.now());
    this.config = { codes: [], apiKey: '', language: 'fr' };
    // code → { bulletin, url, pdfUrl }
    this.entries = {};
    this.lastCycleAt = null;
    this.running = null;
    this.failing = null; // null, 'source' or 'key'
    this.statusPublished = false;
    this.cycleTimer = null;
    this.refreshTimer = null;
    this.lastWidgetRefresh = 0;
  }

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    for (const [code, entry] of Object.entries(saved.massifs ?? {})) {
      if (massifOf(code) && entry?.bulletin) {
        this.entries[code] = entry;
      }
    }
    await this.publishDiscovered();
    await this.publishStates(this.created());
    await this.runCycle();
    if (this.timers) {
      this.cycleTimer = setInterval(() => this.runCycle(), REFRESH_MINUTES * MINUTE);
      this.cycleTimer.unref?.();
    }
  }

  /** Gladys restarted: publish the devices and every state again. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates();
    this.statusPublished = false;
    await this.publishDiscovered();
    await this.publishStates(this.created());
    await this.publishStatus();
  }

  async reconfigure(config) {
    const sourceChanged = config.apiKey !== this.config.apiKey;
    const languageChanged = config.language !== this.config.language;
    this.config = config;
    if (sourceChanged) {
      // Another source: read every massif again, and its status starts afresh.
      for (const entry of Object.values(this.entries)) {
        entry.url = null;
      }
      this.failing = null;
      this.statusPublished = false;
    }
    if (languageChanged) {
      this.gladys.forgetPublishedStates();
    }
    await this.publishDiscovered();
    await this.runCycle();
    this.refreshWidget();
  }

  async publishDiscovered() {
    const devices = this.config.codes.map((code) =>
      buildDevice(this.gladys, code, this.config.language),
    );
    await this.gladys.publishDiscoveredDevices(devices);
  }

  /** Codes of the massifs whose device the user created, in configuration order first. */
  created() {
    const codes = [];
    for (const device of this.gladys.devices ?? []) {
      const code = codeOfExternalId(this.gladys, device.external_id);
      if (code !== null && !codes.includes(code)) {
        codes.push(code);
      }
    }
    const rank = (code) => {
      const index = this.config.codes.indexOf(code);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return codes.sort((a, b) => rank(a) - rank(b));
  }

  /** The name the user gave the device in Gladys, else the massif's. */
  deviceName(code) {
    const { device } = massifIds(this.gladys, code);
    const found = (this.gladys.devices ?? []).find((d) => d.external_id === device);
    return found?.name || massifOf(code).name;
  }

  bulletin(code) {
    return this.entries[code]?.bulletin ?? null;
  }

  pdfUrl(code) {
    return this.entries[code]?.pdfUrl ?? null;
  }

  /** One cycle at a time: a call during a cycle waits for it. */
  runCycle() {
    if (!this.running) {
      this.running = this.cycle()
        .catch((err) => logger.error('Refresh failed', err))
        .finally(() => {
          this.running = null;
        });
    }
    return this.running;
  }

  async cycle() {
    const now = this.now();
    this.lastCycleAt = now;
    const codes = this.config.codes;
    let failure = null;
    const changed = [];
    if (codes.length > 0) {
      failure = this.config.apiKey
        ? await this.readFromApi(codes, changed)
        : await this.readFromArchive(codes, now, changed);
    }
    await this.setFailure(failure);
    if (changed.length > 0) {
      await this.save();
    }
    // Every created device: the in_force flag also moves with the clock.
    await this.publishStates(this.created());
    if (changed.length > 0) {
      this.refreshWidget();
    }
  }

  async readFromArchive(codes, now, changed) {
    let files;
    try {
      files = await findArchiveFiles(this.fetch, codes, now);
    } catch (err) {
      return err;
    }
    let failure = null;
    const pdfsByDay = new Map();
    const pdfsOf = async (day) => {
      if (!pdfsByDay.has(day)) {
        // A missing PDF only hides the widget's button: never a failure.
        pdfsByDay.set(day, await findArchivePdfs(this.fetch, day).catch(() => new Map()));
      }
      return pdfsByDay.get(day);
    };
    for (const [code, file] of files) {
      const entry = this.entries[code];
      try {
        if (entry?.url === file.url) {
          if (!entry.pdfUrl) {
            // The PDF can be uploaded after the XML.
            const pdfUrl = (await pdfsOf(file.day)).get(code) ?? null;
            if (pdfUrl) {
              entry.pdfUrl = pdfUrl;
              changed.push(code);
            }
          }
          continue;
        }
        const xml = await getText(this.fetch, file.url);
        if (xml === null) {
          continue;
        }
        const bulletin = parseBulletin(xml);
        if (bulletin.code !== code) {
          logger.debug(`${file.url} holds massif ${bulletin.code}, not ${code}: skipped`);
          continue;
        }
        const pdfUrl = (await pdfsOf(file.day)).get(code) ?? null;
        await this.accept(code, bulletin, { url: file.url, pdfUrl }, changed);
      } catch (err) {
        failure ??= err;
      }
    }
    return failure;
  }

  async readFromApi(codes, changed) {
    let failure = null;
    for (const code of codes) {
      try {
        const xml = await fetchFromApi(this.fetch, code, this.config.apiKey);
        if (xml === null) {
          continue;
        }
        const bulletin = parseBulletin(xml);
        if (bulletin.code !== code) {
          throw new BulletinError(`the API answered massif ${bulletin.code} for ${code}`);
        }
        await this.accept(code, bulletin, { url: null, pdfUrl: null }, changed);
      } catch (err) {
        failure ??= err;
        if (err instanceof SourceError && err.keyRefused) {
          break; // the same answer for every massif
        }
      }
    }
    return failure;
  }

  /** Records a bulletin read for a massif, and fires the triggers of a new one. */
  async accept(code, bulletin, { url, pdfUrl }, changed) {
    const previous = this.entries[code]?.bulletin ?? null;
    if (previous && bulletin.issuedAt < previous.issuedAt) {
      return; // an older issue (the API can lag behind the archive): kept the newest
    }
    const isNew = !previous || bulletin.issuedAt > previous.issuedAt;
    this.entries[code] = { bulletin, url, pdfUrl };
    changed.push(code);
    if (!isNew) {
      return;
    }
    logger.debug(`New bulletin for ${massifOf(code).name}: danger ${bulletin.riskMax}`);
    if (previous && this.created().includes(code)) {
      await this.fireTriggers(code, previous, bulletin, pdfUrl);
    }
  }

  async fireTriggers(code, previous, bulletin, pdfUrl) {
    const language = this.config.language;
    const { device } = massifIds(this.gladys, code);
    const level = bulletin.riskMax;
    const common = {
      massif: device,
      massif_name: this.deviceName(code),
      level,
      level_name: level === null ? null : LEVEL_NAMES[language][level],
      valid_until: formatDateTime(bulletin.validUntil, language),
    };
    const events = [];
    if (level !== null && previous.riskMax !== null) {
      for (const threshold of THRESHOLDS) {
        if (previous.riskMax < threshold && level >= threshold) {
          events.push([TRIGGERS.RISK_REACHED, { ...common, threshold: String(threshold) }]);
        }
      }
    }
    events.push([
      TRIGGERS.BULLETIN_ISSUED,
      {
        ...common,
        level_tomorrow: bulletin.riskTomorrow,
        summary: (bulletin.summary ?? bulletin.comment ?? '').slice(0, MAX_EVENT_TEXT) || null,
        pdf_url: pdfUrl,
      },
    ]);
    for (const [key, data] of events) {
      try {
        await this.gladys.publishSceneEvent(key, data);
      } catch (err) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
    }
  }

  async setFailure(err) {
    const kind = err ? (err.keyRefused ? 'key' : 'source') : null;
    if (kind !== this.failing) {
      if (kind) {
        // One line at the first failure, one at the recovery.
        logger.warn(`Cannot read the bulletins: ${err.message}`);
      } else if (this.failing) {
        logger.info('The bulletins are readable again');
      }
      this.failing = kind;
      this.statusPublished = false;
    } else if (err) {
      logger.debug(`Still cannot read the bulletins: ${err.message}`);
    }
    await this.publishStatus();
  }

  async publishStatus() {
    if (this.statusPublished) {
      return;
    }
    const message =
      this.failing === 'key' ? STATUS.keyRefused : this.failing ? STATUS.sourceDown : undefined;
    try {
      await this.gladys.setConnectionStatus(!this.failing, message);
      this.statusPublished = true;
    } catch (err) {
      logger.debug(`Cannot publish the connection status: ${err.message}`);
    }
  }

  async publishStates(codes, { force = false } = {}) {
    const now = this.now();
    const states = codes.flatMap((code) =>
      deviceStates(this.gladys, code, this.bulletin(code), now, this.config.language),
    );
    if (states.length === 0) {
      return;
    }
    if (force) {
      for (const code of codes) {
        this.gladys.forgetPublishedStates(massifIds(this.gladys, code).device);
      }
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
    } catch (err) {
      // Sent again by the next cycle: publishChangedStates only remembers accepted values.
      logger.warn(`Cannot publish the states: ${err.message}`);
    }
  }

  /** Gladys polls a device (only if it was created with a poll frequency). */
  async poll(device) {
    const code = codeOfExternalId(this.gladys, device?.external_id);
    if (code === null) {
      return;
    }
    if (
      this.lastCycleAt === null ||
      this.now() - this.lastCycleAt >= (REFRESH_MINUTES * MINUTE) / 2
    ) {
      await this.runCycle();
    } else {
      await this.publishStates([code]);
    }
  }

  async onDeviceCreated(device) {
    const code = codeOfExternalId(this.gladys, device?.external_id);
    if (code !== null) {
      await this.publishStates([code], { force: true });
    }
    this.refreshWidget();
  }

  /** A device renamed or deleted: the widget shows Gladys' names and devices. */
  onDeviceChanged() {
    this.refreshWidget();
  }

  refreshWidget() {
    const elapsed = this.now() - this.lastWidgetRefresh;
    if (elapsed >= WIDGET_REFRESH_GAP_MS || !this.timers) {
      this.lastWidgetRefresh = this.now();
      Promise.resolve(this.gladys.requestWidgetRefresh(WIDGET_KEY)).catch((err) =>
        logger.debug(`Widget refresh refused: ${err.message}`),
      );
      return;
    }
    if (!this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.refreshWidget();
      }, WIDGET_REFRESH_GAP_MS - elapsed);
      this.refreshTimer.unref?.();
    }
  }

  save() {
    return this.store.save({ massifs: this.entries });
  }

  async stop() {
    clearInterval(this.cycleTimer);
    clearTimeout(this.refreshTimer);
    this.cycleTimer = null;
    this.refreshTimer = null;
    await this.running;
    await this.store.flush();
  }
}
