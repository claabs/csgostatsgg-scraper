/* eslint-disable no-console */
import { CSGOStatsGGScraper } from './index';
import { MatchType } from './player-types';

jest.setTimeout(5 * 60 * 1000);
describe('The player scrapers', () => {
  let scraper: CSGOStatsGGScraper;

  beforeAll(async () => {
    scraper = new CSGOStatsGGScraper({ logger: console.log });
  });

  afterAll(async () => {
    await scraper.close();
  });

  it('should get data for one player', async () => {
    const results = await scraper.searchPlayer('hiko36'); // Hiko
    expect(results.summary).toMatchObject({
      steamId64: '76561197960268519',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561197960268519',
      eseaUrl: 'https://play.esea.net/users/135432',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/d4/d41ec69cf1f3546819950fc3a8d3096c18d7e42d_full.jpg',
      bestRank: 17,
      lastGameDate: expect.any(Date),
      banType: undefined,
      banDate: undefined,
    });
    expect(results.summary.currentRank).toBeGreaterThan(10);
    expect(results.summary.competitiveWins).toBeGreaterThan(900);
    expect(results.stats?.killDeathRatio).toBeGreaterThan(1);
    expect(results.stats?.hltvRating).toBeGreaterThan(1);
    expect(results.stats?.clutchSuccessRate).toBeGreaterThan(0.1);
    expect(results.stats?.winRate).toBeGreaterThan(0.4);
    expect(results.stats?.headshotRate).toBeGreaterThan(0.4);
    expect(results.stats?.averageDamageRound).toBeGreaterThan(80);
    expect(results.stats?.entrySuccessRate).toBeGreaterThan(0.05);
    expect(results.graphs?.rawData.length).toBeGreaterThan(100);
  });

  it('should get data for banned player', async () => {
    const results = await scraper.searchPlayer('76561198000020858'); // KQLY
    expect(results.summary).toMatchObject({
      steamId64: '76561198000020858',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561198000020858',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/88/883f2697f5b2dc4affda2d47eedc1cbec8cfb657_full.jpg',
      banType: 'VAC',
      banDate: expect.any(Date),
      lastGameDate: expect.any(Date),
    });
    expect(results.stats).toMatchObject({
      killDeathRatio: 1,
      hltvRating: 0.33,
      clutchSuccessRate: 0,
      winRate: 0.33,
      headshotRate: 0.35,
      averageDamageRound: 0,
      entrySuccessRate: 0.15,
    });
    expect(results.graphs?.rawData).toHaveLength(6);
  });

  it('should return handle 10 simultaneous requests (status command)', async () => {
    const steamIDs = [
      '76561198325964713',
      '76561198223594140',
      '76561198145522845',
      '76561198164504051',
      '76561197975324794',
      '76561198000253201',
      '76561198020996622',
      '76561198382666964',
      '76561198077588258',
      '76561198150706831',
    ];

    const results = await Promise.all(
      steamIDs.map(async (steamId) => {
        const resp = await scraper.getPlayer(steamId);
        expect(resp.summary).toMatchObject({
          steamId64: expect.any(String),
          steamProfileUrl: expect.any(String),
          steamPictureUrl: expect.any(String),
        });
        return resp;
      })
    );
    expect(results).toHaveLength(steamIDs.length);
  });

  it('should return no detailed stats when no matches found with filter', async () => {
    const results = await scraper.searchPlayer('hiko36', {
      matchType: MatchType.SCRIMMAGE,
    }); // Hiko
    expect(results.summary).toMatchObject({
      steamId64: '76561197960268519',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561197960268519',
      eseaUrl: 'https://play.esea.net/users/135432',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/d4/d41ec69cf1f3546819950fc3a8d3096c18d7e42d_full.jpg',
      bestRank: 17,
      lastGameDate: expect.any(Date),
      banType: undefined,
      banDate: undefined,
    });
    expect(results.summary.currentRank).toBeGreaterThan(10);
    expect(results.summary.competitiveWins).toBeGreaterThan(900);
    expect(results.stats).toBeUndefined();
    expect(results.graphs).toBeUndefined();
  });

  it('should return no stats when player never played a match', async () => {
    const results = await scraper.searchPlayer('76561198067520980'); // Non-CSGO player
    expect(results.summary).toMatchObject({
      steamId64: '76561198067520980',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561198067520980',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/6a/6aaafaada69aaa226542ae137ac994c0181f5c1d_full.jpg',
    });
    expect(results.stats).toBeUndefined();
    expect(results.graphs).toBeUndefined();
  });

  it('should return playedWith stats', async () => {
    const results = await scraper.getPlayedWith('76561197960268519'); // Hiko
    expect(results.players).toHaveLength(50);
    expect(results.offset).toEqual(0);
    expect(results.vac).toEqual('0');
  });

  it('should return playedWith stats with filters', async () => {
    const results = await scraper.getPlayedWith('76561197960268519', {
      vac: true,
    }); // Hiko
    expect(results.players).toHaveLength(50);
    expect(results.offset).toEqual(0);
    expect(results.vac).toEqual('1');
  });

  it('should throw on invalid search', async () => {
    await expect(scraper.searchPlayer('923498jdflkj2309usijkjf')).rejects.toThrow(
      /Invalid Steam Id, please try again/
    );
  });

  it('should throw on invalid get', async () => {
    await expect(scraper.getPlayer('999')).rejects.toThrow(
      'csgostats.gg returned a non-200 response: 404'
    );
  });
});
