const { test, expect } = require("@playwright/test");

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173" });

const PACKAGE_URL = "/funcionario-ia-gratis/?package=health-medical-testing-clinic-aurora&new=1";
const GENERIC_URL = "/funcionario-ia-gratis/?new=1";

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(metrics.scrollWidth, `${label}: rolagem horizontal detectada`).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function advancePackageJourney(page) {
  await page.goto(PACKAGE_URL);
  await expect(page.getByText("DADOS FICTÍCIOS PARA DEMONSTRAÇÃO")).toBeVisible();
  await expect(page.getByText("Pacote selecionado")).toBeVisible();
  await page.getByRole("button", { name: "Começar" }).click();

  for (const heading of [
    "O que você quer melhorar primeiro?",
    "Qual é o ramo do seu negócio?",
    "Como esse trabalho é feito atualmente?",
    "Onde esse trabalho acontece hoje?"
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
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

    await expect(page.getByRole("heading", { name: "Como Sophia vai trabalhar" })).toBeVisible();
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
