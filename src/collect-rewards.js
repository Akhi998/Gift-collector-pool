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

  logger("info", "✅ Waiting for login button...");
  const loginButton = await page.waitForSelector("button.m-button", {
    visible: true,
    timeout: TIMEOUT,
  });

  await loginButton.click();

  logger("info", "⌨️ Typing User ID...");
  await page.waitForSelector("input.user-id-input", {
    visible: true,
    timeout: TIMEOUT,
  });

  await page.type("input.user-id-input", userUniqueID, { delay });

  // Find GO button safely
  const buttons = await page.$$("button.m-button");
  let goButton = null;

  for (const btn of buttons) {
    const text = (
      await btn.evaluate(el => (el.innerText || el.textContent || "").trim())
    ).toLowerCase();

    if (text === "go" || /\bgo\b/.test(text)) {
      goButton = btn;
      break;
    }
  }

  if (!goButton) throw new Error("Go button not found");

  await goButton.click();
  logger("success", "✅ Clicked Go");

  // Wait for shop to load
  await page.waitForSelector(".product-list-item", { timeout: 20000 });

  const rewards = [];

  logger("info", "🔎 Scanning and claiming FREE rewards...");

  while (true) {

    // Dynamically find FREE button each loop
    const freeButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(
        document.querySelectorAll(".product-list-item button")
      );

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

    try {

      logger("info", "⏳ Attempting to claim FREE reward...");

      // Get product card BEFORE clicking
      const productHandle = await freeButton.evaluateHandle(btn =>
        btn.closest(".product-list-item")
      );

      const product = productHandle.asElement();

      let name = "Unknown";
      let quantity = "";
      let imageSrc = "";

      if (product) {
        name = await product.$eval("h3", el => el.textContent.trim())
          .catch(() => "Unknown");

        quantity = await product.$eval(".amount-text", el => el.textContent.trim())
          .catch(() => "");

        imageSrc = await product.evaluate(prod => {
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
      }

      // 🔥 CLICK FIRST
      await freeButton.click();

      // Wait until FREE disappears (means successful claim)
      await page.waitForFunction(
        (btn) => btn && !btn.innerText.toUpperCase().includes("FREE"),
        { timeout: 5000 },
        freeButton
      );

      logger("success", `🎉 FREE reward claimed: ${name}`);

      // Only now process reward
      const localPath = imageSrc
        ? await downloadImageToArchive(imageSrc)
        : "";

      const imageRef = localPath || imageSrc;

      const rewardString = makeRewardData(imageRef, name, quantity);

      // Prevent duplicates inside same run
      if (!rewards.some(r => r.includes(name))) {
        rewards.push(rewardString);
        logger("info", `➕ Added reward: ${name}`);
      }

      // Small delay to allow DOM refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      logger("warn", "⚠ Reward not claimable or already claimed.");
      break;
    }
  }

  logger("info", "❎ Closing browser...");
  await browser.close();

  return rewards;
};
