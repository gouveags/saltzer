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
    await page.getByRole("textbox", { name: "Outcome" }).fill(title);
    await page.getByRole("textbox", { name: "What done looks like" }).fill(desiredOutcome);
    await page
      .getByRole("textbox", { name: "Context" })
      .fill("This context was deliberately supplied for the current outcome.");
    await page.getByRole("textbox", { name: "Minutes" }).fill("30");
    await page.getByRole("button", { name: "Add to today" }).click();
  }

  await expect(page.getByText("3 OF 3 CHOSEN")).toBeVisible();
  await expect(page.getByText("Choose an outcome", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Focus Choose the real work" }).click();
  await page.getByRole("textbox", { name: "The next move" }).fill("Open the evidence");
  await page.getByRole("button", { name: "Focus this now" }).click();
  await expect(page.getByText("IN FOCUS NOW")).toBeVisible();
  await expect(page.getByText("Open the evidence", { exact: true })).toHaveCount(2);

  await page.reload();
  await expect(page.getByText("IN FOCUS NOW")).toBeVisible();
  await page.getByRole("button", { name: "Check in on current focus" }).click();
  await page.getByRole("textbox", { name: "What changed" }).fill("The evidence is verified");
  await page
    .getByRole("textbox", { name: "Next move if you keep going" })
    .fill("Write the handoff");
  await page.getByRole("button", { name: "Keep going" }).click();
  await expect(page.getByText("Write the handoff", { exact: true })).toHaveCount(2);

  await page.getByRole("button", { name: "Check in on current focus" }).click();
  await page.getByRole("textbox", { name: "What changed" }).fill("Approval is still missing");
  await page.getByRole("button", { name: "I’m blocked" }).click();
  await expect(page.getByText("BLOCKER CAPTURED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unblock Choose the real work" })).toBeVisible();

  await page.getByRole("button", { name: "Unblock Choose the real work" }).click();
  await page.getByRole("button", { name: "Focus this now" }).click();
  await expect(page.getByText("IN FOCUS NOW")).toBeVisible();

  await page
    .getByRole("button", { name: "Show context and decisions for Choose the real work" })
    .click();
  await page.getByRole("button", { name: "Start AI with Choose the real work" }).click();
  await expect(page.getByText("Ready for your AI.")).toBeVisible();
  await expect(page.getByText(/"context": "This context was deliberately supplied/)).toBeVisible();
  await expect(page.getByText(/"nextAction": "Write the handoff"/)).toBeVisible();
  await expect(page.getByText(/"lastProgressNote": "Approval is still missing"/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.getByText("Good morning, E2E.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use dark theme" })).toBeVisible();

  await page.getByLabel("Complete Choose the real work").click();
  await expect(page.getByText("1/3")).toBeVisible();
  await expect(page.getByText("✓ Choose the real work")).toBeVisible();

  await page.getByLabel("Complete Share only useful context").click();
  await page.getByLabel("Complete End the day deliberately").click();
  await expect(page.getByText("3/3")).toBeVisible();
  await page.getByRole("button", { name: "Close the day" }).click();
  await expect(page.getByText("Enough for today.")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("DAY CLOSED")).toBeVisible();
  await expect(page.getByText("Tomorrow begins fresh.")).toBeVisible();
  await expect(page.getByText("CLOSED", { exact: true })).toBeVisible();
});
