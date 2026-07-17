import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "assets/branding/carnacristo-logo-master.png");
const PUBLIC_DIR = path.join(ROOT, "public");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function generate({ file, size, background, padPercent }) {
  const inner = Math.round(size * (1 - padPercent * 2));

  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(PUBLIC_DIR, file));

  console.log(`generated ${file} (${size}x${size}, padding ${Math.round(padPercent * 100)}% per side)`);
}

await generate({ file: "icon.png", size: 512, background: TRANSPARENT, padPercent: 0.08 });
await generate({ file: "icon-192.png", size: 192, background: TRANSPARENT, padPercent: 0.08 });
await generate({ file: "icon-maskable.png", size: 512, background: WHITE, padPercent: 0.175 });
await generate({ file: "apple-icon.png", size: 180, background: WHITE, padPercent: 0.075 });
