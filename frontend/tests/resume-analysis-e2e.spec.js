
import { test, expect } from '@playwright/test'
import fs from 'node:fs'

test('Resume Analysis end-to-end: upload PDF, call API, display results', async ({ page }) => {
  test.setTimeout(90000)

  const resumePath = 'C:\\Users\\anshu\\OneDrive\\Desktop\\resume.pdf'

  expect(
    fs.existsSync(resumePath),
    `Test PDF nahi mila: ${resumePath}`
  ).toBeTruthy()

  const pageErrors = []
  const consoleErrors = []

  page.on('pageerror', error => pageErrors.push(error.message))

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  // Create a unique test account.
  const email = `playwright-resume-${Date.now()}@example.com`
  const password = 'SkillBridgeE2E!2026'

  const registerResponse = await page.request.post(
    'http://127.0.0.1:8000/auth/register',
    {
      data: {
        name: 'Resume E2E Test User',
        email,
        password,
      },
    }
  )

  expect(
    registerResponse.status(),
    'Test user registration failed'
  ).toBe(200)

  // Login using the real backend authentication endpoint.
  const loginResponse = await page.request.post(
    'http://127.0.0.1:8000/auth/login',
    {
      form: {
        username: email,
        password,
      },
    }
  )

  expect(
    loginResponse.status(),
    'Backend login failed'
  ).toBe(200)

  const loginData = await loginResponse.json()

  expect(loginData.access_token).toBeTruthy()

  console.log('PASS: Real backend authentication successful')

  // Set authenticated user data before opening the frontend.
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('skillbridge_logged_in', 'true')
    localStorage.setItem('skillbridge_access_token', token)
    localStorage.setItem('skillbridge_user', JSON.stringify(user))
  }, {
    token: loginData.access_token,
    user: {
      name: 'Resume E2E Test User',
      email,
    },
  })

  await page.goto('/resume-analysis', {
    waitUntil: 'domcontentloaded',
  })

  const fileInput = page.locator('input[type="file"]').first()

  await expect(fileInput).toBeAttached({ timeout: 15000 })

  await fileInput.setInputFiles(resumePath)

  console.log('PASS: PDF file selected')

  const analyzeButton = page.getByRole('button', {
    name: /analy[sz]e.*resume|analy[sz]e|check resume/i,
  }).last()

  await expect(analyzeButton).toBeVisible({ timeout: 10000 })
  await expect(analyzeButton).toBeEnabled({ timeout: 10000 })

  const apiResponsePromise = page.waitForResponse(
    response =>
      response.url().includes('/resume/analyze') &&
      response.request().method() === 'POST',
    { timeout: 60000 }
  )

  await analyzeButton.click()

  const apiResponse = await apiResponsePromise
  const status = apiResponse.status()
  const payload = await apiResponse.json()

  console.log('Resume API HTTP status:', status)
  console.log('Resume API success:', payload.success)

  expect(status).toBe(200)
  expect(payload.success).toBe(true)
  expect(payload.analysis).toBeTruthy()

  const results = page.locator('.resume-results')

  await expect(results).toBeVisible({ timeout: 20000 })

  await expect(
    page.locator('.resume-score-card').first()
  ).toBeVisible({ timeout: 15000 })

  console.log(
    'PASS: Resume analysis results displayed',
    (await results.innerText()).slice(0, 2500)
  )

  expect(pageErrors, 'Frontend uncaught errors').toEqual([])

  console.log('Browser console errors:', JSON.stringify(consoleErrors))
  console.log('RESUME ANALYSIS E2E: ALL CHECKS PASSED')
})