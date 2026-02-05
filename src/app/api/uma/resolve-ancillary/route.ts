import { NextRequest, NextResponse } from "next/server";

const UMA_RESOLVE_API = "https://vote.uma.xyz/api/resolve-l2-ancillary-data";

// YES_OR_NO_QUERY identifier in hex
const YES_OR_NO_QUERY_HEX = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000";

export interface ParsedAncillaryData {
  title: string;
  description: string;
  marketId: string | null;
  resData: {
    p1: number;
    p2: number;
    p3: number;
  } | null;
  outcomes: {
    p1Label: string;
    p2Label: string;
    p3Label: string;
  } | null;
  rawText: string;
}

// Parse the decoded ancillary data text to extract market_id and res_data
function parseAncillaryText(text: string): ParsedAncillaryData {
  const result: ParsedAncillaryData = {
    title: "",
    description: "",
    marketId: null,
    resData: null,
    outcomes: null,
    rawText: text,
  };

  // Extract title
  const titleMatch = text.match(/q:\s*title:\s*([^,]+)/i);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract description (everything between "description:" and "market_id:" or end)
  const descMatch = text.match(/description:\s*([\s\S]*?)(?:market_id:|res_data:|initializer:|$)/i);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Extract market_id
  const marketIdMatch = text.match(/market_id:\s*(\d+)/i);
  if (marketIdMatch) {
    result.marketId = marketIdMatch[1];
  }

  // Extract res_data: p1, p2, p3
  const resDataMatch = text.match(/res_data:\s*p1:\s*([\d.]+),\s*p2:\s*([\d.]+),\s*p3:\s*([\d.]+)/i);
  if (resDataMatch) {
    result.resData = {
      p1: parseFloat(resDataMatch[1]),
      p2: parseFloat(resDataMatch[2]),
      p3: parseFloat(resDataMatch[3]),
    };
  }

  // Try to extract outcome labels from description
  // Common patterns: "p1 corresponds to X, p2 to Y, p3 to Z"
  const outcomesMatch = text.match(/p1\s+corresponds\s+to\s+(\w+)[^p]*p2\s+to\s+(\w+)[^p]*p3\s+to\s+([\w\-\/]+)/i);
  if (outcomesMatch) {
    result.outcomes = {
      p1Label: outcomesMatch[1],
      p2Label: outcomesMatch[2],
      p3Label: outcomesMatch[3].replace(/\//g, " / "),
    };
  }

  return result;
}

// Decode hex string to text
function hexToText(hex: string): string {
  // Remove 0x prefix if present
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const time = searchParams.get("time");
    const ancillaryData = searchParams.get("ancillaryData");
    const identifier = searchParams.get("identifier") || YES_OR_NO_QUERY_HEX;

    if (!time || !ancillaryData) {
      return NextResponse.json(
        { error: "time and ancillaryData are required" },
        { status: 400 }
      );
    }

    const url = new URL(UMA_RESOLVE_API);
    url.searchParams.set("identifier", identifier);
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
      throw new Error(`UMA API request failed: ${res.status}`);
    }

    const data = await res.json();
    
    // Decode the hex string to readable text
    const decodedText = hexToText(data.resolvedAncillaryData);
    
    // Parse the decoded text
    const parsed = parseAncillaryText(decodedText);

    return NextResponse.json({
      resolvedAncillaryData: data.resolvedAncillaryData,
      decodedText,
      parsed,
    });
  } catch (error) {
    console.error("Error resolving ancillary data:", error);
    return NextResponse.json(
      { error: "Failed to resolve ancillary data" },
      { status: 500 }
    );
  }
}
