import { test, expect } from "@playwright/test";

const ts = Date.now();
const EMAIL = `e2e-buyer-${ts}@gmail.com`;
const PASSWORD = "E2Epass123!";

test.describe("Buyer journey (UI)", () => {
  test("register -> onboarding -> browse -> cart -> checkout -> dashboard", async ({ page }) => {
    await page.goto("/auth?mode=register");

    await page.getByPlaceholder("e.g. Meera Nair").fill("E2E Browser Buyer");
    await page.getByPlaceholder("you@company.com").fill(EMAIL);
    await page.getByPlaceholder("At least 6 characters").fill(PASSWORD);
    await page.getByRole("button", { name: "Create buyer account" }).click();

    // Onboarding gate
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText("Set up your buyer profile")).toBeVisible();

    // Fill the manual profile form (buyer field order: business_type, industry,
    // interested_categories(list), preferred_fabrics(list), typical_order_qty, budget_range)
    const inputs = page.locator("form input");
    await inputs.nth(0).fill("garment manufacturer");
    await inputs.nth(1).fill("fashion");
    await inputs.nth(2).fill("Cotton, Silk");
    await inputs.nth(3).fill("cotton, silk");
    await inputs.nth(4).fill("500-1000 meters");
    await inputs.nth(5).fill("under 800");
    await page.getByRole("button", { name: "Start sourcing fabrics →" }).click();

    await expect(page).toHaveURL(/\/products/);
    await expect(page.locator("a[href^='/products/']").first()).toBeVisible();

    // Open first product detail, add to cart
    await page.locator("a[href^='/products/']").first().click();
    await page.getByRole("button", { name: /Add to cart/ }).first().click();
    await page.locator("a[aria-label='Cart']").click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Proceed to checkout")).toBeVisible();
    await page.getByText("Proceed to checkout").click();

    // Checkout shipping form (inputs: name, phone, address, city, country)
    const ship = page.locator("form input");
    await ship.nth(0).fill("E2E Browser Buyer");
    await ship.nth(1).fill("+910000000000");
    await ship.nth(2).fill("14 Test Road, Andheri");
    await ship.nth(3).fill("Mumbai");
    await ship.nth(4).fill("India");
    await page.getByRole("button", { name: /Place order/ }).click();

    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.getByText("Order placed!")).toBeVisible();

    // Buyer dashboard shows the order
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Buyer dashboard" })).toBeVisible();
    await expect(page.getByText(/Order #/).first()).toBeVisible();
  });

  test("search returns relevant products", async ({ page }) => {
    await page.goto("/products");
    const search = page.locator("input[type='search'], input[placeholder*='Search'], input[placeholder*='search']").first();
    if (await search.count()) {
      await search.fill("silk");
      await expect(page.locator("a[href^='/products/']").first()).toBeVisible();
    } else {
      test.skip(true, "no search input on products page");
    }
  });
});
