// -----------------------------------------------------------------------------
// The 35 massifs Météo-France publishes an avalanche bulletin (BERA) for.
//
// `code` is the massif number of the Météo-France metadata (GeoJSON
// "DONNEES_EXPERTISEES_Metadata_massifs" of the data.gouv dataset), also the
// `ID` attribute of every bulletin and the `id-massif` of the DPBRA API: it is
// the platform id of the devices, so it never changes. Andorra (71) is in the
// GeoJSON but Météo-France publishes no bulletin for it.
//
// `files` are the names the open archive gives the files of the massif, as
// found in the 2022-2026 directories ("Embrunnais" became "Embrunais" during
// the 2025-2026 season); they are compared once normalized (see `nameKey`).
// The bulletin's own `ID` is checked after download, so a renamed file can
// only be missed, never mixed up with another massif.
//
// `snowAltitude` is the highest altitude of the snow depth table of the
// massif's bulletins (1000/1500/2000 m in the Prealps, Corsica and the Basque
// Country, 1500/2000/2500 m elsewhere): the snow depth features read that one.
// -----------------------------------------------------------------------------

export const MOUNTAINS = {
  northern_alps: {
    en: 'Northern Alps',
    fr: 'Alpes du Nord',
    de: 'Nordalpen',
    es: 'Alpes del Norte',
  },
  southern_alps: { en: 'Southern Alps', fr: 'Alpes du Sud', de: 'Südalpen', es: 'Alpes del Sur' },
  pyrenees: { en: 'Pyrenees', fr: 'Pyrénées', de: 'Pyrenäen', es: 'Pirineos' },
  corsica: { en: 'Corsica', fr: 'Corse', de: 'Korsika', es: 'Córcega' },
};

const m = (code, name, mountain, snowAltitude, files = [name]) => ({
  code,
  name,
  mountain,
  snowAltitude,
  files,
});

export const MASSIFS = [
  m(1, 'Chablais', 'northern_alps', 2000),
  m(2, 'Aravis', 'northern_alps', 2000),
  m(3, 'Mont-Blanc', 'northern_alps', 2500),
  m(4, 'Bauges', 'northern_alps', 2000),
  m(5, 'Beaufortain', 'northern_alps', 2500),
  m(6, 'Haute-Tarentaise', 'northern_alps', 2500),
  m(7, 'Chartreuse', 'northern_alps', 2000),
  m(8, 'Belledonne', 'northern_alps', 2500),
  m(9, 'Maurienne', 'northern_alps', 2500),
  m(10, 'Vanoise', 'northern_alps', 2500),
  m(11, 'Haute-Maurienne', 'northern_alps', 2500),
  m(12, 'Grandes-Rousses', 'northern_alps', 2500),
  m(13, 'Thabor', 'southern_alps', 2500),
  m(14, 'Vercors', 'northern_alps', 2000),
  m(15, 'Oisans', 'northern_alps', 2500),
  m(16, 'Pelvoux', 'southern_alps', 2500),
  m(17, 'Queyras', 'southern_alps', 2500),
  m(18, 'Dévoluy', 'southern_alps', 2500, ['Devoluy']),
  m(19, 'Champsaur', 'southern_alps', 2500),
  m(20, 'Embrunais-Parpaillon', 'southern_alps', 2500, [
    'Embrunais Parpaillon',
    'Embrunnais Parpaillon',
  ]),
  m(21, 'Ubaye', 'southern_alps', 2500),
  m(22, 'Haut-Var Haut-Verdon', 'southern_alps', 2500),
  m(23, 'Mercantour', 'southern_alps', 2500),
  m(40, 'Cinto-Rotondo', 'corsica', 2000, ['Cinto Rotondo']),
  m(41, 'Renoso-Incudine', 'corsica', 2000, ['Renoso Incudine']),
  m(64, 'Pays Basque', 'pyrenees', 2000, ['Pays-Basque']),
  m(65, 'Aspe-Ossau', 'pyrenees', 2500, ['Aspe Ossau']),
  m(66, 'Haute-Bigorre', 'pyrenees', 2500),
  m(67, 'Aure-Louron', 'pyrenees', 2500, ['Aure Louron']),
  m(68, 'Luchonnais', 'pyrenees', 2500),
  m(69, 'Couserans', 'pyrenees', 2500),
  m(70, 'Haute-Ariège', 'pyrenees', 2500, ['Haute-Ariege']),
  m(72, 'Orlu Saint-Barthélemy', 'pyrenees', 2500, ['Orlu St-Barthelemy']),
  m(73, 'Capcir-Puymorens', 'pyrenees', 2500, ['Capcir Puymorens']),
  m(74, 'Cerdagne-Canigou', 'pyrenees', 2500, ['Cerdagne Canigou']),
];

const BY_CODE = new Map(MASSIFS.map((massif) => [massif.code, massif]));

/** The massif of a code (number or string), or null. */
export function massifOf(code) {
  return BY_CODE.get(Number(code)) ?? null;
}

/**
 * Comparison key of a massif file name: lower case, no accent, letters and
 * digits only. "Aspe Ossau" (XML) and "ASPE-OSSAU" (PDF) give "aspeossau".
 */
export function nameKey(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const BY_FILE = new Map(
  MASSIFS.flatMap((massif) => [massif.name, ...massif.files].map((n) => [nameKey(n), massif])),
);

/** The massif a file of the archive belongs to, from its name part; or null. */
export function massifOfFileName(name) {
  return BY_FILE.get(nameKey(name)) ?? null;
}
