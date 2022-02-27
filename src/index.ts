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

  public searchPlayer = searchPlayer;

  public getPlayer = getPlayer;

  public getPlayedWith = getPlayedWith;

  public searchMatch = searchMatch;

  public getMatch = getMatch;

  public listLatestMatches = listLatestMatches;

  public async close(): Promise<void> {
    this.debug('Closing agents');
    return this.handler.close();
  }
}
