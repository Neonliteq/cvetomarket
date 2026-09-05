import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "seller-1",
  email: "seller@example.test",
  name: "Тестовый продавец",
  role: "shop",
};

const shop = {
  id: "shop-1",
  ownerId: user.id,
  name: "Тестовый магазин",
  status: "approved",
  rating: "5",
  reviewCount: 0,
};

const products = [
  {
    id: "product-1",
    shopId: shop.id,
    name: "Первый товар",
    description: "",
    composition: "",
    price: "1000",
    images: [],
    tags: [],
    assemblyTime: 60,
    inStock: true,
    isActive: true,
    discountPercent: 0,
    isRecommended: false,
    type: "bouquet",
  },
  {
    id: "product-2",
    shopId: shop.id,
    name: "Второй товар",
    description: "",
    composition: "",
    price: "2000",
    images: [],
    tags: [],
    assemblyTime: 60,
    inStock: true,
    isActive: true,
    discountPercent: 0,
    isRecommended: false,
    type: "bouquet",
  },
];

async function mockDashboardApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    let body: unknown = [];

    if (pathname === "/api/auth/me") body = { user };
    else if (pathname === "/api/shops/my") body = shop;
    else if (pathname === `/api/shops/${shop.id}/products`) body = products;
    else if (pathname.startsWith("/api/product-drafts/")) body = null;
    else if (pathname === "/api/shops/my/workers") body = { workers: [], isOwner: true };
    else if (pathname === "/api/notifications/unread-count") body = { count: 0 };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function navigateInApp(page: Page, path: string) {
  await page.evaluate((nextPath) => {
    history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("cookie_consent_accepted", "true");
    sessionStorage.setItem("push_prompt_dismissed", "1");
    sessionStorage.setItem("ios_install_dismissed", "1");
  });
  await mockDashboardApi(page);
});

test("restores an unsaved new product after an immediate mobile back navigation", async ({ page }) => {
  await page.goto("/shop-dashboard?tab=products");
  await page.getByTestId("button-add-product").click();
  await expect(page.getByRole("heading", { name: "Новый товар" })).toBeVisible();

  const nameInput = page.getByLabel("Название");
  await nameInput.fill("Черновик после жеста назад");
  await page.goBack();

  await expect(page.getByTestId("button-add-product")).toBeVisible();
  await page.getByTestId("button-add-product").click();

  await expect(page.getByText("Черновик восстановлен")).toBeVisible();
  await expect(page.getByLabel("Название")).toHaveValue("Черновик после жеста назад");
});

test("keeps separate drafts when navigating directly between two products", async ({ page }) => {
  await page.goto("/shop-dashboard/products/product-1/edit");
  await page.getByLabel("Название").fill("Черновик первого товара");

  await navigateInApp(page, "/shop-dashboard/products/product-2/edit");
  await page.getByLabel("Название").fill("Черновик второго товара");

  await navigateInApp(page, "/shop-dashboard/products/product-1/edit");
  await expect(page.getByLabel("Название")).toHaveValue("Черновик первого товара");

  await navigateInApp(page, "/shop-dashboard/products/product-2/edit");
  await expect(page.getByLabel("Название")).toHaveValue("Черновик второго товара");
});