import { test, expect } from "@playwright/test"

test("clears the draft after a bad topic response", async ({ page }) => {
  await page.goto("/")
  const result = page.locator("#result")

  await page.getByLabel("Текст заявки").fill("ok")
  await page.getByRole("button", { name: "Разобрать заявку" }).click()
  await expect(result).toContainText("Черновик:")

  await page.getByLabel("Текст заявки").fill("[bad-topic]")
  await page.getByRole("button", { name: "Разобрать заявку" }).click()
  await expect(result).toContainText("Требуется обработать заявку вручную")
  await expect(result).not.toContainText("Черновик:")
})
