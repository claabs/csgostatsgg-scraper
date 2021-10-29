/* eslint-disable camelcase */
import { IAgentCreateOptions, IConnectionToCoreOptions } from 'secret-agent';

export interface PlayerOptions {
  handlerOverrides?: IConnectionToCoreOptions;
  agentOverrides?: IAgentCreateOptions;
}

export enum MatchType {
  COMPETITIVE = 'comp',
  SCRIMMAGE = 'scrimmage',
}

export interface PlayedWithPlayerDetails {
  name: string;
  avatar: string;
  is_banned: number;
  vac_banned: number;
  banned_date: string;
}

export interface PlayedWithStats {
  last_played: string;
  games: number;
  win: number;
  lose: null;
  draw: null;
  rounds: string;
  K: string;
  D: string;
  A: string;
  dmg: string;
  rating: string;
  HS: string;
  FK_T: string;
  FK_CT: string;
  FD_T: string;
  FD_CT: string;
  '5k': string;
  '4k': string;
  '3k': string;
  '2k': string;
  '1k': string;
  '1v1': string;
  '1v2': string;
  '1v3': string;
  '1v4': string;
  '1v5': string;
  '1v1_lost': string;
  '1v2_lost': string;
  '1v3_lost': string;
  '1v4_lost': string;
  '1v5_lost': string;
}

export interface Player {
  steam_id: string;
  stats: PlayedWithStats;
  vs: PlayedWithStats;
  details: PlayedWithPlayerDetails;
}

export interface PlayedWith {
  players: Player[];
  vac: string;
  offset: number;
}

export interface PlayedWithFilterParams {
  /**
   * Whether to exclusively include VAC or game (Overwatch) banned players
   * @default 0
   */
  vac?: boolean;

  /**
   * Which page to start at. 0 = first page of 100, 1 = second page of 100
   * @default 0
   */
  offset?: number;

  /**
   * The type of match to include
   * @default MatchType.COMPETITIVE
   */
  mode?: MatchType;

  startDate?: Date;
  endDate?: Date;

  /**
   * The property to descendingly order by
   * @default games
   */
  order?: string; // TODO: enum?

  /**
   * @default csgo
   */
  source?: 'csgo'; // TODO: enum?
}

export interface GraphsRawDatum {
  K: number;
  D: number;
  HS: number;
  dmg: number;
  rating: number;
  team1_score: number;
  team2_score: number;
  winner: number;
  team: number;
  date: string;
  id: number;
  WR: number;
  '1vX_won': number;
  '1vX_lost': number;
  '1vX': number;
  rank: number;
}

export type GraphsRawData = GraphsRawDatum[];

export enum MatchmakingRank {
  SILVER_I = 1,
  SILVER_II = 2,
  SILVER_III = 3,
  SILVER_IV = 4,
  SILVER_ELITE = 5,
  SILVER_ELITE_MASTER = 6,
  GOLD_NOVA_I = 7,
  GOLD_NOVA_II = 8,
  GOLD_NOVA_III = 9,
  GOLD_NOVA_MASTER = 10,
  MASTER_GUARDIAN_I = 11,
  MASTER_GUARDIAN_II = 12,
  MASTER_GUARDIAN_ELITE = 13,
  DISTINGUISHED_MASTER_GUARDIAN = 14,
  LEGENDARY_EAGLE = 15,
  LEGENDARY_EAGLE_MASTER = 16,
  SUPREME_MASTER_FIRST_CLASS = 17,
  GLOBAL_ELITE = 18,
}

export interface PlayerSummary {
  steamId64: string;
  steamProfileUrl: string;
  steamPictureUrl: string;
  currentRank: MatchmakingRank;
  bestRank: MatchmakingRank;
  competitiveWins: MatchmakingRank;
}

export interface PlayerStats {
  killDeathRatio: number;
  hltvRating: number;
  clutchSuccessRate: number;
  winRate: number;
  headshotRate: number;
  averageDamageRound: number;
  entrySuccessRate: number;
}

export interface PlayerGraphs {
  rawData: GraphsRawData;
}

export interface PlayerOutput {
  summary: PlayerSummary;
  stats?: PlayerStats;
  graphs?: PlayerGraphs;
  // weapons: undefined;
  // maps: undefined;
  // matches: undefined;
  playedWith?: () => Promise<PlayedWith>;
}

export interface PlayerFilterParams {
  matchType?: MatchType;
  maps?: string[];
  startDate?: Date;
  endDate?: Date;
}
