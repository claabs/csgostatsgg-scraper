import { CSGOStatsGGScraper } from './player';
import { MatchType } from './player-types';

jest.setTimeout(60000);
describe('The Player class', () => {
  let scraper: CSGOStatsGGScraper;

  beforeAll(async () => {
    scraper = new CSGOStatsGGScraper();
  });

  afterAll(async () => {
    await scraper.close();
  });

  it('should get data for one player', async () => {
    const results = await scraper.searchPlayer('hiko36'); // Retired gamer
    expect(results.summary).toMatchObject({
      steamId64: '76561197960268519',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561197960268519',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/d4/d41ec69cf1f3546819950fc3a8d3096c18d7e42d_full.jpg',
      currentRank: 15,
      bestRank: 17,
      competitiveWins: 964,
    });
    expect(results.stats).toMatchObject({
      killDeathRatio: 1.68,
      hltvRating: 1.4,
      clutchSuccessRate: 0.19,
      winRate: 0.54,
      headshotRate: 0.53,
      averageDamageRound: 97,
      entrySuccessRate: 0.09,
    });
    expect(results.graphs?.rawData).toHaveLength(98);
  });

  it('should return no stats when no matches found', async () => {
    const results = await scraper.searchPlayer('hiko36', {
      matchType: MatchType.SCRIMMAGE,
    }); // Retired gamer
    expect(results.summary).toMatchObject({
      steamId64: '76561197960268519',
      steamProfileUrl: 'https://steamcommunity.com/profiles/76561197960268519',
      steamPictureUrl:
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/d4/d41ec69cf1f3546819950fc3a8d3096c18d7e42d_full.jpg',
      currentRank: 15,
      bestRank: 17,
      competitiveWins: 964,
    });
    expect(results.stats).toBeUndefined();
    expect(results.graphs).toBeUndefined();
  });

  it('should return playedWith stats', async () => {
    const results = await scraper.getPlayedWith('76561197960268519'); // Retired gamer
    expect(results.players).toHaveLength(50);
    expect(results.offset).toEqual(0);
    expect(results.vac).toEqual('0');
  });

  it('should return playedWith stats with filters', async () => {
    const results = await scraper.getPlayedWith('76561197960268519', {
      vac: true,
    }); // Retired gamer
    expect(results.players).toHaveLength(48);
    expect(results.offset).toEqual(0);
    expect(results.vac).toEqual('1');
  });

  it('should throw on invalid search', async () => {
    await expect(scraper.searchPlayer('923498jdflkj2309usijkjf')).rejects.toThrow(
      'Error Invalid Steam Id, please try again'
    );
  });

  it('should throw on invalid get', async () => {
    await expect(scraper.getPlayer('999')).rejects.toThrow(
      'csgostats.gg returned a non-200 response: 404'
    );
  });
});
