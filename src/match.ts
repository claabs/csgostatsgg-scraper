import { Agent } from 'secret-agent';
import { URLSearchParams } from 'url';
import * as chrono from 'chrono-node';
import { HOMEPAGE } from './constants';
import { CSGOStatsGGScraper, MatchmakingRank } from './index';
import {
  eseaIconMap,
  ESEARank,
  faceitIconMap,
  FaceItRank,
  MatchMakingService,
  MatchOutput,
  MatchSummary,
  UploadMatchResponse,
} from './match-types';

export interface ETCCookie {
  domain: string;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: 'no_restriction' | 'unspecified';
  secure: boolean;
  session: boolean;
  storeId: string;
  value: string;
  id: number;
  expirationDate?: number;
}

function getMMService(mmServiceIconPath: string): MatchMakingService {
  let matchmakingService: MatchMakingService;
  if (mmServiceIconPath.includes('esea')) {
    matchmakingService = MatchMakingService.ESEA;
  } else if (mmServiceIconPath.includes('faceit')) {
    matchmakingService = MatchMakingService.FACE_IT;
  } else {
    matchmakingService = MatchMakingService.MM;
  }
  return matchmakingService;
}

function getAverageRank(
  avgRankIconUrl?: string
): MatchmakingRank | FaceItRank | ESEARank | undefined {
  if (!avgRankIconUrl) return undefined;
  const rankUrlPrefix = 'https://static.csgostats.gg/images/ranks/';
  const faceitRankUrlPrefix = `${rankUrlPrefix}faceit/`;
  const eseaRankUrlPrefix = `${rankUrlPrefix}esea/`;
  const rankImgUrlExt = '.png';
  let averageRank: MatchmakingRank | FaceItRank | ESEARank;
  if (avgRankIconUrl.includes('esea')) {
    const iconName = avgRankIconUrl.substring(
      eseaRankUrlPrefix.length,
      avgRankIconUrl.indexOf(rankImgUrlExt)
    );
    averageRank = eseaIconMap[iconName];
  } else if (avgRankIconUrl.includes('faceit')) {
    const iconName = avgRankIconUrl.substring(
      faceitRankUrlPrefix.length,
      avgRankIconUrl.indexOf(rankImgUrlExt)
    );
    averageRank = faceitIconMap[iconName];
  } else {
    averageRank = parseInt(
      avgRankIconUrl.substring(rankUrlPrefix.length, avgRankIconUrl.indexOf(rankImgUrlExt)),
      10
    ) as MatchmakingRank;
  }
  return averageRank;
}

export async function getMatch(this: CSGOStatsGGScraper, matchId: number): Promise<MatchOutput> {
  const agent = (await this.handler.createAgent()) as Agent;

  const resolvedUrl = `${HOMEPAGE}/match/${matchId}`;

  this.debug(`Navigating to ${resolvedUrl}`);
  const gotoResp = await agent.goto(resolvedUrl);

  // Check for page error
  const statusCode = await gotoResp.response.statusCode;
  if (statusCode !== 200) {
    throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
  }

  // TODO: Figure out elegant and readable way to this with destructuring and a Promise.all or something
  const mmServiceIconPath = await agent.document.querySelector(
    '#match-main > div > div.main-header > div.main-content > div:nth-child(1) > div > img'
  ).src;
  const matchmakingService = getMMService(mmServiceIconPath);
  this.debug(`Got matchmakingService: ${matchmakingService}`);

  let avgRankIconUrl: string | undefined;
  try {
    avgRankIconUrl = await agent.document.querySelector(
      `span > img[src^="https://static.csgostats.gg/images/ranks/"]`
    ).src;
  } catch {
    avgRankIconUrl = undefined;
  }

  const averageRank = getAverageRank(avgRankIconUrl);

  this.debug(`Got averageRank: ${averageRank}`);

  const map = await agent.document.querySelector('.map-text').innerText;
  this.debug(`Got map: ${map}`);

  let serverLocation;
  try {
    serverLocation = await agent.document.querySelector('.server-loc-text').innerText;
  } catch {
    serverLocation = undefined;
  }
  this.debug(`Got serverLocation: ${serverLocation}`);

  const dateText = await agent.document.querySelector('.match-date-text').innerText;
  const date = chrono.parseDate(dateText, { timezone: 'UTC' });
  this.debug(`Got date: ${date}`);

  let watchUrl;
  try {
    watchUrl = await agent.document.querySelector('.match-watch > a').href;
  } catch {
    watchUrl = undefined;
  }

  let watchDaysText;
  try {
    watchDaysText = await agent.document.querySelector('.match-watch-days').innerText;
  } catch {
    watchDaysText = undefined;
  }
  const watchDaysNumberText = watchDaysText?.match(/\((\d+).*\)/)?.[1];
  const demoWatchDays = watchDaysNumberText ? parseInt(watchDaysNumberText, 10) : undefined;

  const hasBannedPlayer = (await agent.document.querySelectorAll('.has-banned').length) > 0;

  //   const team1Name = await agent.document.querySelector(
  //     '#team-1-outer > div:nth-child(2) > div:nth-child(1)'
  //   ).innerText;
  //   const team2Name = await agent.document.querySelector(
  //     '#team-2-outer > div:nth-child(2) > div:nth-child(1)'
  //   ).innerText;

  await agent.close();
  return {
    matchmakingService,
    averageRank,
    map,
    serverLocation,
    date,
    watchUrl,
    demoWatchDays,
    hasBannedPlayer,
  };
}

export async function searchMatch(
  this: CSGOStatsGGScraper,
  shareCode: string
): Promise<MatchOutput> {
  const agent = (await this.handler.createAgent()) as Agent;
  this.debug(`Going to ${HOMEPAGE}`);
  await agent.goto(HOMEPAGE);

  const requestBody = new URLSearchParams({
    sharecode: shareCode,
    index: '0',
  }).toString();
  const ajaxUrl = `https://csgostats.gg/match/upload/ajax`;
  this.debug(`requestBody: ${requestBody}`);
  const resp = await agent.fetch(ajaxUrl, {
    method: 'post',
    body: requestBody,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  if (!(await resp.ok)) throw new Error(`Failed to find match: ${await resp.statusText}`);
  const body: UploadMatchResponse = await resp.json();
  this.debug(`Upload match response: ${JSON.stringify(body)}`);

  if (body.data.msg !== 'Complete') throw new Error('Match not parsed yet!');

  const matchId = body.data.demo_id;
  this.debug(`matchId: ${matchId}`);

  await agent.close();
  return this.getMatch(matchId);
}

export async function listLatestMatches(this: CSGOStatsGGScraper): Promise<MatchSummary[]> {
  const agent = (await this.handler.createAgent()) as Agent;
  const resolvedUrl = `${HOMEPAGE}/match`;

  this.debug(`Navigating to ${resolvedUrl}`);
  const gotoResp = await agent.goto(resolvedUrl);

  // Check for page error
  const statusCode = await gotoResp.response.statusCode;
  if (statusCode !== 200) {
    throw new Error(`csgostats.gg returned a non-200 response: ${statusCode}`);
  }

  const matchRows = await agent.document.querySelectorAll('.p-row').values();
  this.debug(`Parsing all match rows`);
  const matchSummaries: MatchSummary[] = await Promise.all(
    Array.from(matchRows).map(async (row): Promise<MatchSummary> => {
      // const onClickAttr = await row.attributes.getNamedItem('onclick'); // Doesn't work for some reason
      const onClickAttr = Array.from(await row.attributes)[2]; // await is required here
      let matchId = 0;
      if (onClickAttr) {
        const matchIdString = (await onClickAttr.value).match(/\/match\/(\d+)/)?.[1];
        matchId = matchIdString ? parseInt(matchIdString, 10) : matchId;
      }

      const mmServiceIconPath = await row.children.item(0).querySelector('img').src;
      const matchmakingService = getMMService(mmServiceIconPath);

      let avgRankIconUrl: string | undefined;
      try {
        avgRankIconUrl = await row.children.item(1).querySelector('img').src;
      } catch {
        avgRankIconUrl = undefined;
      }
      const averageRank = getAverageRank(avgRankIconUrl);

      const dateText = await row.children.item(2).innerText;
      const date = chrono.parseDate(dateText, { timezone: 'UTC' });

      return { matchId, matchmakingService, averageRank, date };
    })
  );

  await agent.close();
  return matchSummaries;
}
