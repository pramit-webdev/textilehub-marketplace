import { test, expect } from "@playwright/test";

const ts = Date.now();

test.describe("Supplier journey (UI)", () => {
  test("login -> dashboard widgets -> product CRUD -> orders", async ({ page }) => {
    await page.goto("/auth");

    await page.getByPlaceholder("you@company.com").fill("weaver@textilehub.in");
    await page.getByPlaceholder("At least 6 characters").fill("demo1234");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/supplier/);
    await expect(page.getByRole("heading", { name: "Supplier dashboard" })).toBeVisible();
    await expect(page.getByText("Total products")).toBeVisible();

    // Create a product
    await page.goto("/supplier/products");
    await page.getByRole("button", { name: /Add product/ }).first().click();
    const form = page.locator("form");
    const name = `E2E-Browser-${ts}`;
    await form.getByText("Product name *").locator("..").locator("input").fill(name);
    await form.getByText("Description *").locator("..").locator("textarea").fill("created by automated browser test");
    await form.locator("select").selectOption({ index: 1 });
    await form.getByText("Fabric type *").locator("..").locator("input").fill("Cotton");
    await form.getByText("Price (₹) *").locator("..").locator("input").fill("150");
    await form.getByText("MOQ *").locator("..").locator("input").fill("10");
    await form.getByText("Stock *").locator("..").locator("input").fill("25");
    await form.getByRole("button", { name: "Create product" }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });

    // Delete it (unordered -> hard delete)
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });

    // Orders page renders with status filter tabs
    await page.goto("/supplier/orders");
    await expect(page.getByText(/Incoming orders|Orders/).first()).toBeVisible();
  });
});
