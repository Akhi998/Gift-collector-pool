import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch"; // add to package.json if not present
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

  // build filename from url hash + extension guess
  const ext = (imageUrl.split('.').pop().split(/\W/)[0] || "png").slice(0,5);
  const hash = crypto.createHash("md5").update(imageUrl).digest("hex").slice(0,8);
  const filename = `${hash}.${ext}`;
  const filePath = path.join(dir, filename);

  try {
    const res = await fetch(imageUrl, { timeout: 15000 });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = await res.buffer();
    await fs.writeFile(filePath, buffer);
    // return repo-relative path (use forward slashes)
    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  } catch (err) {
    console.warn("Image download failed:", imageUrl, err.message);
    return null;
  }
}
