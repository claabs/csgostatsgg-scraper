/* eslint-disable no-console */
import { CSGOStatsGGScraper } from './index';
import { PlayerOutput } from './player-types';

jest.setTimeout(5 * 60 * 1000);
describe('The scraper class', () => {
  it('should be extendable', async () => {
    class Extended extends CSGOStatsGGScraper {
      public async getPlayer(
        ...args: Parameters<CSGOStatsGGScraper['getPlayer']>
      ): Promise<PlayerOutput> {
        const resp = await super.getPlayer(...args);
        console.log(resp);
        return resp;
      }
    }

    const extendedScraper = new Extended();
    const resp = await extendedScraper.getPlayer('76561197960268519');
    expect(resp).toBeDefined();
    await extendedScraper.shutdown();
  });

  it('should shutdown and restart the core', async () => {
    const scraper = new CSGOStatsGGScraper();
    await scraper.listLatestMatches();
    await scraper.shutdown();
    const latestMatches = await scraper.listLatestMatches();
    expect(latestMatches).toBeDefined();
    await scraper.shutdown();
  });
});
