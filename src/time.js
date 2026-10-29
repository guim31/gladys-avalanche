// -----------------------------------------------------------------------------
// Dates of the bulletins. Météo-France writes them in French local time
// without an offset ("2026-02-10T16:00:00"), and files them in a directory
// named after the French date of issue: both are read in Europe/Paris,
// whatever the time zone of Gladys (TZ, used only to display them).
// -----------------------------------------------------------------------------

export const BULLETIN_TIME_ZONE = 'Europe/Paris';

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: BULLETIN_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Calendar fields of an instant in Paris. */
export function parisParts(ms) {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

const offsetAt = (ms) => {
  const p = parisParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (ms - (ms % 1000));
};

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * The instant (ms) of a Paris local date-time "YYYY-MM-DDTHH:mm[:ss]"; null if
 * the text is not one.
 */
export function parisLocalToMs(text) {
  const match = LOCAL.exec(String(text ?? '').trim());
  if (!match) {
    return null;
  }
  const [year, month, day, hour, minute, second = '0'] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, Number(second));
  let ms = asUtc - offsetAt(asUtc);
  // Second pass: the offset of the result, not of the guess (DST changes).
  ms = asUtc - offsetAt(ms);
  return ms;
}

/** "YYYY/MM/DD" of the Paris date `daysBack` days before the instant `ms`. */
export function parisDayPath(ms, daysBack = 0) {
  const today = parisParts(ms);
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day - daysBack));
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`;
}

const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** A short date and time, e.g. "11/02/2026 18:00", in the time zone of Gladys. */
export function formatDateTime(ms, language, timeZone = process.env.TZ || BULLETIN_TIME_ZONE) {
  const options = { dateStyle: 'short', timeStyle: 'short' };
  try {
    return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
      ...options,
      timeZone,
    }).format(new Date(ms));
  } catch {
    // An unknown TZ: the time zone of the bulletins.
    return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
      ...options,
      timeZone: BULLETIN_TIME_ZONE,
    }).format(new Date(ms));
  }
}
