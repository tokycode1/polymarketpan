import { NextRequest, NextResponse } from "next/server";
import { PolymarketMarket } from "@/types/market";

const GAMMA_API = "https://gamma-api.polymarket.com/markets";

function safeNum(val: unknown): number {
  const n = Number(val);
  return isFinite(n) ? n : 0;
}

async function fetchAllMarkets(): Promise<PolymarketMarket[]> {
  const allMarkets: PolymarketMarket[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `${GAMMA_API}?closed=false&active=true&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      method: "GET",
      next: { revalidate: 60 },
    });

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

  return allMarkets;
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
      if (price < minPrice || price > maxPrice) return false;

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

    // Return ALL filtered+sorted results; client handles search + pagination
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
