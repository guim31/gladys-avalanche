// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `avalanche`.
//
// Without a massif chosen: one status line per followed massif (10 at most),
// its danger level as the official pictogram reads, in text ("4 · High"), and
// the trend for the next day; a heading when one reaches 3 or more.
//
// With a massif chosen: the danger and next-day tiles, the levels below and
// above the split altitude, the most exposed aspects, the snow depth and the
// validity; the forecaster's comment and a button to the PDF of the bulletin,
// each with a setting to hide it.
//
// Both end with the source and a reminder to read the whole bulletin. Budget:
// 2 tiles, 2 texts, 1 status, 1 button.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { codeOfExternalId } from './devices.js';
import { snowAt } from './bra.js';
import { massifOf } from './massifs.js';
import { LEVEL_NAMES, aspectsText, levelText } from './messages.js';
import { WIDGET_KEY } from './monitor.js';
import { formatDateTime } from './time.js';

export const MAX_STATUS_ITEMS = 10;
export const TTL_SECONDS = 900;
const MAX_STATUS_TEXT = 40;
const MAX_BODY = 300;

export const TEXT = {
  empty: {
    en: 'No massif yet: choose them in the configuration of the integration, then create the devices in the Discover tab.',
    fr: "Aucun massif pour l'instant : choisissez-les dans la configuration de l'intégration, puis créez les appareils dans l'onglet Découverte.",
    de: 'Noch kein Massiv: Wähle sie in der Konfiguration der Integration aus und lege dann die Geräte im Tab „Entdecken“ an.',
    es: 'Aún no hay macizos: elíjalos en la configuración de la integración y, después, cree los dispositivos en la pestaña Descubrir.',
  },
  gone: {
    en: 'This massif is no longer followed.',
    fr: "Ce massif n'est plus suivi.",
    de: 'Dieses Massiv wird nicht mehr verfolgt.',
    es: 'Este macizo ya no se sigue.',
  },
  offSeason: {
    en: 'No bulletin in force. Météo-France issues them from early November to early June.',
    fr: 'Aucun bulletin en vigueur. Météo-France les émet de début novembre à début juin.',
    de: 'Kein gültiger Bericht. Météo-France gibt sie von Anfang November bis Anfang Juni heraus.',
    es: 'Ningún boletín vigente. Météo-France los emite de principios de noviembre a principios de junio.',
  },
  alert: {
    en: 'Avalanche danger: ',
    fr: "Risque d'avalanche : ",
    de: 'Lawinengefahr: ',
    es: 'Riesgo de aludes: ',
  },
  noBulletin: {
    en: 'No bulletin in force',
    fr: 'Pas de bulletin en vigueur',
    de: 'Kein gültiger Bericht',
    es: 'Ningún boletín vigente',
  },
  nextDay: { en: 'next day', fr: 'lendemain', de: 'Folgetag', es: 'día siguiente' },
  danger: { en: 'Danger', fr: 'Risque', de: 'Gefahr', es: 'Riesgo' },
  dangerNextDay: { en: 'Next day', fr: 'Lendemain', de: 'Folgetag', es: 'Día siguiente' },
  below: {
    en: 'Below {altitude} m',
    fr: 'Sous {altitude} m',
    de: 'Unter {altitude} m',
    es: 'Bajo {altitude} m',
  },
  above: {
    en: 'Above {altitude} m',
    fr: 'Au-dessus de {altitude} m',
    de: 'Über {altitude} m',
    es: 'Sobre {altitude} m',
  },
  wholeMassif: {
    en: 'Whole massif',
    fr: 'Tout le massif',
    de: 'Ganzes Massiv',
    es: 'Todo el macizo',
  },
  aspects: {
    en: 'Most exposed aspects',
    fr: 'Pentes les plus exposées',
    de: 'Gefährlichste Expositionen',
    es: 'Orientaciones más expuestas',
  },
  snow: {
    en: 'Snow N / S at {altitude} m',
    fr: 'Neige N / S à {altitude} m',
    de: 'Schnee N / S auf {altitude} m',
    es: 'Nieve N / S a {altitude} m',
  },
  validUntil: { en: 'Valid until', fr: "Valable jusqu'au", de: 'Gültig bis', es: 'Válido hasta' },
  source: {
    en: 'Météo-France · read the full bulletin before going out',
    fr: 'Météo-France · lisez le bulletin complet avant de partir',
    de: 'Météo-France · lies vor der Tour den ganzen Bericht',
    es: 'Météo-France · lea el boletín completo antes de salir',
  },
  issued: {
    en: 'Météo-France, issued {date}',
    fr: 'Météo-France, émis le {date}',
    de: 'Météo-France, erstellt am {date}',
    es: 'Météo-France, emitido el {date}',
  },
  pdf: {
    en: 'Full bulletin',
    fr: 'Bulletin complet',
    de: 'Ganzer Bericht',
    es: 'Boletín completo',
  },
};

const t = (text, language) => text[language] ?? text.en;
const clip = (text, max = MAX_STATUS_TEXT) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** Widget colour of a danger level: green 1, yellow 2, red from 3 (closed palette). */
export function levelColor(level) {
  if (level === null || level === undefined) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (level <= 1) {
    return WIDGET_COLORS.SUCCESS;
  }
  return level === 2 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.DANGER;
}

const inForce = (bulletin, now) => Boolean(bulletin) && bulletin.validUntil > now;

/** "4 · High · next day 5" (40 characters at most). */
export function massifValue(bulletin, now, language) {
  if (!inForce(bulletin, now) || bulletin.riskMax === null) {
    return t(TEXT.noBulletin, language);
  }
  const today = levelText(bulletin.riskMax, language);
  return clip(
    bulletin.riskTomorrow === null
      ? today
      : `${today} · ${t(TEXT.nextDay, language)} ${bulletin.riskTomorrow}`,
  );
}

function overview(monitor, codes, language, now) {
  const rows = codes.slice(0, MAX_STATUS_ITEMS).map((code) => ({
    code,
    bulletin: inForce(monitor.bulletin(code), now) ? monitor.bulletin(code) : null,
  }));
  const components = [];
  const worst = Math.max(0, ...rows.map((row) => row.bulletin?.riskMax ?? 0));
  if (worst >= 3) {
    components.push({
      type: 'text',
      variant: 'heading',
      text: `${t(TEXT.alert, language)}${levelText(worst, language)}`,
    });
  }
  components.push({
    type: 'status',
    items: rows.map(({ code, bulletin }) => ({
      label: clip(monitor.deviceName(code)),
      value: massifValue(bulletin, now, language),
      color: levelColor(bulletin?.riskMax),
      icon: bulletin ? 'alert-triangle' : 'clock',
    })),
  });
  components.push({ type: 'text', variant: 'caption', text: t(TEXT.source, language) });
  return components;
}

const fill = (text, values) =>
  Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, value), text);

function detail(monitor, code, language, now, settings) {
  const bulletin = monitor.bulletin(code);
  if (!inForce(bulletin, now)) {
    return [{ type: 'text', variant: 'body', text: t(TEXT.offSeason, language) }];
  }
  const components = [];
  if (bulletin.riskMax !== null) {
    components.push({
      type: 'value',
      label: t(TEXT.danger, language),
      value: bulletin.riskMax,
      unit: '/5',
      icon: 'alert-triangle',
      color: levelColor(bulletin.riskMax),
    });
  }
  if (bulletin.riskTomorrow !== null) {
    components.push({
      type: 'value',
      label: t(TEXT.dangerNextDay, language),
      value: bulletin.riskTomorrow,
      unit: '/5',
      icon: 'trending-up',
      color: levelColor(bulletin.riskTomorrow),
    });
  }
  if (settings.show_comment !== false && bulletin.comment) {
    components.push({ type: 'text', variant: 'body', text: clip(bulletin.comment, MAX_BODY) });
  }

  const items = [];
  const zone = (label, level) => {
    if (level !== null) {
      items.push({
        label: clip(label),
        value: levelText(level, language),
        color: levelColor(level),
      });
    }
  };
  if (bulletin.splitAltitude === null) {
    zone(t(TEXT.wholeMassif, language), bulletin.riskBelow);
  } else {
    const altitude = String(bulletin.splitAltitude);
    zone(fill(t(TEXT.below, language), { altitude }), bulletin.riskBelow);
    zone(fill(t(TEXT.above, language), { altitude }), bulletin.riskAbove);
  }
  items.push({
    label: t(TEXT.aspects, language),
    value: clip(aspectsText(bulletin.aspects, language)),
    icon: 'compass',
    color: WIDGET_COLORS.NEUTRAL,
  });
  const massif = massifOf(code);
  const snow = snowAt(bulletin, massif.snowAltitude);
  if (snow && snow.north !== null && snow.south !== null) {
    items.push({
      label: fill(t(TEXT.snow, language), { altitude: String(massif.snowAltitude) }),
      value: `${snow.north} / ${snow.south} cm`,
      icon: 'cloud-snow',
      color: WIDGET_COLORS.NEUTRAL,
    });
  }
  items.push({
    label: t(TEXT.validUntil, language),
    value: formatDateTime(bulletin.validUntil, language),
    icon: 'clock',
    color: WIDGET_COLORS.NEUTRAL,
  });
  components.push({ type: 'status', items });
  components.push({
    type: 'text',
    variant: 'caption',
    text: fill(t(TEXT.issued, language), { date: formatDateTime(bulletin.issuedAt, language) }),
  });
  const pdfUrl = monitor.pdfUrl(code);
  if (settings.show_pdf !== false && pdfUrl) {
    components.push({
      type: 'button',
      label: t(TEXT.pdf, language),
      icon: 'file-text',
      style: 'secondary',
      link: { url: pdfUrl },
    });
  }
  return components;
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(monitor, { settings, language = 'en' } = {}) {
      const lang = LEVEL_NAMES[language] ? language : 'en';
      const now = monitor.now();
      const created = monitor.created();
      const chosen =
        typeof settings?.massif === 'string' && settings.massif ? settings.massif : null;
      if (chosen) {
        const code = codeOfExternalId(monitor.gladys, chosen);
        const components =
          code !== null && created.includes(code)
            ? detail(monitor, code, lang, now, settings ?? {})
            : [{ type: 'text', variant: 'body', text: t(TEXT.gone, lang) }];
        return { ttl_seconds: TTL_SECONDS, components };
      }
      if (created.length === 0) {
        return {
          ttl_seconds: TTL_SECONDS,
          components: [{ type: 'text', variant: 'body', text: t(TEXT.empty, lang) }],
        };
      }
      return { ttl_seconds: TTL_SECONDS, components: overview(monitor, created, lang, now) };
    },
  },
};
