import { expect, test } from "@playwright/test";

test("a person can choose, understand, and complete today's contract", async ({ page }) => {
  const email = `e2e-${Date.now()}@saltzer.test`;
  await page.goto("/");

  await page.getByRole("textbox", { name: "Your name" }).fill("E2E Person");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("SaltzerE2E!2026");
  await page.getByRole("button", { name: "Create my day" }).click();
  await expect(page.getByText("Good morning, E2E.")).toBeVisible();

  const outcomes = [
    ["Choose the real work", "Three clear results are visible"],
    ["Share only useful context", "The permission packet is inspectable"],
    ["End the day deliberately", "Completion is visible without creating debt"],
  ] as const;

  for (const [title, desiredOutcome] of outcomes) {
    await page.getByText("Choose an outcome", { exact: true }).click();
    await page.getByRole("textbox", { name: "Prepare the launch note" }).fill(title);
    await page
      .getByRole("textbox", { name: "A concise draft ready for review" })
      .fill(desiredOutcome);
    await page
      .getByRole("textbox", {
        name: "Background, decisions, links, and what has already happened",
      })
      .fill("This context was deliberately supplied for the current outcome.");
    await page.getByRole("textbox", { name: "45" }).fill("30");
    await page.getByRole("button", { name: "Add to today" }).click();
  }

  await expect(page.getByText("3 OF 3 CHOSEN")).toBeVisible();
  await expect(page.getByText("Choose an outcome", { exact: true })).toHaveCount(0);

  await page.getByText("Context & decisions ↓", { exact: true }).first().click();
  await page.getByRole("button", { name: "Start with AI" }).click();
  await expect(page.getByText("Ready for your AI.")).toBeVisible();
  await expect(page.getByText(/"context": "This context was deliberately supplied/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.getByText("Good morning, E2E.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use dark theme" })).toBeVisible();

  await page.getByLabel("Complete Choose the real work").click();
  await expect(page.getByText("1/3")).toBeVisible();
  await expect(page.getByText("✓ Choose the real work")).toBeVisible();
});
