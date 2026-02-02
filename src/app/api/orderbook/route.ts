import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");

    if (!tokenId) {
      return NextResponse.json(
        { error: "token_id is required" },
        { status: 400 }
      );
    }

    const res = await fetch("https://clob.polymarket.com/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ token_id: tokenId }]),
    });

    if (!res.ok) {
      throw new Error(`CLOB API request failed: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching order book:", error);
    return NextResponse.json(
      { error: "Failed to fetch order book" },
      { status: 500 }
    );
  }
}
