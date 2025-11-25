// src/image-downloader.js
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function downloadImageToArchive(imageUrl) {
  if (!imageUrl) return null;

  try {
    const baseDir = path.join(process.cwd(), "archive", "images");
    const dateFolder = (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
    const outDir = path.join(baseDir, dateFolder);
    await fs.mkdir(outDir, { recursive: true });

    const extGuess = (imageUrl.split('.').pop().split(/\W/)[0] || "png").slice(0,5);
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex").slice(0,8);
    const filename = `${hash}.${extGuess}`;
    const filePath = path.join(outDir, filename);

    // use global fetch available in Node 18+ (no node-fetch)
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // return repo-relative path for Markdown
    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  } catch (err) {
    console.warn("downloadImageToArchive failed for", imageUrl, err.message);
    return null;
  }
}
