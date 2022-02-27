import debug, { Debugger } from 'debug';
import { Handler, IAgentCreateOptions, IConnectionToCoreOptions } from 'secret-agent';
import { getMatch, listLatestMatches, searchMatch } from './match';
import { getPlayedWith, getPlayer, searchPlayer } from './player';

export * from './player-types';
export * from './match-types';

export interface ScraperOptions {
  timeout?: number;
  handlerOverrides?: IConnectionToCoreOptions;
  agentOverrides?: IAgentCreateOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: (...args: any[]) => void;
}
export class CSGOStatsGGScraper {
  public handler: Handler;

  protected debug: Debugger = debug('csgostatsgg-scraper');

  protected timeout = 2 * 60 * 1000;

  protected hcaptchaAccessibilityUrl?: string;

  protected cfToken?: string;

  constructor(options?: ScraperOptions) {
    this.handler = new Handler({
      maxConcurrency: 10,
      ...options?.handlerOverrides,
    });
    this.handler.defaultAgentOptions = {
      ...this.handler.defaultAgentOptions,
      blockedResourceTypes: ['All'],
      ...options?.agentOverrides,
    };
    this.timeout = options?.timeout ?? this.timeout;
    this.debug = (options?.logger as Debugger) ?? this.debug;
  }

  public searchPlayer(...args: Parameters<typeof searchPlayer>): ReturnType<typeof searchPlayer> {
    return searchPlayer.bind(this)(...args);
  }

  public getPlayer(...args: Parameters<typeof getPlayer>): ReturnType<typeof getPlayer> {
    return getPlayer.bind(this)(...args);
  }

  public getPlayedWith(
    ...args: Parameters<typeof getPlayedWith>
  ): ReturnType<typeof getPlayedWith> {
    return getPlayedWith.bind(this)(...args);
  }

  public searchMatch(...args: Parameters<typeof searchMatch>): ReturnType<typeof searchMatch> {
    return searchMatch.bind(this)(...args);
  }

  public getMatch(...args: Parameters<typeof getMatch>): ReturnType<typeof getMatch> {
    return getMatch.bind(this)(...args);
  }

  public listLatestMatches(
    ...args: Parameters<typeof listLatestMatches>
  ): ReturnType<typeof listLatestMatches> {
    return listLatestMatches.bind(this)(...args);
  }

  public async close(): Promise<void> {
    this.debug('Closing agents');
    return this.handler.close();
  }
}
