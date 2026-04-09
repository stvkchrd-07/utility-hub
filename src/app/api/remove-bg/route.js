import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Convert Base64 text back into a binary Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Create a native FormData payload matching what FastAPI expects (UploadFile)
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" });
    formData.append("file", blob, "upload.jpg");

    // Read the connection details from environment variables
    const AI_ENGINE_URL = process.env.HF_CUSTOM_API_URL;
    const SECRET_KEY = process.env.HF_CUSTOM_API_SECRET;

    if (!AI_ENGINE_URL || !SECRET_KEY) {
       return NextResponse.json({ error: "Server misconfiguration. API URL or Secret missing." }, { status: 500 });
    }

    // Forward the file securely to your Hugging Face Space
    const response = await fetch(AI_ENGINE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: formData
    });

    // Handle Custom API Errors and Cold Starts
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Custom AI Engine Rejected:", response.status, errorText);
      
      // 503 or 504 means your Hugging Face Space is booting up from sleep
      if (response.status === 503 || response.status === 504) {
         return NextResponse.json({ error: "WAKING_UP" }, { status: 503 });
      }
      if (response.status === 401) {
         return NextResponse.json({ error: "Unauthorized: Secret Key mismatch." }, { status: 401 });
      }
      
      return NextResponse.json({ error: `AI Engine Error: ${errorText}` }, { status: response.status });
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
    // Intercept socket drops during Hugging Face Docker cold starts
    if (error.message.includes('terminated') || error.message.includes('socket') || error.message.includes('fetch failed')) {
       return NextResponse.json({ error: "WAKING_UP" }, { status: 503 });
    }
    console.error("Critical Backend Crash:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
  }
}
