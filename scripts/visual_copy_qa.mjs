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

  await page.getByRole("button", { name: /抗蒸小记/ }).first().click();
  await page.getByRole("heading", { name: "有些东西，蒸不走" }).waitFor();
  assert.deepEqual(await page.locator(".theory-card h2, .dimension-grid > h2").allInnerTexts(), [
    "一、蒸馏之后",
    "二、三层功夫",
    "三、六面见人",
    "四、放手之物",
    "五、留手之物",
  ]);
  assert.deepEqual(await page.locator(".dimension-grid article > strong").allInnerTexts(), ["情境", "边界", "重构", "审美", "取舍", "经验"]);
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
  await page.locator(".question-card h1").waitFor();
  const questionMetrics = await checkPageWidth(page, `${profile.name}/答题`);
  if (profile.name === "desktop") {
    assert.deepEqual(await page.locator(".quiz-side nav button").allInnerTexts(), ["继续答题", "答题须知", "抗蒸小记"]);
    assert.equal((await page.locator(".quiz-side > button").last().innerText()).trim(), "退出重测");
  }
  await page.screenshot({ path: `${outputDir}/${profile.name}-question.png`, fullPage: true });
  const answered = await answerToResult(page);
  assert.ok(answered >= 14 && answered <= 24, `${profile.name} 实际答题数异常：${answered}`);
  const resultMetrics = await checkPageWidth(page, `${profile.name}/结果`);
  const expectedResultSections = profile.name === "desktop"
    ? ["判断底色", "结果小传", "工作映照", "六维侧影", "结果解读"]
    : ["判断底色", "结果小传", "六维侧影", "结果解读"];
  assert.deepEqual(await page.locator(".result-card h2").allInnerTexts(), expectedResultSections);
  assert.equal((await page.locator(".share-panel strong").innerText()).trim(), "分享文案");
  if (profile.name === "desktop") {
    await page.locator(".role-card").waitFor();
    const roleCopy = await page.locator(".role-card").innerText();
    assert.match(roleCopy, /工作映照/);
    assert.match(roleCopy, /偏低|偏高|中等/);
  }
  await page.screenshot({ path: `${outputDir}/${profile.name}-result.png`, fullPage: true });

  await page.locator(".share-panel button").click();
  await page.getByText(/完整文案已复制/).first().waitFor();
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  const resultScore = (await page.locator(".score-number strong").innerText()).trim();
  const resultBand = (await page.locator(".band-block h2").innerText()).trim();
  const resultLabel = (await page.locator(".label-card h3").innerText()).trim();
  assert.ok([...copiedText].length >= 180, `${profile.name} 分享文案过短`);
  for (const expected of [resultScore, resultBand, resultLabel, "#抗蒸性测试"]) {
    assert.ok(copiedText.includes(expected), `${profile.name} 分享文案缺少 ${expected}`);
  }
  assert.ok(copiedText.split("\n\n").length >= 5, `${profile.name} 分享文案缺少段落层次`);

  await page.locator(".label-card button").click();
  const drawer = page.locator(".detail-drawer");
  await drawer.waitFor();
  await expectCount(page.getByText("标签释义", { exact: true }), 1, `${profile.name} 标签详情缺少“标签释义”`);
  await expectCount(page.getByText("题外一笔", { exact: true }), 1, `${profile.name} 标签详情缺少“题外一笔”`);

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
  return { name: profile.name, answered, homeMetrics, theoryMetrics, workMetrics, questionMetrics, resultMetrics, drawerMetrics };
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
