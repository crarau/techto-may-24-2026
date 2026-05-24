import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("..", "deck", "shots");
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3000";

const SHOTS = [
  { name: "01-landing", persona: "maya", prompt: null },
  { name: "02-sephora-skip", persona: "maya", prompt: "should i cop a $60 sephora haul?" },
  { name: "03-airpods-wait", persona: "maya", prompt: "should i cop $250 airpods?" },
  { name: "04-mcdonalds-cop", persona: "maya", prompt: "should i cop a $20 mcdonalds?" },
  { name: "05-margaret-profile", persona: "margaret", prompt: "should i buy a $1500 recliner?" },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1024 },
  deviceScaleFactor: 2,
});

for (const s of SHOTS) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800); // persona profile loads
  if (s.persona !== "maya") {
    await page.getByRole("button", { name: s.persona, exact: true }).click().catch(() => {});
    await page.waitForTimeout(1800);
  }
  if (s.prompt) {
    await page.getByPlaceholder(/type a question/).fill(s.prompt);
    await page.getByRole("button", { name: "send", exact: true }).click();
    // wait for the verdict card label to appear, else fall back to a fixed wait
    await page
      .getByText(/^(cop it|wait|skip|drop)$/)
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(2500); // let streaming text finish
  }
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
  console.log("captured", s.name);
}

await browser.close();
console.log("done ->", OUT);
