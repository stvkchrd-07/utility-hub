const removeBackground = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      const { remove, newSession, rembgConfig } = await import("@bunnio/rembg-web");
      const ort = await import("onnxruntime-web");
      
      // CRITICAL: Load WASM engine from CDN to avoid 404 errors on Vercel
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";
      
      setProgress(30);

      // Use the Silueta model path
      const modelPath = process.env.NEXT_PUBLIC_REMBG_MODEL_URL || "/models/silueta.onnx";
      rembgConfig.setCustomModelPath("silueta", modelPath);

      const session = newSession("silueta");
      const blob = await remove(originalImage.file, {
        session,
        onProgress: (info) => {
          if (typeof info?.progress === "number") {
            setProgress(Math.max(30, Math.min(Math.round(info.progress), 95)));
          }
        },
      });

      setProgress(100);
      setResultImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError("Failed to load engine. Check connection or NEXT_PUBLIC_REMBG_MODEL_URL.");
    } finally {
      setIsProcessing(false);
    }
  };