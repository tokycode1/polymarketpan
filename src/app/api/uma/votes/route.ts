import { NextRequest, NextResponse } from "next/server";
import { UmaPriceRequest, UmaVote, getVoteStatus } from "@/types/uma";
import { PolymarketMarket } from "@/types/market";

const GOLDSKY_GQL_API = "https://api.goldsky.com/api/public/project_clus2fndawbcc01w31192938i/subgraphs/mainnet-voting-v2/0.1.1/gn";
const GAMMA_API = "https://gamma-api.polymarket.com/markets";
const UMA_RESOLVE_API = "https://vote.uma.xyz/api/resolve-l2-ancillary-data";

// YES_OR_NO_QUERY identifier in hex
const YES_OR_NO_QUERY_HEX = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000";

// GraphQL query to fetch unresolved price requests
const PRICE_REQUESTS_QUERY = `
  {
    priceRequests(
      where: { isResolved: false }
      orderBy: resolvedPriceRequestIndex
      orderDirection: desc
    ) {
      identifier {
        id
      }
      price
      time
      ancillaryData
      resolvedPriceRequestIndex
      isGovernance
      rollCount
      latestRound {
        totalVotesRevealed
        minAgreementRequirement
        minParticipationRequirement
        totalTokensCommitted
        groups {
          price
          totalVoteAmount
        }
        committedVotes(first: 1000) {
          id
        }
        revealedVotes(first: 1000) {
          id
          voter {
            address
          }
          price
        }
      }
    }
  }
`;

// Decode hex string to text
function hexToText(hex: string): string {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  let text = "";
  for (let i = 0; i < cleanHex.length; i += 2) {
    const charCode = parseInt(cleanHex.substr(i, 2), 16);
    if (charCode > 0) {
      text += String.fromCharCode(charCode);
    }
  }
  return text;
}

// Parse ancillary text to extract market_id and other data
function parseAncillaryText(text: string) {
  let title = "";
  let description = "";
  let marketId: string | null = null;
  let resData: { p1: number; p2: number; p3: number } | null = null;
  let outcomes: { p1Label: string; p2Label: string; p3Label: string } | null = null;

  const titleMatch = text.match(/q:\s*title:\s*([^,]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const descMatch = text.match(/description:\s*([\s\S]*?)(?:market_id:|res_data:|initializer:|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  const marketIdMatch = text.match(/market_id:\s*(\d+)/i);
  if (marketIdMatch) {
    marketId = marketIdMatch[1];
  }

  const resDataMatch = text.match(/res_data:\s*p1:\s*([\d.]+),\s*p2:\s*([\d.]+),\s*p3:\s*([\d.]+)/i);
  if (resDataMatch) {
    resData = {
      p1: parseFloat(resDataMatch[1]),
      p2: parseFloat(resDataMatch[2]),
      p3: parseFloat(resDataMatch[3]),
    };
  }

  const outcomesMatch = text.match(/p1\s+corresponds\s+to\s+(\w+)[^p]*p2\s+to\s+(\w+)[^p]*p3\s+to\s+([\w\-\/]+)/i);
  if (outcomesMatch) {
    outcomes = {
      p1Label: outcomesMatch[1],
      p2Label: outcomesMatch[2],
      p3Label: outcomesMatch[3].replace(/\//g, " / "),
    };
  }

  return { title, description, marketId, resData, outcomes };
}

// Fetch and resolve ancillary data
async function resolveAncillaryData(time: string, ancillaryData: string): Promise<{
  title: string;
  description: string;
  marketId: string | null;
  resData: { p1: number; p2: number; p3: number } | null;
  outcomes: { p1Label: string; p2Label: string; p3Label: string } | null;
  resolvedAncillaryDataHex: string | null;
} | null> {
  try {
    const url = new URL(UMA_RESOLVE_API);
    url.searchParams.set("identifier", YES_OR_NO_QUERY_HEX);
    url.searchParams.set("time", time);
    url.searchParams.set("ancillaryData", ancillaryData);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://vote.uma.xyz/",
      },
    });

    if (!res.ok) {
      console.error(`Failed to resolve ancillary data for time ${time}`);
      return null;
    }

    const data = await res.json();
    const resolvedAncillaryDataHex = data.resolvedAncillaryData;
    const decodedText = hexToText(resolvedAncillaryDataHex);
    const parsed = parseAncillaryText(decodedText);
    return { ...parsed, resolvedAncillaryDataHex };
  } catch (error) {
    console.error("Error resolving ancillary data:", error);
    return null;
  }
}

// Fetch market data from Polymarket
async function fetchMarketById(marketId: string): Promise<PolymarketMarket | null> {
  try {
    const res = await fetch(`${GAMMA_API}?id=${marketId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch market ${marketId}`);
      return null;
    }

    const markets = await res.json();
    return markets.length > 0 ? markets[0] : null;
  } catch (error) {
    console.error("Error fetching market:", error);
    return null;
  }
}

// Fetch price requests from UMA GraphQL
async function fetchPriceRequests(): Promise<UmaPriceRequest[]> {
  const res = await fetch(GOLDSKY_GQL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Referer": "https://vote.uma.xyz/",
    },
    body: JSON.stringify({ query: PRICE_REQUESTS_QUERY }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const result = await res.json();
  return result.data?.priceRequests || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("includeAll") === "true";
    const statusFilter = searchParams.get("status"); // upcoming, committing, revealing

    // Fetch all unresolved price requests
    const priceRequests = await fetchPriceRequests();

    // Filter only YES_OR_NO_QUERY requests (Polymarket uses this)
    const polymarketRequests = priceRequests.filter(
      (pr) => pr.identifier.id === "YES_OR_NO_QUERY"
    );

    // Filter based on groups (only revealing votes by default)
    let filteredRequests = includeAll
      ? polymarketRequests
      : polymarketRequests.filter(
          (pr) => pr.latestRound.groups && pr.latestRound.groups.length > 0
        );

    // Apply status filter if provided
    if (statusFilter) {
      filteredRequests = filteredRequests.filter((pr) => {
        const status = getVoteStatus(pr.latestRound);
        return status === statusFilter;
      });
    }

    // Process each request to get full data
    const votes: UmaVote[] = await Promise.all(
      filteredRequests.map(async (pr) => {
        const status = getVoteStatus(pr.latestRound);
        
        // Create base vote object
        const vote: UmaVote = {
          identifier: pr.identifier.id,
          time: pr.time,
          ancillaryData: pr.ancillaryData,
          rollCount: pr.rollCount,
          latestRound: pr.latestRound,
          status,
        };

        // Resolve ancillary data to get market_id
        const resolved = await resolveAncillaryData(pr.time, pr.ancillaryData);
        if (resolved) {
          vote.resolvedData = {
            title: resolved.title,
            description: resolved.description,
            marketId: resolved.marketId || "",
            resData: resolved.resData || { p1: 0, p2: 1, p3: 0.5 },
            outcomes: resolved.outcomes || undefined,
            resolvedAncillaryDataHex: resolved.resolvedAncillaryDataHex || undefined,
          };

          // Fetch market data if we have a market_id
          if (resolved.marketId) {
            const market = await fetchMarketById(resolved.marketId);
            if (market) {
              vote.market = market;
            }
          }
        }

        return vote;
      })
    );

    // Sort by time descending (newest first)
    votes.sort((a, b) => parseInt(b.time) - parseInt(a.time));

    // Deduplicate by market ID - keep only the latest (first after sort) for each market
    const seenMarketIds = new Set<string>();
    const deduplicatedVotes = votes.filter((vote) => {
      const marketId = vote.resolvedData?.marketId;
      if (!marketId) {
        // Keep votes without market ID (shouldn't happen but be safe)
        return true;
      }
      if (seenMarketIds.has(marketId)) {
        // Skip duplicate - we already have a newer one
        return false;
      }
      seenMarketIds.add(marketId);
      return true;
    });

    return NextResponse.json({
      data: deduplicatedVotes,
      total: deduplicatedVotes.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching UMA votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch UMA votes" },
      { status: 500 }
    );
  }
}
