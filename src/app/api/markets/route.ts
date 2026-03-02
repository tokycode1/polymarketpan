import { NextRequest, NextResponse } from "next/server";
import { PolymarketMarket } from "@/types/market";

const GAMMA_API = "https://gamma-api.polymarket.com/markets";
const GAMMA_EVENTS_API = "https://gamma-api.polymarket.com/events";

const CATEGORY_PRIORITY: Record<string, number> = {
  "other": 0,
  "mentions": 1,
  "culture": 2,
  "climate-science": 3,
  "tech": 4,
  "sports": 5,
  "economy": 6,
  "finance": 7,
  "crypto": 8,
  "politics": 9,
};

const eventCategoryCache = new Map<string, { category: string; ts: number }>();
const inflightCategoryRequests = new Map<string, Promise<string>>();
const CACHE_TTL = 15 * 60 * 1000;

async function fetchEventCategory(eventId: string): Promise<string> {
  const cached = eventCategoryCache.get(eventId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.category;
  }

  const inflight = inflightCategoryRequests.get(eventId);
  if (inflight) return inflight;

  const promise = (async (): Promise<string> => {
    try {
      const res = await fetch(`${GAMMA_EVENTS_API}/${eventId}/tags`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        eventCategoryCache.set(eventId, { category: "unknown", ts: Date.now() });
        return "unknown";
      }
      const tags: { slug: string }[] = await res.json();
      let bestCategory = "unknown";
      let bestPriority = -1;
      for (const tag of tags) {
        const slug = tag.slug.toLowerCase();
        const priority = CATEGORY_PRIORITY[slug];
        if (priority !== undefined && priority > bestPriority) {
          bestCategory = slug;
          bestPriority = priority;
        }
      }
      eventCategoryCache.set(eventId, { category: bestCategory, ts: Date.now() });
      return bestCategory;
    } catch {
      eventCategoryCache.set(eventId, { category: "unknown", ts: Date.now() });
      return "unknown";
    } finally {
      inflightCategoryRequests.delete(eventId);
    }
  })();

  inflightCategoryRequests.set(eventId, promise);
  return promise;
}

async function assignCategories(markets: PolymarketMarket[]): Promise<void> {
  const eventIdToMarkets = new Map<string, PolymarketMarket[]>();
  for (const m of markets) {
    if (m.events && m.events.length > 0) {
      const eventId = m.events[0].id;
      if (!eventIdToMarkets.has(eventId)) {
        eventIdToMarkets.set(eventId, []);
      }
      eventIdToMarkets.get(eventId)!.push(m);
    } else {
      m.category = "unknown";
    }
  }

  const eventIds = Array.from(eventIdToMarkets.keys());
  const BATCH_SIZE = 50;

  for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
    const batch = eventIds.slice(i, i + BATCH_SIZE);
    const categories = await Promise.all(
      batch.map((id) => fetchEventCategory(id))
    );
    batch.forEach((id, idx) => {
      const ms = eventIdToMarkets.get(id) || [];
      for (const m of ms) {
        m.category = categories[idx];
      }
    });
  }
}

function safeNum(val: unknown): number {
  const n = Number(val);
  return isFinite(n) ? n : 0;
}

let marketDataCache: { data: PolymarketMarket[]; ts: number } | null = null;
let inflightMarketFetch: Promise<PolymarketMarket[]> | null = null;
const MARKET_CACHE_TTL = 60_000;

async function fetchAllMarkets(): Promise<PolymarketMarket[]> {
  if (marketDataCache && Date.now() - marketDataCache.ts < MARKET_CACHE_TTL) {
    return JSON.parse(JSON.stringify(marketDataCache.data));
  }

  if (inflightMarketFetch) {
    const result = await inflightMarketFetch;
    return JSON.parse(JSON.stringify(result));
  }

  inflightMarketFetch = (async () => {
    const allMarkets: PolymarketMarket[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `${GAMMA_API}?closed=false&active=true&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.status}`);
      }

      const markets: PolymarketMarket[] = await res.json();

      if (markets.length === 0) {
        hasMore = false;
      } else {
        allMarkets.push(...markets);
        offset += limit;
        if (markets.length < limit) {
          hasMore = false;
        }
      }
    }

    const seen = new Set<string>();
    const dedupedMarkets = allMarkets.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    marketDataCache = { data: dedupedMarkets, ts: Date.now() };
    return dedupedMarkets;
  })();

  try {
    const result = await inflightMarketFetch;
    return JSON.parse(JSON.stringify(result));
  } finally {
    inflightMarketFetch = null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const minPrice = parseFloat(searchParams.get("minPrice") || "0.9");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "1");
    const minLiquidity = parseFloat(
      searchParams.get("minLiquidity") || "10000"
    );
    const maxLiquidity = parseFloat(
      searchParams.get("maxLiquidity") || "999999999"
    );
    const minVolume24h = parseFloat(searchParams.get("minVolume24h") || "0");
    const maxVolume24h = parseFloat(
      searchParams.get("maxVolume24h") || "999999999"
    );
    const startDateFrom = searchParams.get("startDateFrom") || "";
    const startDateTo = searchParams.get("startDateTo") || "";
    const endDateFrom = searchParams.get("endDateFrom") || "";
    const endDateTo = searchParams.get("endDateTo") || "";
    const sortBy = searchParams.get("sortBy") || "volume24hr";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const allMarkets = await fetchAllMarkets();

    // Filter by numeric ranges + dates (NOT search — search is client-side)
    let filtered = allMarkets.filter((m) => {
      if (m.closed) return false;

      const price = safeNum(m.lastTradePrice);
      // Since YES + NO = 1 in Polymarket, we filter symmetrically
      // If filtering for [minPrice, maxPrice], also include [(1 - maxPrice), (1 - minPrice)]
      const inOriginalRange = price >= minPrice && price <= maxPrice;
      const complementaryMin = 1 - maxPrice;
      const complementaryMax = 1 - minPrice;
      const inComplementaryRange = price >= complementaryMin && price <= complementaryMax;
      if (!inOriginalRange && !inComplementaryRange) return false;

      const liq = safeNum(m.liquidityNum) || safeNum(m.liquidity);
      if (liq < minLiquidity || liq > maxLiquidity) return false;

      const vol24 = safeNum(m.volume24hr);
      if (vol24 < minVolume24h || vol24 > maxVolume24h) return false;

      if (startDateFrom && m.startDate) {
        if (new Date(m.startDate) < new Date(startDateFrom)) return false;
      }
      if (startDateTo && m.startDate) {
        if (new Date(m.startDate) > new Date(startDateTo)) return false;
      }
      if (endDateFrom && m.endDate) {
        if (new Date(m.endDate) < new Date(endDateFrom)) return false;
      }
      if (endDateTo && m.endDate) {
        if (new Date(m.endDate) > new Date(endDateTo)) return false;
      }

      return true;
    });

    // Sort — returns null for missing/invalid values so they go to the end
    const getSortValue = (m: PolymarketMarket): number | null => {
      switch (sortBy) {
        case "lastTradePrice": {
          const v = safeNum(m.lastTradePrice);
          return m.lastTradePrice == null ? null : v;
        }
        case "liquidity": {
          const v = safeNum(m.liquidityNum) || safeNum(m.liquidity);
          return m.liquidityNum == null && m.liquidity == null ? null : v;
        }
        case "volume24hr": {
          const v = safeNum(m.volume24hr);
          return m.volume24hr == null ? null : v;
        }
        case "volume": {
          const v = safeNum(m.volumeNum) || safeNum(m.volume);
          return m.volumeNum == null && m.volume == null ? null : v;
        }
        case "endDate": {
          if (!m.endDate) return null;
          const t = new Date(m.endDate).getTime();
          return isNaN(t) ? null : t;
        }
        case "startDate": {
          if (!m.startDate) return null;
          const t = new Date(m.startDate).getTime();
          return isNaN(t) ? null : t;
        }
        default: {
          const v = safeNum(m.volume24hr);
          return m.volume24hr == null ? null : v;
        }
      }
    };

    filtered.sort((a, b) => {
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      // N/A (null) always goes to the end, regardless of sort order
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal === bVal) return 0;
      if (sortOrder === "asc") return aVal - bVal;
      return bVal - aVal;
    });

    await assignCategories(filtered);

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
