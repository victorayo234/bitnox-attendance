import fs from "fs";
import path from "path";
import sharp from "sharp";

const rootDir = process.cwd();
const srcImagePath = path.join(rootDir, "bitnox favicon.png");

if (!fs.existsSync(srcImagePath)) {
  console.error("Source image not found:", srcImagePath);
  process.exit(1);
}

function createDib(rawRgbaBuffer, width, height) {
  const maskRowBytes = Math.ceil(width / 32) * 4;
  const maskSize = maskRowBytes * height;
  const xorSize = width * height * 4;
  const headerSize = 40;
  const dibSize = headerSize + xorSize + maskSize;
  const buf = Buffer.alloc(dibSize);

  // BITMAPINFOHEADER
  buf.writeUInt32LE(headerSize, 0);
  buf.writeInt32LE(width, 4);
  buf.writeInt32LE(height * 2, 8); // doubled height for XOR + AND
  buf.writeUInt16LE(1, 12); // planes
  buf.writeUInt16LE(32, 14); // 32 bpp
  buf.writeUInt32LE(0, 16); // BI_RGB
  buf.writeUInt32LE(xorSize + maskSize, 20);
  buf.writeInt32LE(0, 24);
  buf.writeInt32LE(0, 28);
  buf.writeUInt32LE(0, 32);
  buf.writeUInt32LE(0, 36);

  // XOR mask (bottom-to-top, BGRA)
  let pixelOffset = headerSize;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      buf[pixelOffset++] = rawRgbaBuffer[srcIdx + 2]; // B
      buf[pixelOffset++] = rawRgbaBuffer[srcIdx + 1]; // G
      buf[pixelOffset++] = rawRgbaBuffer[srcIdx];     // R
      buf[pixelOffset++] = rawRgbaBuffer[srcIdx + 3]; // A
    }
  }

  // AND mask (bottom-to-top, 1-bit per pixel)
  let maskOffset = headerSize + xorSize;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = maskOffset;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const a = rawRgbaBuffer[srcIdx + 3];
      if (a === 0) {
        const byteIdx = rowStart + (x >> 3);
        const bitIdx = 7 - (x & 7);
        buf[byteIdx] |= (1 << bitIdx);
      }
    }
    maskOffset += maskRowBytes;
  }

  return buf;
}

async function createIco(srcPath) {
  const dibSizes = [16, 32, 48];
  const pngSizes = [256];
  const images = [];

  for (const size of dibSizes) {
    const raw = await sharp(srcPath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const data = createDib(raw, size, size);
    images.push({ size, data });
  }

  for (const size of pngSizes) {
    const data = await sharp(srcPath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ size, data });
  }

  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let currentOffset = 6 + count * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(currentOffset, 12);
    dirEntries.push(entry);
    currentOffset += img.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.data)]);
}

async function run() {
  console.log("Generating favicons from:", srcImagePath);

  // 1. Generate multi-resolution favicon.ico
  const icoBuffer = await createIco(srcImagePath);
  fs.writeFileSync(path.join(rootDir, "src", "app", "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(rootDir, "public", "favicon.ico"), icoBuffer);
  console.log("✓ Generated src/app/favicon.ico and public/favicon.ico (size: " + icoBuffer.length + " bytes)");

  // 2. Generate PNG icons at various standard sizes
  const targets = [
    { dest: path.join(rootDir, "src", "app", "icon.png"), size: 512 },
    { dest: path.join(rootDir, "src", "app", "apple-icon.png"), size: 180 },
    { dest: path.join(rootDir, "public", "icon.png"), size: 512 },
    { dest: path.join(rootDir, "public", "apple-icon.png"), size: 180 },
    { dest: path.join(rootDir, "public", "icon-192.png"), size: 192 },
    { dest: path.join(rootDir, "public", "icon-512.png"), size: 512 },
  ];

  for (const t of targets) {
    const buf = await sharp(srcImagePath)
      .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    fs.writeFileSync(t.dest, buf);
    console.log(`✓ Generated ${path.relative(rootDir, t.dest)} (${t.size}x${t.size}, ${buf.length} bytes)`);
  }

  console.log("All favicon and app icon assets generated successfully!");
}

run().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
