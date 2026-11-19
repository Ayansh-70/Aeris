import { expect, test, type Page } from "@playwright/test";

async function navigate(page: Page, name: string, mobile: boolean) {
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("aside").getByRole("link", { name, exact: true }).click();
}

test("a household can personalize, plan, compare and track its actions", async ({
  page,
  isMobile,
}, testInfo) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your clean-air briefing/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to sample data" }).click();
  await page.screenshot({ path: testInfo.outputPath("landing.png") });
  await page.getByRole("link", { name: "Set up my household" }).click();
  await page.getByRole("button", { name: "Delhi", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Student or professional").check();
  await page.getByLabel("Older adults live here").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("One-way distance (km)").fill("12");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Reduce emissions").check();
  await page.getByRole("button", { name: "Save my profile" }).click();
  await expect(
    page.getByRole("heading", { name: /Air dashboard/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Your household briefing for Delhi."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pollutant breakdown" }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save action" }).first().click();
  await page.getByRole("link", { name: "Ask Vayu", exact: true }).click();
  await page.getByRole("button", { name: /Would switching to rail/ }).click();
  await expect(page.getByRole("log")).toContainText(
    /Rule-based guidance|AI assisted/,
  );

  await navigate(page, "Daily planner", isMobile);
  await page.getByRole("button", { name: "Regenerate" }).click();
  await page.getByRole("button", { name: "Save plan" }).click();
  await page.getByRole("checkbox").first().check();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.getByText(/Saved plan · 1 of/)).toBeVisible();
  await navigate(page, "Transport", isMobile);
  await page.getByLabel("Alternative mode").selectOption("Bus");
  await page.getByLabel("One-way distance in kilometers").fill("10");
  await expect(page.getByText("5.887", { exact: false })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Travel and impact tools" })
    .getByRole("link", { name: "Impact calculator" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Impact calculator" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "What-if scenarios" }).click();
  await page
    .getByLabel("Change to explore")
    .selectOption("Outdoor exercise time");
  await expect(page.getByLabel("Proposed time")).toBeVisible();
  await navigate(page, "Indoor air", isMobile);
  await page.getByRole("button", { name: "Save action" }).first().click();
  await expect(
    page.getByRole("button", { name: "Saved action" }),
  ).toBeVisible();
  await navigate(page, "Community", isMobile);
  const challenge = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Public transport week" }),
    });
  await challenge.getByRole("button", { name: "Join challenge" }).click();
  await challenge.getByRole("button", { name: /Log today/ }).click();
  await page.reload();
  await expect(
    challenge.getByRole("button", { name: "Logged today" }),
  ).toBeDisabled();
  await navigate(page, "Air dashboard", isMobile);
  await expect(
    page.getByText(/1 saved recommendation.*1 plan step/),
  ).toBeVisible();
  await navigate(page, "Settings", isMobile);
  await expect(page.getByText(/Commuter · Delhi/)).toBeVisible();
  await page.getByRole("button", { name: "Clear local data" }).click();
  await page.getByRole("button", { name: "Clear device data" }).click();
  await expect(
    page.getByRole("heading", { name: "Where do you live?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("aeris:profile")),
  ).toBeNull();
  expect(failures).toEqual([]);
});

test("a provider outage leaves the user in control of sample mode", async ({
  page,
}) => {
  await page.route("**/api/air-quality?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("mode") === "live") {
      await route.fulfill({
        status: 503,
        json: { error: "Provider unavailable" },
      });
    } else await route.continue();
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pollutant breakdown" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use Sample Data", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pollutant breakdown" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch to live data" }),
  ).toBeVisible();
});
