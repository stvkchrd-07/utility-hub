import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const modelUrl = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx';
const outputDir = path.join(process.cwd(), 'public', 'models');
const outputPath = path.join(outputDir, 'silueta.onnx');

function downloadFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects.'));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, destination, redirects + 1));
      }
      const file = fs.createWriteStream(destination);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('[rembg-model] Downloading silueta.onnx...');
    await downloadFile(modelUrl, outputPath);
    console.log('[rembg-model] Download complete.');
  }
}
main().catch(console.error);