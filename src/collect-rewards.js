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
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
  );

  logger("info", `🌐 Navigating to ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 0 });

  logger("info", "✅ Navigation complete, waiting for login button.");

  const loginButton = await page.waitForSelector("button.m-button", {
    visible: true,
    timeout: TIMEOUT,
  });

  await loginButton.click();

  logger("info", "⌨️ Waiting for and typing User ID...");
  await page.waitForSelector("input.user-id-input", {
    visible: true,
    timeout: TIMEOUT,
  });

  await page.type("input.user-id-input", userUniqueID, { delay });

  // Click GO button safely
  const buttons = await page.$$("button.m-button");
  let goButton = null;

  for (const btn of buttons) {
    const text = (
      await page.evaluate(
        (el) => (el.innerText || el.textContent || "").trim(),
        btn
      )
    ).toLowerCase();

    if (text === "go" || /\bgo\b/.test(text)) {
      goButton = btn;
      break;
    }
  }

  if (!goButton) throw new Error("Go button not found");
  await goButton.click();

  logger("success", "✅ Clicked Go (login attempted).");

  // ----------------------------
  // WAIT FOR SHOP PRODUCTS
  // ----------------------------
  logger("info", "🛒 Waiting for products...");
  await page.waitForSelector(".product-list-item", { timeout: 20000 });

  const rewards = [];

  logger("info", "🔎 Scanning and claiming FREE rewards safely...");

  // --------------------------------------------
  // SAFE LOOP (NO STALE ELEMENTS)
  // --------------------------------------------
  while (true) {
  
    const freeButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find(btn =>
        btn.innerText &&
        btn.innerText.toUpperCase().includes("FREE")
      ) || null;
    });
  
    const freeButton = freeButtonHandle.asElement();
  
    if (!freeButton) {
      logger("info", "✅ No more FREE rewards found.");
      break;
    }
  
    logger("info", "⏳ Claiming FREE reward...");
  
    try {
      await freeButton.click();
      await page.waitForTimeout(1500);
  
      logger("success", "🎉 FREE reward claimed!");
    } catch (err) {
      logger("warn", "⚠ Click failed, retrying...");
      await page.waitForTimeout(1000);
    }
  }

  logger("info", "❎ Closing browser...");
  await browser.close();

  return rewards;
};
