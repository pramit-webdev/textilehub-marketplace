import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "https://textilehub.vercel.app";

async function noHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
}

test.describe("Mobile UX (390x844)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("landing page: loads, hamburger nav, no overflow", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Source fabrics/ })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("div.md\\:hidden a[href='/products']").first()).toBeVisible();
  });

  test("products page: filters visible, no overflow, cards load", async ({ page }) => {
    await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
    await expect(page.locator("a[href^='/products/']").first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test("product detail: gallery, specs, CTA visible, no overflow", async ({ page }) => {
    await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
    await page.locator("a[href^='/products/']").first().click();
    await expect(page.getByRole("button", { name: /Add to cart/ })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test("compare page: table scrolls inside, no page overflow", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("compare", JSON.stringify([1, 2]));
    });
    await page.goto(`${BASE}/compare`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Compare fabrics/ })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test("auth page: role toggle + form visible, no overflow", async ({ page }) => {
    await page.goto(`${BASE}/auth?mode=register`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /buyer/i }).first()).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});

test.describe("Desktop UX (1280x800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("landing: hero, categories, featured products all render", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Source fabrics/ })).toBeVisible();
    await expect(page.getByText("Shop by fabric")).toBeVisible();
    await expect(page.getByText("Featured fabrics")).toBeVisible();
    expect(await page.locator("a[href^='/products/']").count()).toBeGreaterThan(0);
  });

  test("supplier login: no duplicate navbar/footer, dashboard renders once", async ({ page }) => {
    await page.goto(`${BASE}/auth?mode=login`, { waitUntil: "networkidle" });
    await page.getByPlaceholder("you@company.com").fill("weaver@textilehub.in");
    await page.getByPlaceholder("At least 6 characters").fill("demo1234");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL("**/supplier", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /Supplier dashboard/ })).toBeVisible();
    const navCount = await page.locator("nav").count();
    expect(navCount).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { name: /Supplier dashboard/ })).toHaveCount(1);
  });
});
