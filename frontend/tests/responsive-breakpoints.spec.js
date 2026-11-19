import { test, expect } from '@playwright/test'

const protectedRoutes = [
  '/dashboard',
  '/career-analysis',
  '/skills',
  '/roadmap',
  '/progress',
  '/settings',
  '/github-analysis',
  '/resume-analysis',
]

const viewports = [
  { name: 'Small Mobile', width: 320, height: 800 },
  { name: 'Mobile', width: 360, height: 800 },
  { name: 'Large Mobile', width: 414, height: 896 },
  { name: 'Small Laptop', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1366, height: 768 },
]

test.describe('SkillBridge AI Cross-Device Responsive Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('skillbridge_logged_in', 'true')
      localStorage.setItem(
        'skillbridge_user',
        JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
        })
      )
    })
  })

  for (const viewport of viewports) {
    for (const route of protectedRoutes) {
      test(`${viewport.name} ${viewport.width}px - ${route}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })

        await page.goto(route)

        await expect(page.locator('body')).toBeVisible()

        const actualWidth = await page.evaluate(() => window.innerWidth)
        expect(actualWidth).toBe(viewport.width)

        const bodyText = await page.locator('body').innerText()
        expect(bodyText.trim().length).toBeGreaterThan(20)

        const layout = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        }))

        expect(
          layout.documentWidth,
          `Document horizontal overflow on ${route} at ${viewport.width}px`
        ).toBeLessThanOrEqual(viewport.width + 1)

        expect(
          layout.bodyWidth,
          `Body horizontal overflow on ${route} at ${viewport.width}px`
        ).toBeLessThanOrEqual(viewport.width + 1)
      })
    }
  }
})
