import { NextRequest, NextResponse } from "next/server";

const UMA_AUGMENT_API = "https://vote.uma.xyz/api/augment-request-gql";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, time, ancillaryData } = body;

    if (!identifier || !time || !ancillaryData) {
      return NextResponse.json(
        { error: "identifier, time, and ancillaryData are required" },
        { status: 400 }
      );
    }

    // Use string identifier for UMA API
    const requestBody = {
      identifier: "YES_OR_NO_QUERY",
      time: Number(time),
      ancillaryData,
    };

    console.log("Calling UMA augment API with:", {
      identifier: requestBody.identifier,
      time: requestBody.time,
      ancillaryDataLength: requestBody.ancillaryData?.length,
      ancillaryDataStart: requestBody.ancillaryData?.substring(0, 50),
    });

    const res = await fetch(UMA_AUGMENT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Origin": "https://vote.uma.xyz",
        "Referer": "https://vote.uma.xyz/",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("UMA augment API error:", errorText);
      console.error("Request was:", JSON.stringify(requestBody).substring(0, 500));
      // Return empty data instead of throwing - the oracle link is optional
      return NextResponse.json({ 
        error: "UMA API unavailable",
        ooRequestUrl: null,
        polymarketOracleUrl: null 
      });
    }

    const data = await res.json();
    
    // Transform ooRequestUrl to the preferred format
    if (data.ooRequestUrl) {
      // Extract transactionHash and eventIndex from the URL
      const urlObj = new URL(data.ooRequestUrl);
      const transactionHash = urlObj.searchParams.get("transactionHash");
      const eventIndex = urlObj.searchParams.get("eventIndex");
      
      // Create the preferred URL format
      if (transactionHash) {
        data.polymarketOracleUrl = `https://oracle.uma.xyz/?project=Polymarket&transactionHash=${transactionHash}${eventIndex ? `&eventIndex=${eventIndex}` : ""}`;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching augment request:", error);
    return NextResponse.json(
      { error: "Failed to fetch augment request data" },
      { status: 500 }
    );
  }
}
