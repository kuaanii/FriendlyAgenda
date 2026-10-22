import { test, expect } from "@playwright/test";

for (const width of [1000, 1440, 1700]) {
  test(`las notas largas quedan dentro de su día en la vista principal a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto("/");
    const firstDay = page.locator(".day").nth(0);
    const nextDay = page.locator(".day").nth(1);
    const initialNext = await nextDay.boundingBox();
    const editor = firstDay.getByRole("textbox");
    await editor.fill(
      Array.from({ length: 80 }, (_, i) => `Línea ${i + 1}`).join("\n"),
    );
    const bounds = await nextDay.boundingBox();
    expect(Math.abs(bounds.y - initialNext.y)).toBeLessThan(2);
    expect(
      await firstDay.evaluate(
        (e) =>
          e.scrollHeight > e.clientHeight &&
          ["auto", "scroll"].includes(getComputedStyle(e).overflowY),
      ),
    ).toBe(true);
    expect(
      await firstDay.evaluate((e) => getComputedStyle(e).scrollbarWidth),
    ).toBe("none");
    await expect(page.getByRole("status").first()).toHaveText("Todo guardado");
    await editor.focus();
    await page.keyboard.press("Control+End", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Última línea accesible");
    await expect
      .poll(async () =>
        (await editor.innerText()).trim().endsWith("Última línea accesible"),
      )
      .toBe(true);
    await expect
      .poll(() => firstDay.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    const finalNext = await nextDay.boundingBox();
    expect(Math.abs(finalNext.y - initialNext.y)).toBeLessThan(2);
    await page.screenshot({
      path: `docs/screenshots/notas-largas-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.locator(".day").first().getByRole("textbox"),
    ).toContainText("Última línea accesible");
  });
}
