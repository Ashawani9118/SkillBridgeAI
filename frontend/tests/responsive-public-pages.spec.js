import { test, expect } from '@playwright/test'

const publicRoutes = ['/', '/login', '/signup']

const viewports = [
  { name: 'Small Mobile', width: 320, height: 800 },
  { name: 'Mobile', width: 360, height: 800 },
  { name: 'Large Mobile', width: 414, height: 896 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Small Laptop', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1366, height: 768 },
]

test.describe('SkillBridge AI Public Pages Responsive Audit', () => {
  for (const viewport of viewports) {
    for (const route of publicRoutes) {
      test(`${viewport.name} ${viewport.width}px - ${route}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })

        await page.goto(route)
        await expect(page.locator('body')).toBeVisible()

        const bodyText = await page.locator('body').innerText()
        expect(bodyText.trim().length).toBeGreaterThan(20)

        const widths = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }))

        expect(widths.document, `Document overflow on ${route}`).toBeLessThanOrEqual(viewport.width + 1)
        expect(widths.body, `Body overflow on ${route}`).toBeLessThanOrEqual(viewport.width + 1)
      })
    }
  }
})
