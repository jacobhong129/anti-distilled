import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:5173";
const outputDir = "output/playwright";
fs.mkdirSync(outputDir, { recursive: true });

async function checkPageWidth(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `${label} 出现横向溢出：${JSON.stringify(metrics)}`);
  assert.ok(metrics.bodyWidth <= metrics.viewportWidth + 1, `${label} body 出现横向溢出：${JSON.stringify(metrics)}`);
  return metrics;
}

async function answerToResult(page) {
  for (let guard = 0; guard < 32; guard += 1) {
    if (await page.getByRole("heading", { name: "你的含活人量" }).isVisible().catch(() => false)) return guard;
    const question = await page.locator(".question-card h1").innerText();
    const options = page.locator(".option-card");
    const count = await options.count();
    await options.nth(guard % count).click();
    await page.waitForFunction((previous) => {
      const result = [...document.querySelectorAll("h1")].some((node) => node.textContent?.trim() === "你的含活人量");
      const next = document.querySelector(".question-card h1")?.textContent?.trim();
      return result || (next && next !== previous);
    }, question);
  }
  throw new Error("32 题后仍未进入结果页");
}

async function runViewport(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /抗蒸性/ }).waitFor();
  const homeMetrics = await checkPageWidth(page, `${profile.name}/首页`);
  await page.screenshot({ path: `${outputDir}/${profile.name}-home.png`, fullPage: true });

  await page.getByRole("button", { name: /什么是抗蒸性/ }).first().click();
  await page.getByRole("heading", { name: "什么是抗蒸性" }).waitFor();
  const theoryMetrics = await checkPageWidth(page, `${profile.name}/介绍`);
  await page.screenshot({ path: `${outputDir}/${profile.name}-theory.png`, fullPage: true });

  await page.getByRole("button", { name: "开始测试" }).last().click();
  await page.getByRole("heading", { name: "先说说你平时在做什么？" }).waitFor();
  const workMetrics = await checkPageWidth(page, `${profile.name}/工作场景`);
  await page.screenshot({ path: `${outputDir}/${profile.name}-work.png`, fullPage: true });

  if (profile.name === "desktop") {
    const workFields = page.locator(".work-field");
    for (let index = 0; index < await workFields.count(); index += 1) {
      await workFields.nth(index).locator(".radio-option").first().click();
    }
    await page.getByRole("button", { name: /选好了/ }).click();
  } else {
    await page.getByRole("button", { name: /跳过/ }).click();
  }
  const answered = await answerToResult(page);
  assert.ok(answered >= 14 && answered <= 24, `${profile.name} 实际答题数异常：${answered}`);
  const resultMetrics = await checkPageWidth(page, `${profile.name}/结果`);
  if (profile.name === "desktop") {
    await page.locator(".role-card").waitFor();
    assert.match(await page.locator(".role-card").innerText(), /岗位接手风险/);
  }
  await page.screenshot({ path: `${outputDir}/${profile.name}-result.png`, fullPage: true });

  await page.locator(".share-card button").click();
  await page.getByText(/文案已复制|已经复制好了/).first().waitFor();

  await page.locator(".label-card button").click();
  const drawer = page.locator(".detail-drawer");
  await drawer.waitFor();
  await expectCount(page.getByText("翻成人话", { exact: true }), 1, `${profile.name} 标签详情缺少“翻成人话”`);
  await expectCount(page.getByText("顺手说一句", { exact: true }), 1, `${profile.name} 标签详情缺少“顺手说一句”`);

  await page.getByRole("button", { name: "维度详情" }).click();
  const dimensionButtons = page.locator(".detail-dim-selector button");
  assert.equal(await dimensionButtons.count(), 6, `${profile.name} 维度选择器数量不为 6`);
  const firstTitle = await page.locator("#detail-title").innerText();
  await dimensionButtons.nth(1).click();
  const secondTitle = await page.locator("#detail-title").innerText();
  assert.notEqual(secondTitle, firstTitle, `${profile.name} 切换维度后标题未变化`);
  const drawerMetrics = await drawer.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY,
  }));
  if (profile.name === "mobile") {
    assert.ok(["auto", "scroll"].includes(drawerMetrics.overflowY), `移动端弹窗不可滚动：${JSON.stringify(drawerMetrics)}`);
  }
  await page.screenshot({ path: `${outputDir}/${profile.name}-detail.png`, fullPage: true });

  assert.deepEqual(consoleErrors, [], `${profile.name} 控制台报错：${consoleErrors.join(" | ")}`);
  assert.deepEqual(pageErrors, [], `${profile.name} 页面异常：${pageErrors.join(" | ")}`);
  await context.close();
  return { name: profile.name, answered, homeMetrics, theoryMetrics, workMetrics, resultMetrics, drawerMetrics };
}

async function expectCount(locator, minimum, message) {
  assert.ok(await locator.count() >= minimum, message);
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: "desktop", viewport: { width: 1440, height: 1000 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ];
  const results = [];
  for (const profile of profiles) results.push(await runViewport(browser, profile));
  const report = { ok: true, baseURL, generatedAt: new Date().toISOString(), profiles: results };
  fs.writeFileSync(`${outputDir}/v12.1-copy-layout-report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
