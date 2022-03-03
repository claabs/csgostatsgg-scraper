import { BanType, MatchmakingRank } from './player-types';

export interface UploadMatchData {
  msg: string;
  index: string;
  sharecode: string;
  queue_id: number;
  demo_id: number;
  url: string;
}

export interface UploadMatchResponse {
  status: string;
  data: UploadMatchData;
  error: number;
}

export enum MatchTeamSide {
  TEAM_1 = 1,
  TEAM_2 = 2,
}

export interface MatchTeam {
  name: string;
  score: number;
  won: boolean;
}

export interface MatchPlayer {
  steamId64: string;
  nickname: string;
  banType?: BanType;
  rank: MatchmakingRank;
  team: MatchTeam;
}

export enum MatchMakingService {
  MM = 'Official Matchmaking',
  FACE_IT = 'FaceIt',
  ESEA = 'ESEA',
}

export enum FaceItRank {
  LEVEL_1 = 'Level 1',
  LEVEL_2 = 'Level 2',
  LEVEL_3 = 'Level 3',
  LEVEL_4 = 'Level 4',
  LEVEL_5 = 'Level 5',
  LEVEL_6 = 'Level 6',
  LEVEL_7 = 'Level 7',
  LEVEL_8 = 'Level 8',
  LEVEL_9 = 'Level 9',
  LEVEL_10 = 'Level 10',
}

export const faceitIconMap: Record<string, FaceItRank> = {
  level1: FaceItRank.LEVEL_1,
  level2: FaceItRank.LEVEL_2,
  level3: FaceItRank.LEVEL_3,
  level4: FaceItRank.LEVEL_4,
  level5: FaceItRank.LEVEL_5,
  level6: FaceItRank.LEVEL_6,
  level7: FaceItRank.LEVEL_7,
  level8: FaceItRank.LEVEL_8,
  level9: FaceItRank.LEVEL_9,
  level10: FaceItRank.LEVEL_10,
};

export enum ESEARank {
  D_MINUS = 'D-',
  D = 'D',
  D_PLUS = 'D+',
  C_MINUS = 'C-',
  C = 'C',
  C_PLUS = 'C+',
  B_MINUS = 'B-',
  B = 'B',
  B_PLUS = 'B+',
  A_MINUS = 'A-',
  A = 'A',
  A_PLUS = 'A+',
  RANK_G = 'Rank G',
  RANK_S = 'Rank S',
}

export const eseaIconMap: Record<string, ESEARank> = {
  dminus: ESEARank.D_MINUS,
  d: ESEARank.D,
  dplus: ESEARank.D_PLUS,
  cminus: ESEARank.C_MINUS,
  c: ESEARank.C,
  cplus: ESEARank.C_PLUS,
  bminus: ESEARank.B_MINUS,
  b: ESEARank.B,
  bplus: ESEARank.B_PLUS,
  aminus: ESEARank.A_MINUS,
  a: ESEARank.A,
  aplus: ESEARank.A_PLUS,
  g: ESEARank.RANK_G,
  s: ESEARank.RANK_S,
};

export interface MatchOutput {
  matchmakingService: MatchMakingService;
  averageRank?: MatchmakingRank | FaceItRank | ESEARank;
  map: string;
  serverLocation?: string;
  date: Date;
  watchUrl?: string;
  demoWatchDays?: number;
  hasBannedPlayer?: boolean;
  //   players: MatchPlayer[];
  //   team1: MatchTeam;
  //   team2: MatchTeam;
}

export interface MatchSummary {
  matchId: number;
  matchmakingService: MatchMakingService;
  averageRank?: MatchmakingRank | FaceItRank | ESEARank;
  date: Date;
}
