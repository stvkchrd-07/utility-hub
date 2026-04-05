import { pipeline, env } from "@huggingface/transformers";

// Force CDN to prevent Next.js from looking for local WASM files
env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/';

let segmenter = null;

self.addEventListener('message', async (event) => {
  const { imageUrl } = event.data;

  try {
    if (!segmenter) {
      self.postMessage({ status: 'init', text: 'Initializing AI Model...' });
      segmenter = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
        progress_callback: (p) => {
          if (p.status === 'progress' && p.progress) {
            self.postMessage({ status: 'progress', progress: Math.round(p.progress) });
          }
        }
      });
    }

    self.postMessage({ status: 'processing', text: 'Extracting foreground...' });
    
    const output = await segmenter(imageUrl);
    const result = Array.isArray(output) ? output[0] : output;
    const finalImage = result.mask || result;
    
    const blob = await finalImage.toBlob('image/png');
    
    self.postMessage({ status: 'done', blob });
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message });
  }
});
