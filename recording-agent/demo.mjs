import { chromium } from "playwright";

const appUrl = process.env.CLIPCRAFT_URL || "http://localhost:3000";
const mode = (process.env.DEMO_MODE || "auto").toLowerCase();
const startDelaySeconds = Number(process.env.DEMO_START_DELAY_SECONDS || "5");
const brief = "A shy girl leaves a sandwich for a stray dog every day. One morning, the dog brings her a bright red balloon it found, and they become best friends. Keep it simple, warm, and hopeful.";

if (!["auto", "manual"].includes(mode)) {
  throw new Error("DEMO_MODE must be auto or manual.");
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function moveAndClick(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.hover();
  await sleep(350);
  await locator.click();
  await sleep(500);
}

async function chooseCompactSelect(page, label, option) {
  const trigger = page.getByRole("button", { name: new RegExp(`^${label}:`) });
  await moveAndClick(trigger);
  await moveAndClick(page.getByRole("option", { name: option, exact: true }));
}

async function waitForPackage(page) {
  await page.getByRole("button", { name: "Characters", exact: true }).waitFor({
    state: "visible",
    timeout: 5 * 60 * 1000,
  });
}

async function showTab(page, name, pauseMilliseconds = 3000) {
  await moveAndClick(page.getByRole("button", { name, exact: true }));
  await sleep(pauseMilliseconds);
}

async function main() {
  const context = await chromium.launchPersistentContext("./recording-profile", {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 1000 },
    downloadsPath: "./downloads",
    slowMo: 80,
  });
  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Creative brief" }).waitFor({ state: "visible", timeout: 60_000 });

    console.log(`ClipCraft is ready. Start OBS now; generation begins in ${startDelaySeconds} seconds.`);
    await sleep(startDelaySeconds * 1000);

    const storyIdea = page.getByLabel(/Story idea/);
    await storyIdea.scrollIntoViewIfNeeded();
    await storyIdea.hover();
    await sleep(500);
    await storyIdea.fill(brief);
    await sleep(700);

    await chooseCompactSelect(page, "Language", "Auto (Best Market)");
    await chooseCompactSelect(page, "Genre", "Cute Kid Funny");
    await chooseCompactSelect(page, "Visual style", "3D Pixar Animation");

    const researchCheckbox = page.getByRole("checkbox", { name: "Add YouTube and public web research to inform your story" });
    if (!(await researchCheckbox.isChecked())) {
      await moveAndClick(researchCheckbox);
    }

    const autoApproveCheckbox = page.getByRole("checkbox", { name: "Auto-approve the AI story" });
    if (mode === "auto" && !(await autoApproveCheckbox.isChecked())) {
      await moveAndClick(autoApproveCheckbox);
    }
    if (mode === "manual" && (await autoApproveCheckbox.isChecked())) {
      await moveAndClick(autoApproveCheckbox);
    }

    await moveAndClick(page.getByRole("button", { name: "Generate story", exact: true }));
    console.log("Generation started. Waiting for the real workflow...");

    if (mode === "manual") {
      await page.getByRole("button", { name: "Approve story and generate prompts", exact: true }).waitFor({
        state: "visible",
        timeout: 5 * 60 * 1000,
      });
      await sleep(2500);
      await moveAndClick(page.getByRole("button", { name: "Approve story and generate prompts", exact: true }));
    }

    await waitForPackage(page);
    await sleep(2500);
    await showTab(page, "Characters");
    await showTab(page, "Clips");
    await showTab(page, "Thumbnail");
    await showTab(page, "SEO");

    await page.getByRole("button", { name: "Download package", exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Download package", exact: true }).hover();
    await sleep(1000);
    await page.getByRole("button", { name: "Download package", exact: true }).click();
    await sleep(3000);
    await showTab(page, "Story", 4000);
    console.log("Demo flow complete. Leave this browser frame visible and stop OBS manually.");
    await new Promise(() => {});
  } catch (error) {
    console.error("Recording agent stopped:", error);
    await page.screenshot({ path: "./recording-agent-error.png", fullPage: true }).catch(() => {});
    await context.close();
    process.exitCode = 1;
  }
}

main();
