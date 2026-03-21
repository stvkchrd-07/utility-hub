import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const modelUrl =
  process.env.REMBG_MODEL_DOWNLOAD_URL ||
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx';
const outputDir = path.join(process.cwd(), 'public', 'models');
const outputPath = path.join(outputDir, 'u2netp.onnx');

function downloadFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects while downloading model.'));
      return;
    }

    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve(downloadFile(res.headers.location, destination, redirects + 1));
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Model download failed with status: ${res.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destination);
        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve());
        });

        file.on('error', (err) => {
          fs.unlink(destination, () => reject(err));
        });
      })
      .on('error', reject);
  });
}

async function main() {
  if (fs.existsSync(outputPath)) {
    console.log('[rembg-model] u2netp.onnx already exists, skipping download.');
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  await downloadFile(modelUrl, outputPath);
  console.log('[rembg-model] Downloaded u2netp.onnx to public/models');
}

main().catch((error) => {
  console.error('[rembg-model] Failed to download model:', error.message);
  console.error(
    '[rembg-model] Continuing without local model file. Set NEXT_PUBLIC_REMBG_MODEL_URL in deployment if needed.'
  );
  process.exit(0);
});
