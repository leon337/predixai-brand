const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173" });

const PACKAGE_URL = "/funcionario-ia-gratis/?package=health-medical-testing-clinic-aurora&new=1";
const GENERIC_URL = "/funcionario-ia-gratis/?new=1";
const COMPONENT_BASE = path.resolve(
  __dirname,
  "../../data/employee-simulations/health/medical-testing-clinic"
);

const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(COMPONENT_BASE, filename), "utf8"));
const readText = (filename) => fs.readFileSync(path.join(COMPONENT_BASE, filename), "utf8");

const buildPackageFixture = () => {
  const evidence = readJson("publication-evidence.json");
  return {
    packageId: "health-medical-testing-clinic-aurora",
    contentVersion: "0.1.0",
    source: "github_build_fallback",
    status: "READY",
    payload: {
      businessProfile: readJson("business-profile.json"),
      questions: readJson("questions-and-suggested-answers.json"),
      services: readJson("services-catalog.json"),
      operations: readJson("units-hours-channels.json"),
      scheduling: readJson("scheduling-cancellations.json"),
      paymentsAndInsurance: readJson("payments-insurance.json"),
      faq: readJson("faq.json"),
      handoffRules: readJson("human-handoff.json"),
      scenarios: readJson("scenarios-and-expected-responses.json"),
      agentTemplate: { promptText: readText("operational-prompt.md") }
    },
    checksum: {
      algorithm: "sha256",
      value: "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69",
      verifiedAtPublication: true
    },
    manifest: readJson("master-package.json"),
    inventory: evidence.inventory,
    provenance: {
      repository: evidence.source.repository,
      branch: evidence.source.branch,
      commitSha: evidence.source.commitSha,
      pullRequest: evidence.source.pullRequest,
      publishedAt: evidence.supabase.publishedAt
    },
    warnings: ["SUPABASE_UNAVAILABLE_USING_VERSIONED_BUILD_FALLBACK"]
  };
};

const PACKAGE_FIXTURE = buildPackageFixture();

async function installCatalogRoute(page) {
  await page.route("**/api/workforce-catalog?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(PACKAGE_FIXTURE),
      headers: { "x-predixai-catalog-source": "github_build_fallback" }
    });
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(metrics.scrollWidth, `${label}: rolagem horizontal detectada`).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function ensureRequiredJourneyInput(page, heading) {
  if (heading === "O que você quer melhorar primeiro?") {
    const selected = page.locator('input[name="objective"]:checked');
    if (await selected.count() === 0) await page.locator('input[name="objective"]').first().check();
    return;
  }

  if (heading === "Qual é o ramo do seu negócio?") {
    const segment = page.locator('input[name="segment"]');
    if (!(await segment.inputValue()).trim()) await segment.fill("Clínica de exames");
    return;
  }

  if (heading === "Como esse trabalho é feito atualmente?") {
    const selected = page.locator('input[name="processMode"]:checked');
    if (await selected.count() === 0) await page.locator('input[name="processMode"]').first().check();
    return;
  }

  if (heading === "Onde esse trabalho acontece hoje?") {
    const selected = page.locator('input[name="channels"]:checked');
    if (await selected.count() === 0) await page.locator('input[name="channels"]').first().check();
  }
}

async function advancePackageJourney(page) {
  await installCatalogRoute(page);
  await page.goto(PACKAGE_URL);
  await expect(page.getByText("DADOS FICTÍCIOS PARA DEMONSTRAÇÃO")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Pacote selecionado")).toBeVisible();
  await page.getByRole("button", { name: "Começar" }).click();

  for (const heading of [
    "O que você quer melhorar primeiro?",
    "Qual é o ramo do seu negócio?",
    "Como esse trabalho é feito atualmente?",
    "Onde esse trabalho acontece hoje?"
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await ensureRequiredJourneyInput(page, heading);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByRole("heading", { name: "O que você espera desse funcionário?" })).toBeVisible();
  const selected = page.locator('input[name="desiredResults"]:checked');
  while (await selected.count() > 3) {
    await selected.last().uncheck();
  }
  if (await selected.count() === 0) {
    await page.locator('input[name="desiredResults"]').first().check();
  }
  await page.getByRole("button", { name: "Criar para teste" }).click();
  await expect(page.getByRole("heading", { name: "Encontramos uma configuração para seu teste" })).toBeVisible();
}

async function editPackageQuestion(page, promptText, value) {
  const question = page.locator("[data-package-question]").filter({ hasText: promptText });
  await expect(question).toBeVisible();
  await question.getByLabel("Editar resposta").check();
  const editor = question.locator("[data-package-answer]").first();
  await expect(editor).toBeEnabled();
  if (await editor.evaluate((element) => element.tagName === "SELECT")) {
    await editor.selectOption(value);
  } else {
    await editor.fill(value);
  }
}

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 }
]) {
  test(`LEA-167 projeta Sophia e Clínica Ciame em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await advancePackageJourney(page);

    await expect(page.locator(".k6-recommendation h2")).toHaveText("Clara");
    await expect(page.getByText("Empresa fictícia: Clínica Aurora Diagnósticos")).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name}/recomendação padrão`);

    await page.getByRole("button", { name: "Definir como vai trabalhar" }).click();
    await expect(page.getByRole("heading", { name: "Como Clara vai trabalhar" })).toBeVisible();

    await editPackageQuestion(page, "Qual nome a clínica deve usar durante o teste?", "Clínica Ciame");
    await editPackageQuestion(page, "Qual nome o Atendente de IA deve usar?", "Sophia");

    await expect(page.getByRole("heading", { name: "Como Sophia vai trabalhar" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Clínica Ciame", { exact: true })).toBeVisible();
    await expect(page.getByText(/professional_clear_welcoming|short_to_medium/)).toHaveCount(0);
    await assertNoHorizontalOverflow(page, `${viewport.name}/configuração personalizada`);

    await page.getByRole("button", { name: "Revisar configuração" }).click();
    await expect(page.getByRole("heading", { name: "Revise a configuração" })).toBeVisible();
    const summary = page.locator(".k6-summary-list").filter({ hasText: "Funcionário" });
    await expect(summary).toContainText("Sophia");
    await expect(summary).toContainText("Clínica Ciame");
    await expect(summary).toContainText("Segmento");
    await expect(summary).not.toContainText("professional_clear_welcoming");
    await expect(summary).not.toContainText("short_to_medium");
    await assertNoHorizontalOverflow(page, `${viewport.name}/revisão personalizada`);
  });
}

test("LEA-167 preserva o criador genérico sem resíduos do pacote", async ({ page }) => {
  await page.goto(GENERIC_URL);
  await expect(page.getByRole("heading", { name: "Crie um Funcionário de IA para testar" })).toBeVisible();
  await expect(page.getByText("Usar o pacote fictício de Clínica de exames")).toBeVisible();
  await expect(page.getByText("DADOS FICTÍCIOS PARA DEMONSTRAÇÃO")).toHaveCount(0);
  await expect(page.getByText("Sophia", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Clínica Ciame", { exact: true })).toHaveCount(0);
  await assertNoHorizontalOverflow(page, "criador genérico");
});
