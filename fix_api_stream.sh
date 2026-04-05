#!/bin/bash
echo "Fixing the Node.js API stream termination error..."

cat << 'INNER_EOF' > src/app/api/remove-bg/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // THE FIX: Convert the File stream to an ArrayBuffer.
    // This stops Node.js from throwing the "terminated" stream error.
    const arrayBuffer = await image.arrayBuffer();

    const response = await fetch(
      "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
      {
        headers: { 
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          "Content-Type": "application/octet-stream"
        },
        method: "POST",
        body: arrayBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API Error:", errorText);
      
      if (response.status === 503 && errorText.includes("currently loading")) {
         throw new Error("AI Model is waking up. Please try again in 15 seconds.");
      }
      
      // Provide a clearer error message if the token is invalid
      if (response.status === 401) {
         throw new Error("Unauthorized: Check if your HF_API_TOKEN is valid in .env.local");
      }
      
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: { 'Content-Type': 'image/png' }
    });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
INNER_EOF

echo "Done! Make sure you restart your dev server."
