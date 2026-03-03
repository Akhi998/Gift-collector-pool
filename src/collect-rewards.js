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
  
  // 🔥 WAIT FOR LOGIN TO COMPLETE
  await page.waitForFunction(() => {
    return document.body.innerText.includes("FREE");
  }, { timeout: 20000 }).catch(() => {});
  
  logger("info", "✅ Login completed / shop updated.");

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
  
    const products = await page.$$(".product-list-item");
    let foundFree = false;
  
    for (const product of products) {
  
      const button = await product.$("button");
      if (!button) continue;
  
      const text = await button.evaluate(el =>
        (el.textContent || "").trim().toUpperCase()
      );
  
      if (text.includes("FREE")) {
  
        foundFree = true;
  
        // 🔽 Extract reward data BEFORE clicking
        const name = await product.$eval("h3", el => el.textContent.trim()).catch(() => "Unknown");
  
        const imageSrc = await product.evaluate(prod => {
          const imgs = Array.from(prod.querySelectorAll("img"));
          if (!imgs.length) return "";
        
          let best = imgs[0];
          let bestArea = 0;
        
          for (const img of imgs) {
            const rect = img.getBoundingClientRect();
            const area = rect.width * rect.height;
        
            if (area > bestArea) {
              bestArea = area;
              best = img;
            }
          }
        
          return best.src;
        });
  
        const quantity = await product.$eval(".amount-text", el => el.textContent.trim())
          .catch(() => "");
  
        logger("info", `📦 Reward Found: ${name}`);
  
        // Optional: download image to archive
        const localPath = imageSrc ? await downloadImageToArchive(imageSrc) : "";
        const imageRef = localPath || imageSrc;
  
        // 🔥 PUSH TO ARRAY (THIS WAS MISSING)
        rewards.push(makeRewardData(imageRef, name, quantity));
  
        // Now click
        await button.click();
        await new Promise(r => setTimeout(r, 1500));
  
        logger("success", `🎉 FREE reward claimed: ${name}`);
  
        break; // important: DOM re-renders
      }
    }
  
    if (!foundFree) {
      logger("info", "✅ No more FREE rewards found.");
      break;
    }
  }

  logger("info", "❎ Closing browser...");
  await browser.close();

  return rewards;
};
