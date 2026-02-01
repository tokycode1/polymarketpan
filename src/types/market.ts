export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  commentCount: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  startDate: string;
  liquidity: string;
  image: string;
  icon: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  active: boolean;
  closed: boolean;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  liquidityNum: number;
  volumeNum: number;
  lastTradePrice: number;
  bestBid: number;
  bestAsk: number;
  oneDayPriceChange: number;
  oneWeekPriceChange: number;
  oneMonthPriceChange: number;
  spread: number;
  groupItemTitle: string;
  events: PolymarketEvent[];
  negRisk: boolean;
  negRiskMarketID: string;
}

export interface FilterState {
  minPrice: number;
  maxPrice: number;
  minLiquidity: number;
  maxLiquidity: number;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
  minVolume24h: number;
  maxVolume24h: number;
  search: string;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
}

export type SortField =
  | "lastTradePrice"
  | "liquidity"
  | "volume24hr"
  | "volume"
  | "endDate"
  | "startDate";

export interface PaginatedResponse {
  data: PolymarketMarket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
