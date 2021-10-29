/* eslint-disable camelcase */
import { Agent, Handler, KeyboardKeys, Tab } from 'secret-agent';
import { URLSearchParams } from 'url';
import debug, { Debugger } from 'debug';
import SteamID from 'steamid';
import {
  PlayerFilterParams,
  PlayerOptions,
  PlayerOutput,
  GraphsRawData,
  PlayedWithFilterParams,
  PlayedWith,
  MatchmakingRank,
} from './player-types';

function booleanToInt(boolean?: boolean): number | undefined {
  if (boolean === true) return 1;
  if (boolean === false) return 0;
  return boolean;
}

function parsePercent(string: string, radix?: number): number {
  return parseInt(string, radix) / 100;
}

async function parseNumber(
  agent: Agent | Tab,
  parseFunc: typeof parseInt | typeof parseFloat,
  selector: string
): Promise<number> {
  return parseFunc(await agent.document.querySelector(selector).innerText, 10);
}

async function parseRank(agent: Agent | Tab, selectorSuffix: string): Promise<MatchmakingRank> {
  const rankImgUrlPrefix = 'https://static.csgostats.gg/images/ranks/';
  const rankImgUrlExt = '.png';
  const rankImgUrl = await agent.document.querySelector(
    `img[src^="${rankImgUrlPrefix}"]${selectorSuffix}`
  ).src;
  return parseInt(
    rankImgUrl.substring(rankImgUrlPrefix.length, rankImgUrl.indexOf(rankImgUrlExt)),
    10
  );
}

const HOMEPAGE = 'https://csgostats.gg';

export class CSGOStatsGGScraper {
  public handler: Handler;

  private debug: Debugger;

  constructor(options?: PlayerOptions) {
    this.handler = new Handler({
      maxConcurrency: 10,
      ...options?.handlerOverrides,
    });
    this.handler.defaultAgentOptions = {
      ...this.handler.defaultAgentOptions,
      blockedResourceTypes: ['BlockCssResources', 'BlockImages'],
      ...options?.agentOverrides,
    };
    this.debug = debug('csgostatsgg-scraper');
  }

  public async searchPlayer(
    searchString: string,
    filterParams?: PlayerFilterParams
  ): Promise<PlayerOutput> {
    const agent = (await this.handler.createAgent()) as Agent;
    this.debug(`Going to ${HOMEPAGE}`);
    await agent.goto(HOMEPAGE);

    // TODO: Check for Cloudflare

    await agent.interact(
      { click: agent.document.querySelector(`#search-input`) },
      { type: searchString },
      { keyPress: KeyboardKeys.Enter }
    );

    this.debug(`Waiting for location change`);
    await agent.waitForLocation('change');
    // TODO: Check for 404
    const steamId64 = (await agent.document.location.pathname).split('/').at(-1) as string;
    this.debug(`steamId64: ${steamId64}`);
    await agent.close();
    return this.getPlayer(steamId64, filterParams);
  }

  public async getPlayer(
    anySteamId: string | bigint,
    filterParams?: PlayerFilterParams
  ): Promise<PlayerOutput> {
    const agent = (await this.handler.createAgent()) as Agent;
    const steamId64 = new SteamID(anySteamId).getSteamID64();

    let resolvedUrl = `https://csgostats.gg/player/${steamId64}`;

    if (filterParams && Object.keys(filterParams).length) {
      this.debug(`Filter params are desired`);
      const possibleParams = {
        type: filterParams.matchType,
        maps: filterParams.maps,
        date_start: filterParams.startDate?.getTime().toString(),
        date_end: filterParams.startDate?.getTime().toString(),
      };
      const filteredParams = Object.fromEntries(
        Object.entries(possibleParams).filter((entries): entries is [string, string | string[]] => {
          const [, key] = entries;
          if (!key) return false;
          return key.length > 0;
        })
      );
      const params = new URLSearchParams(filteredParams);
      this.debug(`URL-ready params: ${params}`);
      resolvedUrl = `${resolvedUrl}?${params}`;
    }
    this.debug(`Going to ${resolvedUrl}`);
    await agent.goto(resolvedUrl);
    // TODO: Check for 404

    // TODO: Figure out elegant and readable way to this with destructuring and a Promise.all or something

    const steamProfileUrl = await agent.document.querySelector('.steam-icon').parentElement.href;
    this.debug(`steamProfileUrl: ${steamProfileUrl}`);
    const steamPictureUrl = await agent.document.querySelector(
      'img[src*="steamcdn"][width="120"][height="120"]'
    ).src;
    this.debug(`steamPictureUrl: ${steamPictureUrl}`);

    const currentRank = await parseRank(agent, `[width="92"]`);
    this.debug(`currentRank: ${currentRank}`);
    const bestRank = await parseRank(agent, `[height="24"]`);
    this.debug(`bestRank: ${bestRank}`);

    const competitiveWins = await parseNumber(agent, parseInt, '#competitve-wins > span');
    this.debug(`competitiveWins: ${competitiveWins}`);

    // Check for no data
    const noMatchesMessage = agent.document.querySelector(
      '#player-outer-section > div:nth-child(2) > div > span'
    );
    let errorMessage;
    try {
      errorMessage = await noMatchesMessage.innerText;
    } catch {
      errorMessage = undefined;
    }
    if (errorMessage) {
      this.debug(errorMessage);
      return {
        summary: {
          steamId64,
          steamProfileUrl,
          steamPictureUrl,
          currentRank,
          bestRank,
          competitiveWins,
        },
      };
    }

    const killDeathRatio = await parseNumber(agent, parseFloat, `#kpd > span`);
    this.debug(`killDeathRatio: ${killDeathRatio}`);
    const hltvRating = await parseNumber(agent, parseFloat, `#rating > span`);
    this.debug(`hltvRating: ${hltvRating}`);
    const clutchSuccessRate = await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    );
    this.debug(`clutchSuccessRate: ${clutchSuccessRate}`);

    const winRate = await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)`
    );
    this.debug(`winRate: ${winRate}`);
    const headshotRate = await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2)`
    );
    this.debug(`headshotRate: ${headshotRate}`);
    const averageDamageRound = await parseNumber(
      agent,
      parseInt,
      `#player-overview > div.stats-col-1 > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(2)`
    );
    this.debug(`averageDamageRound: ${averageDamageRound}`);
    const entrySuccessRate = await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    );
    this.debug(`entrySuccessRate: ${entrySuccessRate}`);

    // Sometimes the raw_data isn't defined yet, or the script block isn't even loaded, so we poll for it as needed
    async function waitForRawData(
      startTime = new Date(),
      timeout = 30000,
      poll = 100
    ): Promise<GraphsRawData> {
      try {
        const rawData: GraphsRawData = await agent.getJsValue('raw_data');
        return rawData;
      } catch (err) {
        if (startTime.getTime() + timeout <= new Date().getTime()) {
          throw new Error(`Timeout after ${timeout}ms: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, poll));
        return waitForRawData(startTime, timeout, poll);
      }
    }
    // Alternative
    // const [, stringifiedRawData] = graphsScript.match(/raw_data = (\[.*?\]);\n/) || [];

    const graphsRawData: GraphsRawData = await waitForRawData();

    this.debug(`graphsRawData.length: ${graphsRawData.length}`);

    await agent.close();
    return {
      summary: {
        steamId64,
        steamProfileUrl,
        steamPictureUrl,
        currentRank,
        bestRank,
        competitiveWins,
      },
      stats: {
        killDeathRatio,
        hltvRating,
        clutchSuccessRate,
        winRate,
        headshotRate,
        averageDamageRound,
        entrySuccessRate,
      },
      graphs: {
        rawData: graphsRawData,
      },
      playedWith: () =>
        this.getPlayedWith(steamId64, {
          mode: filterParams?.matchType,
          startDate: filterParams?.startDate,
          endDate: filterParams?.endDate,
        }),
    };
  }

  public async getPlayedWith(
    steamId64: string,
    filterParams?: PlayedWithFilterParams
  ): Promise<PlayedWith> {
    const agent = (await this.handler.createAgent()) as Agent;
    await agent.goto(HOMEPAGE);
    let postUrl = `https://csgostats.gg/player/${steamId64}/ajax/played-with`;
    if (filterParams && Object.keys(filterParams).length) {
      const possibleParams = {
        vac: booleanToInt(filterParams.vac)?.toString(),
        offset: filterParams.offset?.toString(),
        mode: filterParams.mode,
        date_start: filterParams.startDate?.getTime().toString(),
        date_end: filterParams.startDate?.getTime().toString(),
        order: filterParams.order,
        source: filterParams.source,
      };
      const filteredParams = Object.fromEntries(
        Object.entries(possibleParams).filter((entries): entries is [string, string] => {
          const [, key] = entries;
          if (!key) return false;
          return key.length > 0;
        })
      );
      const params = new URLSearchParams(filteredParams);
      postUrl = `${postUrl}?${params}`;
    }
    const resp = await agent.fetch(postUrl, { method: 'post' });
    if (!resp.ok) throw resp;
    const body: PlayedWith = await resp.json();
    await agent.close();
    return body;
  }

  public async close(): Promise<void> {
    this.debug('Closing agents');
    return this.handler.close();
  }
}
