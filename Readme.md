# csgostatsgg-scraper

A consumable Node package to (heavy-handedly) scrape data from csgostats.gg.
Due to csgostats.gg not having an API, and being mostly protected by Cloudflare, the best approach is to spin up a headless browser to load the page and scrape it.
[SecretAgent](https://secretagent.dev/) is used to bypass Cloudflare and manage the DOM scraping.

## Progress

- [x] Player page summary data
- [x] Player page large performance stats
- [ ] Player page detailed performance stats
- [x] Player page graph data
- [ ] Player page weapon stats
- [ ] Player page map stats
- [ ] Player page matches data
- [x] Player page "Played With" section
- [x] Global recent matches list
- [x] Match page summary data
- [ ] Match page scoreboard
- [ ] Match page rounds
- [ ] Match page weapons
- [ ] Match page duels
- [ ] Match page heatmaps
- [ ] Leaderboards
