import { Agent, KeyboardKeys, LocationStatus, Tab } from 'secret-agent';
import { URLSearchParams } from 'url';
import SteamID from 'steamid';
import * as chrono from 'chrono-node';
import {
  PlayerFilterParams,
  PlayerOutput,
  GraphsRawData,
  PlayedWithFilterParams,
  PlayedWith,
  MatchmakingRank,
  BanType,
} from './player-types';
import { CSGOStatsGGScraper } from './index';
import { HOMEPAGE } from './constants';

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
): Promise<number | undefined> {
  try {
    return parseFunc(await agent.document.querySelector(selector).innerText, 10);
  } catch {
    return undefined;
  }
}

async function parseRank(
  agent: Agent | Tab,
  selectorSuffix: string
): Promise<MatchmakingRank | undefined> {
  const rankImgUrlPrefix = 'https://static.csgostats.gg/images/ranks/';
  const rankImgUrlExt = '.png';
  let rankImgUrl;
  try {
    rankImgUrl = await agent.document.querySelector(
      `img[src^="${rankImgUrlPrefix}"]${selectorSuffix}`
    ).src;
  } catch {
    return undefined;
  }
  return parseInt(
    rankImgUrl.substring(rankImgUrlPrefix.length, rankImgUrl.indexOf(rankImgUrlExt)),
    10
  );
}

function parseCSGOStatsDate(dateString: string): Date {
  // Last Game Sun, 9th May
  // Last Game Mon, 2nd Nov, 20
  // Last Game 2 days ago
  // Last Game 25 minutes ago
  // Overwatch Banned 97 days ago.
  const resolvedDate = chrono.parseDate(dateString);
  // Chrono doesn't detect the trailing 2-digit year, so we have to detect it and append it manually
  const [, endYear] = dateString.match(/^.*?,.*?, (\d{2})$/) || [];
  if (endYear) {
    resolvedDate.setFullYear(2000 + parseInt(endYear, 10));
  }
  return resolvedDate;
}

export async function getPlayedWith(
  this: CSGOStatsGGScraper,
  steamId64: string,
  filterParams?: PlayedWithFilterParams
): Promise<PlayedWith> {
  const agent = (await this.handler.createAgent()) as Agent;
  try {
    await agent.goto(HOMEPAGE, this.timeout);
    let ajaxUrl = `https://csgostats.gg/player/${steamId64}/ajax/played-with`;
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
      ajaxUrl = `${ajaxUrl}?${params}`;
    }
    const resp = await agent.fetch(ajaxUrl, { method: 'get' });
    if (!(await resp.ok))
      throw new Error(`Failed to get playedWith data: ${await resp.statusText}`);
    const body: PlayedWith = await resp.json();
    await agent.close();
    return body;
  } catch (err) {
    await agent.close();
    throw err;
  }
}

export async function getPlayer(
  this: CSGOStatsGGScraper,
  anySteamId: string | bigint,
  filterParams?: PlayerFilterParams
): Promise<PlayerOutput> {
  const agent = (await this.handler.createAgent()) as Agent;
  try {
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
    const gotoResp = await agent.goto(resolvedUrl, this.timeout);

    // Check for page error
    const statusCode = await gotoResp.response.statusCode;
    if (statusCode !== 200) {
      throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
    }

    // TODO: Figure out elegant and readable way to this with destructuring and a Promise.all or something
    const steamProfileUrl = await agent.document.querySelector('.steam-icon').parentElement.href;
    this.debug(`steamProfileUrl: ${steamProfileUrl}`);
    let eseaUrl;
    try {
      eseaUrl = await agent.document.querySelector('.esea-icon').parentElement.href;
    } catch {
      eseaUrl = undefined;
    }
    this.debug(`eseaUrl: ${eseaUrl}`);
    const steamPictureUrl = await agent.document.querySelector(
      'img[src*="steamcdn"][width="120"][height="120"]'
    ).src;
    this.debug(`steamPictureUrl: ${steamPictureUrl}`);

    const currentRank = await parseRank(agent, `[width="92"]`);
    this.debug(`currentRank: ${currentRank}`);
    let bestRank = await parseRank(agent, `[height="24"]`);
    if (currentRank && !bestRank) bestRank = currentRank;
    this.debug(`bestRank: ${bestRank}`);

    const competitiveWins = await parseNumber(agent, parseInt, '#competitve-wins > span');
    this.debug(`competitiveWins: ${competitiveWins}`);

    const lastGameAndBanElem = agent.document.querySelector('#last-game');
    let lastGameString;
    try {
      lastGameString = (await lastGameAndBanElem.firstChild.textContent)?.trim() as string;
    } catch {
      lastGameString = undefined;
    }
    this.debug(`lastGameString: ${lastGameString}`);
    let lastGameDate: Date | undefined;
    if (lastGameString) {
      lastGameDate = parseCSGOStatsDate(lastGameString);
    }

    let banString;
    let banType: BanType | undefined;
    let banDate: Date | undefined;
    const lastGameChildElementCount = await lastGameAndBanElem.childElementCount;
    if (lastGameChildElementCount === 1) {
      banString = await lastGameAndBanElem.firstElementChild.innerText;
      // Overwatch Banned 97 days ago.
      // VAC Banned 83 days ago.
      banType = banString.startsWith('VAC') ? BanType.VAC : BanType.OVERWATCH;
      banDate = parseCSGOStatsDate(banString);
    }

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
      await agent.close();
      return {
        summary: {
          steamId64,
          steamProfileUrl,
          eseaUrl,
          steamPictureUrl,
          currentRank,
          bestRank,
          competitiveWins,
          lastGameDate,
          banType,
          banDate,
        },
      };
    }

    const killDeathRatio = (await parseNumber(agent, parseFloat, `#kpd > span`)) as number;
    this.debug(`killDeathRatio: ${killDeathRatio}`);
    const hltvRating = (await parseNumber(agent, parseFloat, `#rating > span`)) as number;
    this.debug(`hltvRating: ${hltvRating}`);
    const clutchSuccessRate = (await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    )) as number;
    this.debug(`clutchSuccessRate: ${clutchSuccessRate}`);

    const winRate = (await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`winRate: ${winRate}`);
    const headshotRate = (await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`headshotRate: ${headshotRate}`);
    const averageDamageRound = (await parseNumber(
      agent,
      parseInt,
      `#player-overview > div.stats-col-1 > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`averageDamageRound: ${averageDamageRound}`);
    const entrySuccessRate = (await parseNumber(
      agent,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    )) as number;
    this.debug(`entrySuccessRate: ${entrySuccessRate}`);

    const documentHtml = await agent.document.documentElement.innerHTML;
    const rawDataMatches = documentHtml.match(/raw_data = (\[.*?\]);\n/);
    let graphsRawData: GraphsRawData;
    if (rawDataMatches?.[1]) {
      graphsRawData = JSON.parse(rawDataMatches[1]);
    } else {
      graphsRawData = [];
    }

    this.debug(`graphsRawData.length: ${graphsRawData.length}`);

    await agent.close();
    return {
      summary: {
        steamId64,
        steamProfileUrl,
        eseaUrl,
        steamPictureUrl,
        currentRank,
        bestRank,
        competitiveWins,
        lastGameDate,
        banType,
        banDate,
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
  } catch (err) {
    await agent.close();
    throw err;
  }
}

export async function searchPlayer(
  this: CSGOStatsGGScraper,
  searchString: string,
  filterParams?: PlayerFilterParams
): Promise<PlayerOutput> {
  const agent = (await this.handler.createAgent()) as Agent;
  try {
    this.debug(`Going to ${HOMEPAGE}`);
    const gotoResp = await agent.goto(HOMEPAGE, this.timeout);

    // Cloudflare page will return a 403
    const statusCode = await gotoResp.response.statusCode;
    if (statusCode !== 200) {
      throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
    }

    await agent.activeTab.waitForLoad(LocationStatus.DomContentLoaded, { timeoutMs: this.timeout });
    await agent.interact(
      { click: agent.document.querySelector(`#search-input`) },
      { type: searchString },
      { keyPress: KeyboardKeys.Enter }
    );

    this.debug(`Waiting for location change`);
    await agent.activeTab.waitForLoad(LocationStatus.DomContentLoaded, { timeoutMs: this.timeout });

    const errorBanner = agent.document.querySelector(`div.alert.alert-danger`);
    let errorMessage;
    try {
      errorMessage = (await errorBanner.innerText).trim().replace(/\n/g, '');
    } catch {
      errorMessage = undefined;
    }
    if (errorMessage) throw new Error(errorMessage);

    // Check for 404
    const steamId64 = (await agent.document.location.pathname).split('/').at(-1) as string;
    this.debug(`steamId64: ${steamId64}`);
    await agent.close();
    return this.getPlayer(steamId64, filterParams);
  } catch (err) {
    await agent.close();
    throw err;
  }
}
