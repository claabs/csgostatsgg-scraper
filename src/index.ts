import debug, { Debugger } from 'debug';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import PQueue from 'p-queue';
import { getMatch, listLatestMatches, searchMatch } from './match';
import { getPlayedWith, getPlayer, searchPlayer } from './player';

export * from './player-types';
export * from './match-types';

export interface ScraperOptions {
  /**
   * The default timeout for web scraping events
   * @default 120000
   */
  timeout?: number;

  /**
   * Any overrides you directly want to set on the Hero instance
   */
  heroOverrides?: IHeroCreateOptions;

  /**
   * How many functions can be run concurrently. Any extra will be queued.
   * @default 10
   */
  concurrency?: number;

  /**
   * A custom logger, if you don't want to use [debug](https://www.npmjs.com/package/debug)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: (...args: any[]) => void;
}
export class CSGOStatsGGScraper {
  protected heroOptions: IHeroCreateOptions;

  protected debug: Debugger = debug('csgostatsgg-scraper');

  protected timeout = 2 * 60 * 1000;

  protected queue: PQueue;

  constructor(options?: ScraperOptions) {
    this.heroOptions = {
      blockedResourceTypes: ['All'],
      ...options?.heroOverrides,
    };
    this.timeout = options?.timeout ?? this.timeout;
    this.debug = (options?.logger as Debugger) ?? this.debug;
    this.queue = new PQueue({ concurrency: options?.concurrency ?? 10 });
  }

  protected async createHero(): Promise<Hero> {
    let ChosenHero: typeof Hero;
    try {
      ChosenHero = (await import('@ulixee/hero-fullstack')).default;
    } catch {
      ChosenHero = Hero;
    }
    return new ChosenHero(this.heroOptions);
  }

  public searchPlayer(...args: Parameters<typeof searchPlayer>): ReturnType<typeof searchPlayer> {
    return this.queue.add(() => searchPlayer.bind(this)(...args));
  }

  public getPlayer(...args: Parameters<typeof getPlayer>): ReturnType<typeof getPlayer> {
    return this.queue.add(() => getPlayer.bind(this)(...args));
  }

  public getPlayedWith(
    ...args: Parameters<typeof getPlayedWith>
  ): ReturnType<typeof getPlayedWith> {
    return this.queue.add(() => getPlayedWith.bind(this)(...args));
  }

  public searchMatch(...args: Parameters<typeof searchMatch>): ReturnType<typeof searchMatch> {
    return this.queue.add(() => searchMatch.bind(this)(...args));
  }

  public getMatch(...args: Parameters<typeof getMatch>): ReturnType<typeof getMatch> {
    return this.queue.add(() => getMatch.bind(this)(...args));
  }

  public listLatestMatches(
    ...args: Parameters<typeof listLatestMatches>
  ): ReturnType<typeof listLatestMatches> {
    return this.queue.add(() => listLatestMatches.bind(this)(...args));
  }
}
