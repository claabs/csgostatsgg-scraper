/* eslint-disable no-console */
import { CSGOStatsGGScraper } from './index';
import { MatchMakingService } from './match-types';
import { MatchmakingRank } from './player-types';

jest.setTimeout(60000);
describe('The match scrapers', () => {
  let scraper: CSGOStatsGGScraper;

  beforeAll(async () => {
    scraper = new CSGOStatsGGScraper({ logger: console.log });
  });

  // afterAll(async () => {
  //   await scraper.close();
  // });

  it('should list the latest matches', async () => {
    const results = await scraper.listLatestMatches();
    results.forEach((summary) => {
      expect(summary.matchId).toBeGreaterThan(0);
      expect(summary).toMatchObject({
        matchId: expect.any(Number),
        matchmakingService: expect.any(String),
        date: expect.any(Date),
        // averageRank can be undefined, so not much to test on...
      });
    });
  });

  it('should get a match from share code', async () => {
    const results = await scraper.searchMatch('CSGO-Q8CpG-TyNWZ-ptSn5-ETEer-MOBJC'); // https://csgostats.gg/match/46327747
    expect(results).toMatchObject({
      matchmakingService: MatchMakingService.MM,
      averageRank: MatchmakingRank.GOLD_NOVA_I,
      map: 'de_mirage',
      serverLocation: 'US North Central Server',
      date: new Date('2021-10-10T01:36:57Z'),
      hasBannedPlayer: true,
    });
  });

  it('should get the demo info for a recent match', async () => {
    const latestMatches = await scraper.listLatestMatches();
    const recentMatch = latestMatches.find((m) => m.matchmakingService === MatchMakingService.MM);
    if (!recentMatch) throw new Error('Could not get recent MM match');
    const results = await scraper.getMatch(recentMatch.matchId);
    expect(results).toMatchObject({
      matchmakingService: MatchMakingService.MM,
      watchUrl: expect.stringMatching(/https:\/\/csgostats\.gg\/match\/\d+\/watch\/.+/),
    });
  });
});
