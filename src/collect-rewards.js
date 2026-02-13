import puppeteer from "puppeteer";
import { logger } from "./logger.js";
import { makeRewardData } from "./utils.js";
import { downloadImageToArchive } from "./image-downloader.js";

export const collectRewards = async (userUniqueID) => {
  const pageUrl = "https://8ballpool.com/en/shop";
  const delay = 50;
  const TIMEOUT = 20000;

  logger("debug", "🚀 Launching browser...");

  const browser = await puppeteer.launch({
    headless: true,
    slowMo: delay,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    // ----------------------------------
    // NAVIGATE
    // ----------------------------------
    logger("info", `🌐 Navigating to ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 0 });

    // ----------------------------------
    // LOGIN
    // ----------------------------------
    logger("info", "Waiting for login button...");
    await page.waitForSelector("button.m-button", { visible: true, timeout: TIMEOUT });

    const buttons = await page.$$("button.m-button");
    let loginButton = null;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), btn);
      if (text.includes("login")) {
        loginButton = btn;
        break;
      }
    }

    if (!loginButton) throw new Error("Login button not found");

    await loginButton.click();

    logger("info", "Typing User ID...");
    await page.waitForSelector("input.user-id-input", { visible: true, timeout: TIMEOUT });
    await page.type("input.user-id-input", userUniqueID, { delay });

    // Click GO
    const goButtons = await page.$$("button.m-button");
    let goButton = null;

    for (const btn of goButtons) {
      const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), btn);
      if (text === "go") {
        goButton = btn;
        break;
      }
    }

    if (!goButton) throw new Error("Go button not found");

    await goButton.click();

    // Wait after login
    await new Promise(resolve => setTimeout(resolve, 4000));

    await page.waitForSelector(".product-list-item", { timeout: TIMEOUT });

    logger("success", "✅ Logged in successfully");

    // ----------------------------------
    // COLLECT ONLY FREE REWARDS
    // ----------------------------------
    const rewards = [];
    let foundFree = true;

    logger("info", "🛒 Searching for FREE rewards...");

    while (foundFree) {
      foundFree = false;

      // Find all FREE buttons dynamically
      const freeProducts = await page.$$eval(
        ".product-list-item",
        products =>
          products
            .map(prod => {
              const button = prod.querySelector("button");
              if (!button) return null;

              const price = button.innerText.trim().toUpperCase();
              if (price !== "FREE") return null;

              const name =
                prod.querySelector("h3")?.innerText?.trim() || "Unknown";

              const qty =
                prod.querySelector(".amount-text")?.innerText?.trim() || "";

              const img = prod.querySelector("img")?.src || null;

              return { name, qty, img };
            })
            .filter(Boolean)
      );

      if (freeProducts.length === 0) {
        logger("info", "No FREE rewards found.");
        break;
      }

      foundFree = true;

      const reward = freeProducts[0];

      logger("info", `🎁 Claiming: ${reward.name}`);

      // Click first FREE button again fresh
      const buttonHandle = await page.$x(
        `//button[normalize-space(text())='FREE']`
      );

      if (buttonHandle.length > 0) {
        await buttonHandle[0].click();
        await page.waitForTimeout(4000);
      }

      // Download image
      const localPath = reward.img
        ? await downloadImageToArchive(reward.img)
        : null;

      rewards.push(
        makeRewardData(localPath || reward.img, reward.name, reward.qty)
      );

      logger("success", `🎉 Claimed: ${reward.name}`);
    }

    logger("info", "❎ Closing browser...");
    await browser.close();

    return rewards;
  } catch (err) {
    logger("error", err.message);
    await browser.close();
    throw err;
  }
};
