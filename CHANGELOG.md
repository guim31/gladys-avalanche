# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Météo-France avalanche bulletins (BERA) for the 35 massifs of the Alps, the
  Pyrenees and Corsica, read without an account from the open archive on
  data.gouv.fr, every 30 minutes.
- One device per massif: danger level of the day and of the next day (1 to 5),
  levels below and above the split altitude, split altitude, most exposed
  aspects, dates of issue and validity, snow depth north and south, bulletin in
  force.
- Scene triggers "Avalanche danger reaches a level" and "New avalanche
  bulletin".
- Dashboard widget "Avalanche danger": every followed massif, or the detail of
  one with the forecaster's comment and a link to the PDF of the bulletin.
- Optional Météo-France API key (DPBRA API) in case the archive lags behind.
- Documentation in English, French, German and Spanish.
