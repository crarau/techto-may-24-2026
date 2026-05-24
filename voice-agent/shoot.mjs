// Screenshots for the pitch deck. Run from voice-agent/ with both servers up:
//   node shoot.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("..", "deck", "shots");
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3000";
const PERSONAS = ["maya", "daniel", "chen", "margaret"];
const PROMPTS = {
  maya: "should i cop a $60 sephora haul?",
  daniel: "should i cop $499 sony headphones?",
  chen: "should we buy a $300 stroller?",
  margaret: "should i buy a $1500 recliner?",
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 2 });

async function pick(p) {
  if (p !== "maya") {
    await page.getByRole("button", { name: p, exact: true }).click().catch(() => {});
    await page.waitForTimeout(1800);
  }
}

// 1) profile-dashboard crops (the visual financial info) per persona
for (const p of PERSONAS) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await pick(p);
  await page.locator("aside").screenshot({ path: path.join(OUT, `profile-${p}.png`) });
  console.log("profile", p);
}

// 2) full-app shot with a verdict for each persona
for (const p of PERSONAS) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await pick(p);
  await page.getByPlaceholder(/type a question/).fill(PROMPTS[p]);
  await page.getByRole("button", { name: "send", exact: true }).click();
  await page.getByText(/^(cop it|wait|skip|drop)$/).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `full-${p}.png`) });
  console.log("full", p);
}

await browser.close();
console.log("done ->", OUT);
