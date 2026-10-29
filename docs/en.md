# Avalanche bulletins (BERA)

The avalanche danger bulletin (BERA) of Météo-France in Gladys, for the 35 French massifs of the Alps, the Pyrenees
and Corsica: one device per massif, with its danger level from 1 to 5, the trend for the next day, the most exposed
aspects and the snow depth. Scene triggers and a dashboard widget come with it.

> **Read the full bulletin before going out.** This integration shows a summary of it. It does not replace the
> bulletin, the forecaster's text, nor your own assessment in the field.

Not affiliated with Météo-France.

## What you get

- **One device per massif** you choose: Mont-Blanc, Belledonne, Aspe-Ossau, Cinto-Rotondo…
- The **danger level** of the bulletin's day (European scale, 1 Low to 5 Very high), and the **trend** for the day
  after.
- The level **below and above the split altitude**, and that altitude (0 when the bulletin gives one level for the
  whole massif).
- The **most exposed aspects**, the **date of issue** and the **end of validity**.
- The **snow depth** on the north and south sides at the top altitude of the bulletin's table (2000 m in the
  Prealps, Corsica and the Basque Country, 2500 m elsewhere).
- **Bulletin in force**: 1 while a bulletin covers the current time, 0 otherwise (off season).
- Two **scene triggers** and a **dashboard widget**.

## Requirements

- Gladys Assistant 5.3.0 or later.
- Internet access from Gladys. No account and no key: the bulletins come from the open archive of Météo-France on
  data.gouv.fr.
- Météo-France issues the bulletins **from early November to early June**, usually around 4 pm for the next day.
  Off season the devices say "no bulletin in force", without error.

## Configuration

### Settings

| Setting                       | Default | What it does                                                                     |
| ----------------------------- | ------- | -------------------------------------------------------------------------------- |
| Massifs                       | none    | The massifs to follow, one device each.                                          |
| Météo-France API key          | empty   | Optional: reads the bulletins from the DPBRA API instead of the archive.         |
| Language of the feature names | French  | Names of the features of new devices, and language of their texts and variables. |

Save, then open the **Discover** tab of the integration and create the devices you want.

### Optional: the Météo-France API key

The open archive is enough in normal times. If it lags behind (the bulletin of the day does not show in the
evening), create a free account on the [Météo-France API portal](https://portail-api.meteofrance.fr), subscribe to
the "Bulletin d'estimation du risque d'avalanche" (DPBRA) API, generate an **API key** and paste it in the
configuration. The integration then asks Météo-France directly, one request per massif every 30 minutes. This path
was developed from the API documentation, without a key: feedback welcome. The link to the PDF of the bulletin is
only available from the archive.

## Devices

| Feature                         | Type        | Value                                                 |
| ------------------------------- | ----------- | ----------------------------------------------------- |
| Avalanche danger (1-5)          | number      | Highest level of the bulletin's day                   |
| Danger trend, next day          | number      | Level forecast for the day after                      |
| Danger below the split altitude | number      | Level under the split altitude (or whole massif)      |
| Danger above the split altitude | number      | Level over the split altitude (or whole massif)       |
| Split altitude                  | metres      | 0 without a split                                     |
| Most exposed aspects            | text        | "N, NE, NW", "All aspects" or "No aspect singled out" |
| Bulletin issued on              | text        | Date and time of issue                                |
| Valid until                     | text        | End of validity (6 pm the next day)                   |
| Snow on north / south side      | centimetres | Snow depth at 2000 or 2500 m depending on the massif  |
| Bulletin in force               | on / off    | 1 while the bulletin is valid                         |

The levels are numbers (not the Gladys "risk" badge, which only knows four levels), so a scene condition such as
"danger ≥ 4" works. When no bulletin is in force, only "Bulletin in force" is updated: the other values are not
invented and simply age.

## Dashboard widget

**Avalanche danger**: without a massif chosen, one line per followed massif (10 at most) with its level written like
the official pictogram ("4 · High") and the next-day trend, coloured green (1), yellow (2) or red (3 and more). With
a massif chosen: the danger and next-day tiles, the levels below and above the split altitude, the aspects, the snow
depth, the validity, the forecaster's comment and a button to the PDF of the bulletin. The comment and the button
each have a setting to hide them.

## Scene triggers

- **Avalanche danger reaches a level**: a new bulletin raises the danger of a massif to the chosen level (2 to 5) or
  above. It fires once, when the level is crossed upwards: from 2 to 4, "reaches 3" and "reaches 4" both fire.
  Variables: massif, level, level name, end of validity.
- **New avalanche bulletin**: Météo-France issues a new bulletin for a massif. Variables: massif, level, level name,
  next-day trend, end of validity, summary of the bulletin (in French, as written by Météo-France), link to the PDF.

The very first bulletin read after the installation only sets the reference: it fires nothing.

## Scene examples

- At 6 pm, if the danger of your massif is 4 or more, send a message "Avalanche danger {{level}} tomorrow".
- On a new bulletin, send its summary and the link to the PDF to the family group.

## Data sources, licence and quotas

- Bulletins © Météo-France, [archive of the avalanche bulletins](https://www.data.gouv.fr/datasets/archive-des-bulletins-avalanches)
  on data.gouv.fr, Licence Ouverte 2.0. Read every 30 minutes: one small index file, and the bulletin of a massif
  only when a new one appears.
- Optional DPBRA API of Météo-France: one request per massif every 30 minutes, far below the 50 requests per minute
  of the portal.

## Troubleshooting

- **"No bulletin in force"** in season, in the evening: the archive may lag behind; wait for the next cycle (30
  minutes), or add an API key (see above).
- **"Météo-France refused the API key"**: check the key in the configuration, or empty it to use the archive.
- The connection status says the bulletins cannot be read: data.gouv.fr or Météo-France is unreachable. The last
  values are kept and the integration tries again every 30 minutes.

## Limits

- Developed without a winter in progress: the bulletins of the 2025-2026 season were used for the tests, but the
  delay of the archive during the season is not measured yet. Feedback welcome.
- A summary of the bulletin only: the texts on the snowpack, the weather and the snow quality stay in the PDF.
- Andorra is not covered: Météo-France publishes no bulletin for it.
