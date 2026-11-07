# Avalanche bulletins for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that brings the
**avalanche danger bulletin (BERA) of Météo-France** into Gladys, for the 35 French massifs of the
Alps, the Pyrenees and Corsica, and the **forecasts of the US avalanche centers** (83 zones, via
avalanche.org). Public data, no account, no key.

> **Read the full bulletin before going out.** This integration shows a summary of it; it does not
> replace the bulletin nor your own assessment in the field. Not affiliated with Météo-France.

## What it does

- One device per massif you choose, with the danger level of the bulletin's day and the trend for
  the next day (European scale, 1 to 5), the levels below and above the split altitude, the most
  exposed aspects, the dates of issue and validity, the snow depth on the north and south sides,
  and whether a bulletin is in force.
- Scene triggers: **Avalanche danger reaches a level** (2 to 5, fired once when crossed upwards)
  and **New avalanche bulletin** (with the summary and the link to the PDF).
- A dashboard widget: the danger of every followed massif, or the detail of one.
- Off season (June to October), the devices simply say that no bulletin is in force.
- US forecast zones (Alaska, Utah, Washington, Montana, Wyoming, Idaho, California…) in the same
  list: danger of the day and of the next day, aspects, dates; the widget shows the elevation bands
  and links to the zone's official forecast. The US centers publish only in season. The Colorado
  center (CAIC) is not offered: its zones are redrawn during the season, without stable names.

Full user documentation: [English](docs/en.md), [français](docs/fr.md), [Deutsch](docs/de.md),
[español](docs/es.md).

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.
- Nothing else. Optionally, a free key of the
  [Météo-France API portal](https://portail-api.meteofrance.fr) (DPBRA API) if the open archive
  lags behind.

## Installation

In Gladys: **Integrations → Install from GitHub**, address of this repository:
`https://github.com/guim31/gladys-avalanche`. Choose your massifs in the configuration, save, then
create the devices in the **Discover** tab.

## How it works

The bulletins come from the open archive Météo-France publishes on data.gouv.fr
([Archive des bulletins avalanches](https://www.data.gouv.fr/datasets/archive-des-bulletins-avalanches)):
one XML file per massif and per issue, in one directory per day. The integration reads today's
index every 30 minutes and downloads the bulletin of a massif only when a new one appears.
With an API key, it asks the DPBRA API of Météo-France instead (same XML document).

A US zone is read from the public product API of avalanche.org
(`https://api.avalanche.org/v2/public/product?type=forecast&center_id=…&zone_id=…`), one request
per zone every 30 minutes; only a rated forecast is published.

## Limits

- **Developed off season**: tested on real bulletins of the 2025-2026 season, but the delay of the
  archive during a season in progress is not measured yet. Feedback welcome.
- The DPBRA API path was developed from its documentation, without a key: feedback welcome.
- A summary only: the snowpack, weather and snow quality texts stay in the PDF of the bulletin.
- Andorra is not covered (no bulletin from Météo-France).
- US zones: developed at the start of the 2026-2027 season, when few zones were rated; tested
  against the real API. Feedback welcome.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
```

The tests run against the fake Gladys of the SDK and real bulletins recorded under
`test/fixtures/bra/` (same paths as the archive) and real avalanche.org answers under
`test/fixtures/us/`; they never touch the network.

## Credits

- Bulletins © [Météo-France](https://meteofrance.com), Licence Ouverte / Open Licence 2.0
  (Etalab), via [data.gouv.fr](https://www.data.gouv.fr). Some of them are recorded in
  `test/fixtures/bra/` as test data.
- US forecasts: the US avalanche centers, via the public API of
  [avalanche.org](https://avalanche.org/) (National Avalanche Center); a few answers are recorded in
  `test/fixtures/us/` as test data, without the forecasters' names.
- Cover: the official Météo-France logo (2023, without its slogan), from
  [Wikipedia](https://fr.wikipedia.org/wiki/Fichier:Logo_M%C3%A9t%C3%A9o-France_2023.png), used to
  identify the data source only; trademark of Météo-France.
- Built on the official
  [Gladys integration template](https://github.com/GladysAssistant/integration-template-js) and
  [SDK](https://github.com/GladysAssistant/integration-sdk-js).

Not affiliated with, nor endorsed by, Météo-France, avalanche.org or the US avalanche centers.

## License

[Apache-2.0](LICENSE)
