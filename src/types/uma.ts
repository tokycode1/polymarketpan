import { PolymarketMarket, OrderBookData } from "./market";

// Vote status based on latestRound data
export type VoteStatus = "upcoming" | "committing" | "revealing" | "resolved";

// Vote group (price option)
export interface VoteGroup {
  price: string; // "0" = p1, "1000000000000000000" = p2, "500000000000000000" = p3
  totalVoteAmount: string;
  label?: string; // Parsed label like "Yes", "No", "50-50"
}

// Committed vote entry
export interface CommittedVote {
  id: string;
}

// Revealed vote entry
export interface RevealedVote {
  id: string;
  voter: {
    address: string;
  };
  price: string;
}

// Latest round data from UMA
export interface LatestRound {
  totalVotesRevealed: string;
  totalTokensCommitted: string;
  minAgreementRequirement: string | null;
  minParticipationRequirement: string | null;
  groups: VoteGroup[];
  committedVotes: CommittedVote[];
  revealedVotes: RevealedVote[];
}

// Raw price request from UMA GraphQL
export interface UmaPriceRequest {
  identifier: {
    id: string;
  };
  price: string | null;
  time: string;
  ancillaryData: string;
  resolvedPriceRequestIndex: string | null;
  isGovernance: boolean;
  rollCount: string;
  latestRound: LatestRound;
}

// Parsed resolution data from ancillaryData
export interface ResolvedData {
  title: string;
  description: string;
  marketId: string;
  resData: {
    p1: number; // Usually "No" or first outcome
    p2: number; // Usually "Yes" or second outcome
    p3: number; // Usually "50-50" or unknown
  };
  outcomes?: {
    p1Label: string;
    p2Label: string;
    p3Label: string;
  };
  // Raw resolved ancillary data hex (needed for augment-request API)
  resolvedAncillaryDataHex?: string;
}

// Augment request data from UMA
export interface AugmentData {
  time: number;
  uniqueKey: string;
  identifier: string;
  ooRequestUrl: string;
  proposedPrice: string;
  originatingChainTxHash: string;
  originatingChainId: number;
  originatingOracleType: string;
  // Transformed URL for Polymarket Oracle page
  polymarketOracleUrl?: string;
}

// Full UMA vote with all associated data
export interface UmaVote {
  // Raw data
  identifier: string;
  time: string;
  ancillaryData: string;
  rollCount: string;
  latestRound: LatestRound;
  
  // Computed status
  status: VoteStatus;
  
  // Resolved ancillary data
  resolvedData?: ResolvedData;
  
  // Associated Polymarket market
  market?: PolymarketMarket;
  
  // Augment request data
  augmentData?: AugmentData;
  
  // Order book data (loaded on demand)
  orderBook?: OrderBookData;
}

// API response for resolve-l2-ancillary-data
export interface ResolveAncillaryResponse {
  resolvedAncillaryData: string;
}

// API response for augment-request-gql
export interface AugmentRequestResponse {
  time: number;
  uniqueKey: string;
  identifier: string;
  ooRequestUrl: string;
  proposedPrice: string;
  originatingChainTxHash: string;
  originatingChainId: number;
  originatingOracleType: string;
}

// Vote statistics for display
export interface VoteStatistics {
  totalCommitted: number;
  totalRevealed: number;
  minParticipation: number | null;
  minAgreement: number | null;
  participationRate: number | null;
  leadingOption: VoteGroup | null;
  leadingPercentage: number | null;
}

// Price constants for vote options
export const VOTE_PRICES = {
  P1: "0", // Usually No/Under
  P2: "1000000000000000000", // Usually Yes/Over (1e18)
  P3: "500000000000000000", // 50-50/Unknown (0.5e18)
} as const;

// Helper to get label for a price
export function getPriceLabel(
  price: string,
  outcomes?: { p1Label: string; p2Label: string; p3Label: string }
): string {
  if (price === VOTE_PRICES.P1) {
    return outcomes?.p1Label || "No / p1";
  }
  if (price === VOTE_PRICES.P2) {
    return outcomes?.p2Label || "Yes / p2";
  }
  if (price === VOTE_PRICES.P3) {
    return outcomes?.p3Label || "50-50 / p3";
  }
  return `Unknown (${price})`;
}

// Helper to determine vote status
export function getVoteStatus(latestRound: LatestRound): VoteStatus {
  const hasGroups = latestRound.groups && latestRound.groups.length > 0;
  const hasCommits = latestRound.committedVotes && latestRound.committedVotes.length > 0;
  const hasReveals = latestRound.revealedVotes && latestRound.revealedVotes.length > 0;
  
  if (hasGroups || hasReveals) {
    return "revealing";
  }
  if (hasCommits) {
    return "committing";
  }
  return "upcoming";
}

// Helper to calculate vote statistics
export function calculateVoteStats(latestRound: LatestRound): VoteStatistics {
  const totalCommitted = parseFloat(latestRound.totalTokensCommitted) || 0;
  const totalRevealed = parseFloat(latestRound.totalVotesRevealed) || 0;
  const minParticipation = latestRound.minParticipationRequirement
    ? parseFloat(latestRound.minParticipationRequirement)
    : null;
  const minAgreement = latestRound.minAgreementRequirement
    ? parseFloat(latestRound.minAgreementRequirement)
    : null;

  const participationRate =
    minParticipation && minParticipation > 0
      ? (totalRevealed / minParticipation) * 100
      : null;

  let leadingOption: VoteGroup | null = null;
  let leadingPercentage: number | null = null;

  if (latestRound.groups && latestRound.groups.length > 0) {
    leadingOption = latestRound.groups.reduce((max, g) =>
      parseFloat(g.totalVoteAmount) > parseFloat(max.totalVoteAmount) ? g : max
    );
    
    const totalVotes = latestRound.groups.reduce(
      (sum, g) => sum + parseFloat(g.totalVoteAmount),
      0
    );
    
    if (totalVotes > 0 && leadingOption) {
      leadingPercentage = (parseFloat(leadingOption.totalVoteAmount) / totalVotes) * 100;
    }
  }

  return {
    totalCommitted,
    totalRevealed,
    minParticipation,
    minAgreement,
    participationRate,
    leadingOption,
    leadingPercentage,
  };
}
