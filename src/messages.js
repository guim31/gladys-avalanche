// -----------------------------------------------------------------------------
// Texts the container produces, in the four languages of Gladys: danger
// levels, aspects, connection statuses. German says "du", Spanish "usted".
// -----------------------------------------------------------------------------

import { ASPECTS } from './bra.js';

// The European avalanche danger scale, as Météo-France names its levels.
export const LEVEL_NAMES = {
  en: { 1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Very high' },
  fr: { 1: 'Faible', 2: 'Limité', 3: 'Marqué', 4: 'Fort', 5: 'Très fort' },
  de: { 1: 'Gering', 2: 'Mäßig', 3: 'Erheblich', 4: 'Groß', 5: 'Sehr groß' },
  es: { 1: 'Débil', 2: 'Limitado', 3: 'Notable', 4: 'Fuerte', 5: 'Muy fuerte' },
};

export const ASPECT_NAMES = {
  en: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SW', W: 'W', NW: 'NW' },
  fr: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO' },
  de: { N: 'N', NE: 'NO', E: 'O', SE: 'SO', S: 'S', SW: 'SW', W: 'W', NW: 'NW' },
  es: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO' },
};

export const ASPECT_TEXT = {
  all: {
    en: 'All aspects',
    fr: 'Toutes orientations',
    de: 'Alle Expositionen',
    es: 'Todas las orientaciones',
  },
  none: {
    en: 'No aspect singled out',
    fr: 'Aucune orientation signalée',
    de: 'Keine Exposition genannt',
    es: 'Ninguna orientación señalada',
  },
};

// Connection statuses: setConnectionStatus receives the whole object (core 5.2+).
export const STATUS = {
  sourceDown: {
    en: 'The Météo-France bulletins cannot be read for now. Retrying every 30 minutes.',
    fr: 'Les bulletins de Météo-France sont illisibles pour le moment. Nouvel essai toutes les 30 minutes.',
    de: 'Die Lawinenberichte von Météo-France sind gerade nicht lesbar. Neuer Versuch alle 30 Minuten.',
    es: 'Los boletines de Météo-France no se pueden leer por ahora. Nuevo intento cada 30 minutos.',
  },
  keyRefused: {
    en: 'Météo-France refused the API key: check it in the configuration, or leave it empty to use the open archive.',
    fr: "Météo-France refuse la clé d'API : vérifiez-la dans la configuration, ou videz-la pour utiliser l'archive ouverte.",
    de: 'Météo-France lehnt den API-Schlüssel ab: Prüfe ihn in der Konfiguration oder leere ihn, um das offene Archiv zu nutzen.',
    es: 'Météo-France rechaza la clave de API: compruébela en la configuración o déjela vacía para usar el archivo abierto.',
  },
  initFailed: {
    en: 'The integration could not start. See its logs.',
    fr: "L'intégration n'a pas pu démarrer. Consultez ses journaux.",
    de: 'Die Integration konnte nicht starten. Sieh dir ihre Protokolle an.',
    es: 'La integración no pudo iniciarse. Consulte sus registros.',
  },
};

/** "N, NE, NW", "All aspects" or "No aspect singled out". */
export function aspectsText(aspects, language) {
  if (aspects.length === ASPECTS.length) {
    return ASPECT_TEXT.all[language];
  }
  if (aspects.length === 0) {
    return ASPECT_TEXT.none[language];
  }
  return aspects.map((aspect) => ASPECT_NAMES[language][aspect]).join(', ');
}

/** "4 · High": the danger level as the official pictograms show it, in text. */
export function levelText(level, language) {
  return `${level} · ${LEVEL_NAMES[language][level]}`;
}
