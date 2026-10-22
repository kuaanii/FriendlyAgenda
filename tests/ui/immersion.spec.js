import { test, expect } from "@playwright/test";

test("el menú lateral se oculta y se recupera sin cambiar la agenda", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ocultar menú lateral", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".book .day")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Ampliar agenda", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salir del modo agenda", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page
    .getByRole("button", { name: "Mostrar menú lateral", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toBeVisible();
});

test("la agenda ocupa la ventana y se puede volver a la página principal", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await page.locator(".book").boundingBox();
  const editor = page.getByRole("textbox", { name: /Notas del/ }).first();
  await editor.fill("Una nota que permanece al ampliar.");
  await page
    .getByRole("button", { name: "Ampliar agenda", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".welcome")).toBeHidden();
  const enlarged = await page.locator(".book").boundingBox();
  expect(enlarged.width).toBeGreaterThan(initial.width);
  expect(enlarged.height).toBeGreaterThan(initial.height);
  expect(enlarged.height).toBeGreaterThan(800);
  await expect(editor).toHaveText("Una nota que permanece al ampliar.");
  await page.screenshot({ path: "docs/screenshots/agenda-inmersiva.png" });
  await page
    .getByRole("button", { name: /Añadir apunte al/ })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Salir del modo agenda", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".welcome")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(editor).toHaveText("Una nota que permanece al ampliar.");
  await page.getByRole("button", { name: "Tema oscuro", exact: true }).click();
  await page
    .getByRole("button", { name: "Ampliar agenda", exact: true })
    .click();
  await page.screenshot({
    path: "docs/screenshots/agenda-inmersiva-oscura.png",
  });
});

test("sin barras visibles y con notas largas accesibles en ventana compacta", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.goto("/");
  expect(
    await page
      .locator("html")
      .evaluate((e) => getComputedStyle(e).scrollbarWidth),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Ampliar agenda", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: /Notas del/ })
    .first()
    .fill(Array.from({ length: 60 }, (_, i) => `Línea ${i + 1}`).join("\n"));
  await page.locator(".day").first().hover();
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() =>
      page
        .locator(".day")
        .first()
        .evaluate((e) => e.scrollTop),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/agenda-inmersiva-compacta.png",
  });
  await page
    .getByRole("button", { name: "Salir del modo agenda", exact: true })
    .click();
  await expect(page.locator(".welcome")).toBeVisible();
});
