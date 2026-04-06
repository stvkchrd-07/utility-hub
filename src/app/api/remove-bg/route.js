import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Send the Base64 image directly to remove.bg's official API
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVE_BG_API_KEY,
        "Content-Type": "application/json",
        "Accept": "image/png"
      },
      body: JSON.stringify({
        image_file_b64: imageBase64,
        size: "auto"
      })
    });

    if (!response.ok) {
      let errorMsg = "Remove.bg API Error";
      try {
        const errorData = await response.json();
        if (errorData.errors && errorData.errors.length > 0) {
          errorMsg = errorData.errors[0].title;
        }
      } catch (e) {
        errorMsg = await response.text();
      }
      
      console.error("Remove.bg Rejected:", response.status, errorMsg);
      
      if (response.status === 403) {
        return NextResponse.json({ error: "Invalid API Key. Check REMOVE_BG_API_KEY in .env.local" }, { status: 403 });
      }
      if (response.status === 402) {
        return NextResponse.json({ error: "Insufficient remove.bg credits. Free tier limit reached." }, { status: 402 });
      }
      
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // Return the transparent PNG bytes directly to the frontend
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: { 
        'Content-Type': 'image/png',
        'Content-Length': arrayBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    console.error("Critical Backend Crash:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
  }
}
