import { URLSearchParams } from 'url';
import SteamID from 'steamid';
import * as chrono from 'chrono-node';
import Hero, { KeyboardKey, LocationStatus } from '@ulixee/hero';
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
  hero: Omit<Hero, 'then'>,
  parseFunc: typeof parseInt | typeof parseFloat,
  selector: string
): Promise<number | undefined> {
  const elem = hero.document.querySelector(selector);
  if (!(await elem.$exists)) return undefined;
  return parseFunc(await elem.innerText, 10);
}

async function parseRank(
  hero: Omit<Hero, 'then'>,
  index: number
): Promise<MatchmakingRank | undefined> {
  // I don't think that this is the best use of ESL's resources, but you do you.
  const rankImgElems = await hero.document.querySelectorAll(`.player-ranks *[class*='p-'][style*='display:block;']`);
  if(index >= await rankImgElems.length) return undefined;
  const rankImgElem = await rankImgElems.item(index);
  let rankImgUrl: string | undefined;
  const computedStyle = await hero.getComputedStyle(rankImgElem);
  rankImgUrl = await computedStyle.getPropertyValue('background-image');

  if (!rankImgUrl) return undefined;
  const rank = rankImgUrl.match(/static\.csgostats\.gg\/images\/ranks\/(\d+)\.png/)?.[1];
  if (!rank) return undefined;
  return parseInt(rank, 10);
}

function parseCSGOStatsDate(dateString: string): Date {
  // Last Game Sun, 9th May
  // Last Game Sat 26th Feb 22
  // Last Game 2 days ago
  // Last Game 25 minutes ago
  // Overwatch Banned 97 days ago.
  const resolvedDate = chrono.parseDate(dateString);
  // Chrono doesn't detect the trailing 2-digit year, so we have to detect it and append it manually
  const [, endYear] = dateString.match(/^.*?.*? (\d{2})$/) || [];
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
  const hero = await this.createHero();
  try {
    await hero.goto(HOMEPAGE, { timeoutMs: this.timeout });
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
    const resp = await hero.fetch(ajaxUrl, { method: 'get' });
    if (!(await resp.ok))
      throw new Error(`Failed to get playedWith data: ${await resp.statusText}`);
    const body: PlayedWith = await resp.json();
    await hero.close();
    return body;
  } catch (err) {
    await hero.close();
    throw err;
  }
}

export async function getPlayer(
  this: CSGOStatsGGScraper,
  anySteamId: string | bigint,
  filterParams?: PlayerFilterParams
): Promise<PlayerOutput> {
  const hero = await this.createHero();
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
    const gotoResp = await hero.goto(resolvedUrl, { timeoutMs: this.timeout });

    // Check for page error
    const { statusCode } = gotoResp.response;
    if (statusCode !== 200) {
      throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
    }

    // TODO: Figure out elegant and readable way to this with destructuring and a Promise.all or something
    const steamProfileUrl = await hero.document.querySelector('.steam-icon').parentElement.href;
    this.debug(`steamProfileUrl: ${steamProfileUrl}`);
    const eseaElem = hero.document.querySelector('.main-container .player-ident-outer a[href*="play.esea"][style="float:left; display:block;"]');
    let eseaUrl: string | undefined;
    if (await eseaElem.$exists) eseaUrl = await eseaElem.href;

    this.debug(`eseaUrl: ${eseaUrl}`);
    // https://avatars.akamai.steamstatic.com/d41ec69cf1f3546819950fc3a8d3096c18d7e42d_full.jpg
    // https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/88/883f2697f5b2dc4affda2d47eedc1cbec8cfb657_full.jpg
    // It's honestly hilarious seeing the 1px changes constantly :)
    const steamPictureUrl = await hero.document.querySelector(
      '.main-container .player-ident-outer img[src*="akamai"]'
    ).src;
    this.debug(`steamPictureUrl: ${steamPictureUrl}`);

    const currentRank = await parseRank(hero, 0);
    this.debug(`currentRank: ${currentRank}`);
    let bestRank = await parseRank(hero, 1);
    if (currentRank && !bestRank) bestRank = currentRank;
    this.debug(`bestRank: ${bestRank}`);

    const competitiveWins = await parseNumber(hero, parseInt, '#competitve-wins > span');
    this.debug(`competitiveWins: ${competitiveWins}`);

    const lastGameAndBanElem = hero.document.querySelector('#last-game');
    let lastGameString: string | undefined;
    if ((await lastGameAndBanElem.$exists) && (await lastGameAndBanElem.firstChild.$exists)) {
      lastGameString = (await lastGameAndBanElem.firstChild.textContent)?.trim() as string;
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
    const noMatchesMessage = hero.document.querySelector(
      '#player-outer-section > div[style*="padding"] > div > span'
    );
    let errorMessage: string | undefined;
    if (await noMatchesMessage.$exists) {
      errorMessage = await noMatchesMessage.innerText;
    }

    if (errorMessage) {
      this.debug(errorMessage);
      await hero.close();
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

    const killDeathRatio = (await parseNumber(hero, parseFloat, `#kpd > span`)) as number;
    this.debug(`killDeathRatio: ${killDeathRatio}`);
    const hltvRating = (await parseNumber(hero, parseFloat, `#rating > span`)) as number;
    this.debug(`hltvRating: ${hltvRating}`);
    const clutchSuccessRate = (await parseNumber(
      hero,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    )) as number;
    this.debug(`clutchSuccessRate: ${clutchSuccessRate}`);

    const winRate = (await parseNumber(
      hero,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`winRate: ${winRate}`);
    const headshotRate = (await parseNumber(
      hero,
      parsePercent,
      `#player-overview > div.stats-col-1 > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`headshotRate: ${headshotRate}`);
    const averageDamageRound = (await parseNumber(
      hero,
      parseInt,
      `#player-overview > div.stats-col-1 > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(2)`
    )) as number;
    this.debug(`averageDamageRound: ${averageDamageRound}`);
    const entrySuccessRate = (await parseNumber(
      hero,
      parsePercent,
      `#player-overview > div.stats-col-2 > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > span:nth-child(2)`
    )) as number;
    this.debug(`entrySuccessRate: ${entrySuccessRate}`);

    const documentHtml = await hero.document.documentElement.innerHTML;
    const rawDataMatches = documentHtml.match(/raw_data = (\[.*?\]);\n/);
    let graphsRawData: GraphsRawData;
    if (rawDataMatches?.[1]) {
      graphsRawData = JSON.parse(rawDataMatches[1]);
    } else {
      graphsRawData = [];
    }

    this.debug(`graphsRawData.length: ${graphsRawData.length}`);

    await hero.close();
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
    await hero.close();
    throw err;
  }
}

export async function searchPlayer(
  this: CSGOStatsGGScraper,
  searchString: string,
  filterParams?: PlayerFilterParams
): Promise<PlayerOutput> {
  const hero = await this.createHero();
  try {
    this.debug(`Going to ${HOMEPAGE}`);
    const gotoResp = await hero.goto(HOMEPAGE, { timeoutMs: this.timeout });

    // Cloudflare page will return a 403
    const { statusCode } = gotoResp.response;
    if (statusCode !== 200) {
      throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
    }

    await hero.activeTab.waitForLoad(LocationStatus.DomContentLoaded, { timeoutMs: this.timeout });
    await hero.interact(
      { click: hero.document.querySelector(`#search-input`) },
      { type: searchString },
      { keyPress: KeyboardKey.Enter }
    );

    this.debug(`Waiting for location change`);
    await hero.activeTab.waitForLoad(LocationStatus.DomContentLoaded, { timeoutMs: this.timeout });

    const errorBanner = hero.document.querySelector(`div.alert.alert-danger`);
    let errorMessage: string | undefined;
    if (await errorBanner.$exists) {
      errorMessage = (await errorBanner.innerText).trim().replace(/\n/g, '');
    }

    if (errorMessage) throw new Error(errorMessage);

    // Check for 404
    const steamId64 = (await hero.document.location.pathname).split('/').at(-1) as string;
    this.debug(`steamId64: ${steamId64}`);
    await hero.close();
    return this.getPlayer(steamId64, filterParams);
  } catch (err) {
    await hero.close();
    throw err;
  }
}
