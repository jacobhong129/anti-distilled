import { test, expect } from "@playwright/test";
import gameConfig from "../../config/game-config-v11.json" with { type: "json" };
import { AdaptiveAssessment } from "../../src/engine/adaptive-engine.js";
import { loadPersonaRegistry, selectPersonas } from "./persona-schema.mjs";
import { rankOptionsSemantically } from "./semantic-model.mjs";

const TARGET_PERSONAS = ["X99", "U17", "U21", "U25", "U30"];
const questionByText = new Map(gameConfig.items.map((item) => [item.question, item]));

function replayObservedChoices(choices) {
  const assessment = new AdaptiveAssessment(gameConfig);
  assessment.start({ skipped: true });
  for (const choice of choices) {
    assessment.currentItem = gameConfig.items.find((item) => item.id === choice.itemId);
    assessment.answerCurrent(choice.optionKey);
  }
  return assessment.result();
}

async function runPersonaOnPage(page, persona) {
  await page.goto("/");
  await page.getByRole("button", { name: /开始测试/ }).first().click();

  const choices = [];
  for (let guard = 0; guard < 32; guard += 1) {
    const resultHeading = page.getByRole("heading", { name: "你的含活人量" });
    if (await resultHeading.isVisible().catch(() => false)) break;

    const question = await page.locator(".question-card h1").innerText();
    const item = questionByText.get(question);
    expect(item, `question exists in config: ${question}`).toBeTruthy();
    const buttons = await page.locator(".option-card").all();
    const buttonRows = [];
    for (const button of buttons) {
      const text = (await button.locator("span:not(.option-index)").innerText()).trim();
      const option = item.options.find((candidate) => candidate.text === text);
      expect(option, `option exists in config: ${text}`).toBeTruthy();
      buttonRows.push({ button, option });
    }
    const ranked = rankOptionsSemantically(item, buttonRows.map((row) => row.option), persona, {
      seed: `app:${persona.id}:${guard + 1}:${item.id}`,
    });
    const chosen = ranked[0].option;
    choices.push({ itemId: item.id, optionKey: chosen.key, optionText: chosen.text });
    const chosenButton = buttonRows.find((row) => row.option.key === chosen.key).button;
    await chosenButton.click();
    await page.waitForFunction(
      (previousQuestion) => {
        const resultVisible = [...document.querySelectorAll("h1")].some((heading) => heading.textContent?.trim() === "你的含活人量");
        const currentQuestion = document.querySelector(".question-card h1")?.textContent?.trim();
        return resultVisible || (currentQuestion && currentQuestion !== previousQuestion);
      },
      question,
      { timeout: 8000 }
    );
  }

  await expect(page.getByRole("heading", { name: "你的含活人量" })).toBeVisible();
  const pageScore = Number.parseInt(await page.locator(".score-number strong").innerText(), 10);
  const pageBand = (await page.locator(".band-block h2").innerText()).trim();
  const pageLabel = (await page.locator(".label-card h2").innerText()).trim();
  const replay = replayObservedChoices(choices);

  return {
    choices,
    pageScore,
    pageBand,
    pageLabel,
    replayScore: replay.score,
    replayBand: replay.band.name,
    replayLabel: replay.labelDetails.name,
  };
}

test.describe("simulator app integration", () => {
  const registry = loadPersonaRegistry();
  const personas = selectPersonas(registry, { ids: TARGET_PERSONAS, includeStress: true });

  for (const persona of personas) {
    test(`${persona.id} completes the real page flow and matches engine replay`, async ({ page }) => {
      const result = await runPersonaOnPage(page, persona);
      expect(result.choices.length).toBeGreaterThanOrEqual(14);
      expect(result.pageScore).toBe(result.replayScore);
      expect(result.pageBand).toBe(result.replayBand);
      expect(result.pageLabel).toBe(result.replayLabel);
      await expect(page.locator(".dimension-card")).toBeVisible();
      await expect(page.getByRole("button", { name: /生成我的分享卡/ })).toBeVisible();
      await expect(page.locator(".evidence-card")).toBeVisible();
    });
  }
});
