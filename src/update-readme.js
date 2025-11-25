// src/update-readme.js
import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";
import { getArchivedFileName } from "./utils.js";

/**
 *
 * @param {string[]} rewards   // rewards should already be Markdown strings (from makeRewardData)
 *
 */
export const updateReadme = async (rewards) => {
  const today = new Date();
  // join rewards with ' | ' or '; ' depending on how you want it displayed
  // Use a smaller inline (no raw HTML)
  const rewardsCell = rewards.join("  ·  "); // bullet separator
  const todaysRewards = `| ${today.toLocaleDateString()} | ${rewardsCell} |\n`;

  let prevReadmeContent;
  if (today.getDate() === 1) {
    const archivedFileName = getArchivedFileName(today);
    const archiveFilePath = path.join("archive", `${archivedFileName}.md`);
    await fs.mkdir("archive", { recursive: true });
    const currentReadme = await fs.readFile("README.md", "utf8");
    await fs.writeFile(archiveFilePath, currentReadme);
    logger("info", `🗄️ Archived ${archivedFileName}`);
    // use the example as the base for fresh month
    prevReadmeContent = await fs.readFile("README.example.md", "utf8");
  } else {
    prevReadmeContent = await fs.readFile("README.md", "utf8");
  }

  // append the new table row (Markdown-safe)
  prevReadmeContent += "\n" + todaysRewards;
  await fs.writeFile("README.md", prevReadmeContent, "utf8");
  logger("success", `📝 Updated README`);
};
