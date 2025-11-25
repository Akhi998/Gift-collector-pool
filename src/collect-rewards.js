import puppeteer from "puppeteer";
import { logger } from "./logger.js";
import { makeRewardData } from "./utils.js";
import { downloadImageToArchive } from "./image-downloader.js";

export const collectRewards = async (userUniqueID) => {
  const pageUrl = "https://8ballpool.com/en/shop";
  const delay = 100;
  const TIMEOUT = 15000;

  logger("debug", "🚀 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: delay,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
  );

  logger("info", `🌐 Navigating to ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 0 });

  logger("info", "✅ Navigation complete, waiting for login button.");
  const loginButton = await page.waitForSelector("button.m-button", { visible: true, timeout: TIMEOUT });
  if (!loginButton) throw new Error("Login button not found to open modal.");
  
  logger("debug", "🔍 Login button found, clicking.");
  await loginButton.click();

  logger("info", "⌨️ Waiting for and typing User ID...");
  await page.waitForSelector("input.user-id-input", { visible: true, timeout: TIMEOUT });
  await page.type("input.user-id-input", userUniqueID, { delay });

  // allow UI to react
  logger("info", "➡ Looking for the correct 'Go' button among buttons.m-button...");

  // Gather all candidate buttons (class is shared)
  const buttons = await page.$$("button.m-button");
  let goButton = null;

  for (const btn of buttons) {
    // get visible inner text (trim)
    const text = (await page.evaluate(el => (el.innerText || el.textContent || "").trim(), btn)).toLowerCase();

    // match exact 'go' or contains 'go' as a word (covers icons + text)
    if (text === "go" || /\bgo\b/.test(text)) {
      // ensure it's visible and enabled
      const visible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style && style.display !== "none" && style.visibility !== "hidden" && !el.disabled;
      }, btn);

      if (visible) {
        goButton = btn;
        break;
      }
    }
  }

  // final fallback: try any input-specific go button if available
 

  await goButton.click();
  logger("success", "✅ Clicked Go (login attempted).");

  // ----------------------------
  // COLLECT FREE REWARDS
  // ----------------------------
  logger("info", "🛒 Scanning products...");

  await page.waitForSelector(".product-list-item", { timeout: 20000 });
  const products = await page.$$(".product-list-item");
  const N = products.length;

  logger("info", `💡 ${N} products found.`);

  const rewards = [];

  for (const [index, product] of products.entries()) {
    const priceButton = await product.$("button");
    if (!priceButton) continue;

    const price = (await priceButton.evaluate((el) => (el.textContent || "").trim())).toUpperCase();
    const imageElement = await product.$("img");
    const imageSrc = imageElement ? await imageElement.evaluate((i) => i.getAttribute("src")) : "";
    const nameElement = await product.$("h3");
    const name = nameElement ? await nameElement.evaluate((el) => el.textContent.trim()) : "Unknown";
    const qtyElem = await product.$(".amount-text");
    const quantity = qtyElem ? await qtyElem.evaluate(el => el.textContent.trim()) : "";

    logger("info", `🚲 [${index + 1}/${N}] ${price} ${name}`);

    if (price === "FREE" || price === "CLAIMED") {
      logger("info", `⏳ Claiming: [${index + 1}/${N}]`);
      await priceButton.click();
      const localPath = await downloadImageToArchive(imageSrc);
      rewards.push(makeRewardData(localPath || imageSrc, name, quantity));
      //rewards.push(makeRewardData(imageSrc, name, quantity));
      logger("success", `🎉 Claimed: [${index + 1}/${N}]`);
    }
  }

  // (optional) await browser.close();
  logger("info", "❎ Browser closed.");

  if (rewards.length === 0) throw new Error("No rewards found");

  return rewards;
};
