import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Download an image URL and save to local folder.
 * Returns relative path that can be used in README.
 */
export async function downloadImageToArchive(imageUrl, options = {}) {
  const baseDir = options.baseDir || path.join(process.cwd(), "archive", "images");
  const dateFolder = options.dateFolder || (new Date()).toISOString().slice(0,10); // YYYY-MM-DD
  const dir = path.join(baseDir, dateFolder);
  await fs.mkdir(dir, { recursive: true });

  const extGuess = (imageUrl.split('.').pop().split(/\W/)[0] || "png").slice(0,5);
  const hash = crypto.createHash("md5").update(imageUrl).digest("hex").slice(0,8);
  const filename = `${hash}.${extGuess}`;
  const filePath = path.join(dir, filename);

  try {
    // Use Node's global fetch (Node 18+)
    const res = await fetch(imageUrl, { method: "GET" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  } catch (err) {
    console.warn("Image download failed:", imageUrl, err.message);
    return null;
  }
}
