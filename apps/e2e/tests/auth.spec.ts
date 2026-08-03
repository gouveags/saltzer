import { expect, test } from "@playwright/test";

test("registration and sign-in share one stable, accessible contract card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Your backlog is not your life.")).toBeVisible();

  const authCard = page.getByTestId("auth-card");
  const signUpCard = await authCard.boundingBox();
  expect(signUpCard).not.toBeNull();
  await expect(page).toHaveScreenshot("auth-register.png");

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Enter Saltzer" })).toBeVisible();

  const signInCard = await authCard.boundingBox();
  expect(signInCard).toEqual(signUpCard);

  const emailField = page.getByRole("textbox", { name: "Email" });
  await emailField.focus();
  await expect(emailField).toHaveCSS("outline-style", "none");
  await expect(emailField).toHaveCSS("border-bottom-color", "rgb(240, 106, 72)");
  await expect(page).toHaveScreenshot("auth-sign-in-focused.png");
});

test("the auth composition remains usable on a small screen", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await expect(page.getByText("Your backlog is not your life.")).toBeVisible();
  await expect(page.getByTestId("auth-card")).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(0);
  await expect(page).toHaveScreenshot("auth-register-mobile.png", {
    fullPage: true,
  });
});
