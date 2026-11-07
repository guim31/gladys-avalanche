// -----------------------------------------------------------------------------
// The forecast zones of the US avalanche centers, as avalanche.org lists them
// (https://api.avalanche.org/v2/public/products/map-layer, 7 November 2026),
// sorted by state, then center, then name.
//
// `id` is the avalanche.org zone id: the platform id of the device, so it
// never changes; the configuration and the code call the zone `us-<id>`, which
// can never be confused with a Météo-France massif number.
//
// Left out: the Colorado Avalanche Information Center (CAIC). Its map-layer
// zones are drawn again by the forecasters as the season goes, all named "CAIC
// zone": no stable, readable choice to offer.
//
// `link` is the forecast page of the zone on the center's site. Three names are
// shortened for the configuration list (60 characters): "North (Castner-
// Canwell) Eastern Alaska Range", "South (Summit) Eastern Alaska Range" and
// "San Francisco Peaks / Kachina Peaks Wilderness".
// -----------------------------------------------------------------------------

export const US_PREFIX = 'us-';

// State names, in the four languages of Gladys.
export const STATES = {
  AK: { en: 'Alaska', fr: 'Alaska', de: 'Alaska', es: 'Alaska' },
  AZ: { en: 'Arizona', fr: 'Arizona', de: 'Arizona', es: 'Arizona' },
  CA: { en: 'California', fr: 'Californie', de: 'Kalifornien', es: 'California' },
  ID: { en: 'Idaho', fr: 'Idaho', de: 'Idaho', es: 'Idaho' },
  MT: { en: 'Montana', fr: 'Montana', de: 'Montana', es: 'Montana' },
  NH: { en: 'New Hampshire', fr: 'New Hampshire', de: 'New Hampshire', es: 'New Hampshire' },
  NM: { en: 'New Mexico', fr: 'Nouveau-Mexique', de: 'New Mexico', es: 'Nuevo México' },
  NY: { en: 'New York', fr: 'New York', de: 'New York', es: 'New York' },
  OR: { en: 'Oregon', fr: 'Oregon', de: 'Oregon', es: 'Oregon' },
  UT: { en: 'Utah', fr: 'Utah', de: 'Utah', es: 'Utah' },
  WA: { en: 'Washington', fr: 'Washington', de: 'Washington', es: 'Washington' },
  WY: { en: 'Wyoming', fr: 'Wyoming', de: 'Wyoming', es: 'Wyoming' },
};

export const CENTERS = {
  BAC: 'Bridgeport Avalanche Center',
  BTAC: 'Bridger-Teton Avalanche Center',
  CAAC: 'Coastal Alaska Avalanche Center',
  CAC: 'Cordova Avalanche Center',
  CNFAIC: 'Chugach National Forest Avalanche Center',
  COAA: 'Central Oregon Avalanche Center',
  EARAC: 'Eastern Alaska Range Avalanche Center',
  ESAC: 'Eastern Sierra Avalanche Center',
  EWYAIX: 'Eastern Wyoming Avalanche Information Center',
  FAC: 'Flathead Avalanche Center',
  GNFAC: 'Gallatin NF Avalanche Center',
  HAC: 'Haines Avalanche Center',
  HPAC: 'Hatcher Pass Avalanche Center',
  IPAC: 'Idaho Panhandle Avalanche Center',
  KPAC: 'Kachina Peaks Avalanche Center',
  MSAC: 'Mount Shasta Avalanche Center',
  MWAC: 'Mount Washington Avalanche Center',
  NWAC: 'Northwest Avalanche Center',
  NYSAC: 'Department of Environmental Conservation Avalanche Forecast',
  PAC: 'Payette Avalanche Center',
  SAC: 'Sierra Avalanche Center',
  SNFAC: 'Sawtooth Avalanche Center',
  SOAIX: 'Southern Oregon Avalanche Info Exchange',
  TAC: 'Taos Avalanche Center',
  UAC: 'Utah Avalanche Center',
  VAC: 'Valdez Avalanche Center',
  WAC: 'Wallowa Avalanche Center',
  WCMAC: 'West Central Montana Avalanche Center',
};

const z = (id, name, center, state, link) => ({
  code: `${US_PREFIX}${id}`,
  id,
  name,
  center,
  state,
  link,
});

export const US_ZONES = [
  z(
    2165,
    'Douglas Island',
    'CAAC',
    'AK',
    'https://www.coastalakavalanche.org/forecast/#/douglas-island/',
  ),
  z(2164, 'Juneau', 'CAAC', 'AK', 'https://www.coastalakavalanche.org/forecast/#/juneau-mainland/'),
  z(1421, 'Cordova', 'CAC', 'AK', 'https://alaskasnow.org/cordova/'),
  z(
    2818,
    'Chugach State Park',
    'CNFAIC',
    'AK',
    'https://www.cnfaic.org/forecast/#/chugach-state-park/',
  ),
  z(
    2817,
    'Seward and Lost Lake',
    'CNFAIC',
    'AK',
    'https://www.cnfaic.org/forecast/#/seward-and-lost-lake/',
  ),
  z(2816, 'Summit Lake', 'CNFAIC', 'AK', 'https://www.cnfaic.org/forecast/#/summit-lake/'),
  z(
    2815,
    'Turnagain Pass and Girdwood',
    'CNFAIC',
    'AK',
    'https://www.cnfaic.org/forecast/#/turnagain-pass-and-girdwood/',
  ),
  z(
    3002,
    'Eastern Alaska Range North',
    'EARAC',
    'AK',
    'https://alaskasnow.org/eastern-ak-range/#/view/observations',
  ),
  z(
    3003,
    'Eastern Alaska Range South',
    'EARAC',
    'AK',
    'https://alaskasnow.org/eastern-ak-range/#/view/observations',
  ),
  z(3007, 'Chilkat Pass', 'HAC', 'AK', 'https://avalanche.ca/map?lat=59.558223&lng=-136.395711'),
  z(3005, 'Lutak', 'HAC', 'AK', 'https://alaskasnow.org/haines-forecast/#/lutak'),
  z(3006, 'Transitional', 'HAC', 'AK', 'https://alaskasnow.org/haines-forecast/#/transitional'),
  z(2152, 'Hatcher Pass', 'HPAC', 'AK', 'https://hpavalanche.org/forecast/#/hatcher-pass/'),
  z(1611, 'Continental', 'VAC', 'AK', 'https://alaskasnow.org/valdez-forecast/#/continental/'),
  z(1610, 'Intermountain', 'VAC', 'AK', 'https://alaskasnow.org/valdez-forecast/#/intermountain/'),
  z(1609, 'Maritime', 'VAC', 'AK', 'https://alaskasnow.org/valdez-forecast/#/maritime/'),
  z(
    2990,
    'San Francisco Peaks',
    'KPAC',
    'AZ',
    'https://kachinapeaks.org/Forecast/#/san-francisco-peaks-%2F-kachina-peaks-wilderness',
  ),
  z(
    3004,
    'Bridgeport Avalanche Center',
    'BAC',
    'CA',
    'https://bridgeportavalanchecenter.org/avalanche-forecast/',
  ),
  z(128, 'Eastside Region', 'ESAC', 'CA', 'https://www.esavalanche.org/forecasts#/eastside-region'),
  z(
    1833,
    'Mount Shasta',
    'MSAC',
    'CA',
    'https://www.shastaavalanche.org/advisories/avalanche-advisory/#/mount-shasta',
  ),
  z(
    2458,
    'Central Sierra Nevada',
    'SAC',
    'CA',
    'https://www.sierraavalanchecenter.org/forecasts/avalanche/central-sierra-nevada#/central-sierra-nevada/',
  ),
  z(
    3018,
    'Selkirk Mountains',
    'IPAC',
    'ID',
    'https://www.idahopanhandleavalanche.org/forecasts/#/selkirk-mountains/',
  ),
  z(
    1902,
    'Silver Valley & Bitterroot Mountains',
    'IPAC',
    'ID',
    'https://www.idahopanhandleavalanche.org/forecasts/#/silver-valley-&-bitterroot-mountains/',
  ),
  z(
    1900,
    'West Cabinet Mountains',
    'IPAC',
    'ID',
    'https://www.idahopanhandleavalanche.org/forecasts/#/west-cabinet-mountains/',
  ),
  z(
    3014,
    'Salmon River Mountains',
    'PAC',
    'ID',
    'https://payetteavalanche.org/forecasts/avalanche/salmon-river-mountains',
  ),
  z(
    3015,
    'West Mountains',
    'PAC',
    'ID',
    'https://payetteavalanche.org/forecasts/avalanche/west-mountains',
  ),
  z(
    2907,
    'Banner Summit',
    'SNFAC',
    'ID',
    'https://www.sawtoothavalanche.com/forecasts/avalanche/banner-summit',
  ),
  z(
    2904,
    'Galena Summit & Eastern Mtns',
    'SNFAC',
    'ID',
    'https://www.sawtoothavalanche.com/forecasts/avalanche/galena-summit-&-eastern-mtns',
  ),
  z(
    2906,
    'Sawtooth & Western Smoky Mtns',
    'SNFAC',
    'ID',
    'https://www.sawtoothavalanche.com/forecasts/avalanche/sawtooth-&-western-smoky-mtns',
  ),
  z(
    2905,
    'Soldier & Wood River Valley Mtns',
    'SNFAC',
    'ID',
    'https://www.sawtoothavalanche.com/forecasts/avalanche/soldier-&-wood-river-valley-mtns',
  ),
  z(
    3043,
    'Flathead Range & Glacier NP',
    'FAC',
    'MT',
    'https://www.flatheadavalanche.org/avalanche-forecast/#/flathead-range-&-glacier-np',
  ),
  z(
    3040,
    'Northern Whitefish Range',
    'FAC',
    'MT',
    'https://www.flatheadavalanche.org/avalanche-forecast/#/northern-whitefish-range',
  ),
  z(
    3041,
    'Southern Whitefish Range',
    'FAC',
    'MT',
    'https://www.flatheadavalanche.org/avalanche-forecast/#/southern-whitefish-range',
  ),
  z(
    3042,
    'Swan Range',
    'FAC',
    'MT',
    'https://www.flatheadavalanche.org/avalanche-forecast/#/swan-range',
  ),
  z(
    2819,
    'Bridger Range',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/bridger-range/',
  ),
  z(
    2827,
    'Cooke City',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/cooke-city/',
  ),
  z(
    2826,
    'Island Park',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/island-park/',
  ),
  z(
    2825,
    'Lionhead Area',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/lionhead-area/',
  ),
  z(
    2821,
    'Northern Gallatin Range',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/northern-gallatin-range/',
  ),
  z(
    2822,
    'Northern Madison Range',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/northern-madison-range/',
  ),
  z(
    2824,
    'Southern Gallatin Range',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/southern-gallatin-range/',
  ),
  z(
    2823,
    'Southern Madison Range',
    'GNFAC',
    'MT',
    'https://www.mtavalanche.com/avalanche-forecast#/southern-madison-range/',
  ),
  z(
    1901,
    'East Cabinet Mountains',
    'IPAC',
    'MT',
    'https://www.idahopanhandleavalanche.org/forecasts/#/east-cabinet-mountains/',
  ),
  z(
    3019,
    'Purcell Mountains',
    'IPAC',
    'MT',
    'https://www.idahopanhandleavalanche.org/forecasts/#/purcell-mountains/',
  ),
  z(1724, 'Bitterroot', 'WCMAC', 'MT', 'https://missoulaavalanche.org/forecasts/#/Bitterroot'),
  z(1723, 'Rattlesnake', 'WCMAC', 'MT', 'https://missoulaavalanche.org/forecasts/#/rattlesnake'),
  z(1722, 'Seeley Lake', 'WCMAC', 'MT', 'http://www.missoulaavalanche.org/forecasts/#/seeley-lake'),
  z(
    2355,
    'Presidential Range',
    'MWAC',
    'NH',
    'https://mountwashingtonavalanchecenter.org/forecasts/#/presidential-range ',
  ),
  z(
    490,
    'Northern New Mexico',
    'TAC',
    'NM',
    'https://taosavalanchecenter.org/forecasts/#/northern-new-mexico',
  ),
  z(
    3017,
    'Adirondack Park',
    'NYSAC',
    'NY',
    'https://dec.ny.gov/things-to-do/hiking/adirondack-backcountry/backcountry-information-for-adirondack-park',
  ),
  z(
    2470,
    'Central Cascades',
    'COAA',
    'OR',
    'https://coavalanche.org/pages/forecasts/#/central-cascades',
  ),
  z(2471, 'Newberry', 'COAA', 'OR', 'https://coavalanche.org/pages/forecasts/#/newberry'),
  z(3032, 'Mt Hood', 'NWAC', 'OR', 'https://nwac.us/forecasts/avalanche/mt-hood'),
  z(
    1369,
    'Southern Oregon',
    'SOAIX',
    'OR',
    'https://www.oregonsnow.org/observations/#/view/observations',
  ),
  z(2985, 'Blues', 'WAC', 'OR', 'https://www.wallowaavalanchecenter.org/forecasts/#/blues'),
  z(2984, 'Elkhorns', 'WAC', 'OR', 'https://www.wallowaavalanchecenter.org/forecasts/#/elkhorns'),
  z(
    2982,
    'Northern Wallowas',
    'WAC',
    'OR',
    'https://wallowaavalanchecenter.org/forecasts/#/northern-wallowas',
  ),
  z(
    2983,
    'Southern Wallowas',
    'WAC',
    'OR',
    'https://wallowaavalanchecenter.org/forecasts/#/southern-wallowas',
  ),
  z(1744, 'Abajos', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/abajos'),
  z(1736, 'Logan', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/logan'),
  z(1742, 'Moab', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/moab'),
  z(1737, 'Ogden', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/ogden'),
  z(1739, 'Provo', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/provo'),
  z(1738, 'Salt Lake', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/salt-lake'),
  z(1741, 'Skyline', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/skyline'),
  z(1743, 'Southwest', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/southwest'),
  z(1740, 'Uintas', 'UAC', 'UT', 'https://utahavalanchecenter.org/forecast/uintas'),
  z(
    3030,
    'East Slopes Central',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/east-slopes-central',
  ),
  z(
    3029,
    'East Slopes North',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/east-slopes-north',
  ),
  z(
    3031,
    'East Slopes South',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/east-slopes-south',
  ),
  z(3020, 'Olympics', 'NWAC', 'WA', 'https://nwac.us/forecasts/avalanche/olympics'),
  z(3028, 'Snoqualmie Pass', 'NWAC', 'WA', 'https://nwac.us/forecasts/avalanche/snoqualmie-pass'),
  z(3024, 'Stevens Pass', 'NWAC', 'WA', 'https://nwac.us/forecasts/avalanche/stevens-pass'),
  z(
    3022,
    'West Slopes Central',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/west-slopes-central',
  ),
  z(
    3021,
    'West Slopes North',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/west-slopes-north',
  ),
  z(
    3023,
    'West Slopes South',
    'NWAC',
    'WA',
    'https://nwac.us/forecasts/avalanche/west-slopes-south',
  ),
  z(
    2856,
    'Salt River and Wyoming Ranges',
    'BTAC',
    'WY',
    'https://bridgertetonavalanchecenter.org/forecasts/#/salt-river-and-wyoming-ranges/',
  ),
  z(
    2860,
    'Snake River Range',
    'BTAC',
    'WY',
    'https://bridgertetonavalanchecenter.org/forecasts/#/snake-river-range',
  ),
  z(2855, 'Tetons', 'BTAC', 'WY', 'https://bridgertetonavalanchecenter.org/forecasts/#/tetons'),
  z(
    2852,
    'Togwotee Pass',
    'BTAC',
    'WY',
    'https://bridgertetonavalanchecenter.org/forecasts/#/togwotee-pass',
  ),
  z(2841, 'Big Horns', 'EWYAIX', 'WY', 'https://ewyoavalanche.org'),
  z(2843, 'Sierra Madre', 'EWYAIX', 'WY', 'https://ewyoavalanche.org'),
  z(2842, 'Snowy Range', 'EWYAIX', 'WY', 'https://ewyoavalanche.org'),
];

const BY_CODE = new Map(US_ZONES.map((zone) => [zone.code, zone]));

/** "Utah · UAC · Salt Lake": a zone in the configuration list (60 characters at most). */
export function usZoneLabel(zone, language) {
  return `${STATES[zone.state][language]} · ${zone.center} · ${zone.name}`;
}

/** The US zone of a code ("us-1738"), or null. */
export function usZoneOf(code) {
  return BY_CODE.get(String(code)) ?? null;
}
