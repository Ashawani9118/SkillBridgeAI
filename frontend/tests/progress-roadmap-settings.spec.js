import { test, expect } from '@playwright/test'

// These tests use mocked API responses.
// No real database writes, screenshots or traces.
test.use({
  screenshot: 'off',
  trace: 'off',
})

async function loginAsTestUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('skillbridge_logged_in', 'true')
    localStorage.setItem(
      'skillbridge_user',
      JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        appearance: 'light',
      })
    )
    localStorage.setItem('skillbridge_access_token', 'playwright-test-token')
  })
}

const sampleRoadmap = [
  {
    id: 101,
    step_number: 1,
    title: 'Python Fundamentals',
    description: 'Learn Python basics and programming concepts.',
    completed: false,
  },
  {
    id: 102,
    step_number: 2,
    title: 'SQL Fundamentals',
    description: 'Learn relational databases and SQL queries.',
    completed: true,
  },
]

test.describe('Progress page', () => {
  test('loads saved skills and roadmap progress', async ({ page }) => {
    await loginAsTestUser(page)

    await page.route('**/skills/my', (route) =>
      route.fulfill({
        json: [
          {
            id: 1,
            skill_name: 'Python',
            proficiency: '85%',
          },
          {
            id: 2,
            skill_name: 'SQL',
            proficiency: 'Intermediate',
          },
        ],
      })
    )

    await page.route('**/progress/', (route) =>
      route.fulfill({
        json: {
          completed_steps: 1,
          total_steps: 2,
          remaining_steps: 1,
          progress_percentage: 50,
        },
      })
    )

    await page.route('**/roadmap/', (route) =>
      route.fulfill({
        json: {
          career: 'Data Analyst',
          roadmap: sampleRoadmap,
        },
      })
    )

    await page.goto('/progress')

    await expect(
      page.getByRole('heading', { name: 'Learning Progress' })
    ).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Data Analyst' })).toBeVisible()
    await expect(page.getByText('Python', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('85%')).toBeVisible()
    await expect(page.getByText('1 of 2 roadmap steps completed.')).toBeVisible()

    await expect(
      page.getByRole('progressbar', { name: 'Overall roadmap progress' })
    ).toHaveAttribute('aria-valuenow', '50')

    await page.getByRole('button', { name: /Python/ }).click()

    await expect(page.getByText('SKILL DETAILS')).toBeVisible()
    await expect(page.getByText('Recorded proficiency: 85%')).toBeVisible()
  })

  test('shows API errors and recovers after refresh', async ({ page }) => {
    await loginAsTestUser(page)

    let shouldFail = true

    await page.route('**/skills/my', (route) =>
      route.fulfill({ json: [] })
    )

    await page.route('**/progress/', (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 503,
          json: { detail: 'Progress service temporarily unavailable.' },
        })
      }

      return route.fulfill({
        json: {
          completed_steps: 1,
          total_steps: 2,
          remaining_steps: 1,
          progress_percentage: 50,
        },
      })
    })

    await page.route('**/roadmap/', (route) =>
      route.fulfill({
        json: {
          career: 'Data Analyst',
          roadmap: sampleRoadmap,
        },
      })
    )

    await page.goto('/progress')

    await expect(
      page.getByRole('status').filter({
        hasText: 'Progress service temporarily unavailable.',
      })
    ).toBeVisible()

    const refreshButton = page.getByRole('button', {
      name: 'Refresh Progress',
    })

    await expect(refreshButton).toBeVisible()

    shouldFail = false
    await refreshButton.click()

    await expect(
      page.getByRole('progressbar', { name: 'Overall roadmap progress' })
    ).toHaveAttribute('aria-valuenow', '50')

    await expect(refreshButton).toHaveCount(0)
  })
})

test.describe('Roadmap page', () => {
  test('marks a step complete and refreshes saved roadmap', async ({ page }) => {
    await loginAsTestUser(page)

    let roadmap = sampleRoadmap.map((step) => ({ ...step }))
    let completionSaved = false

    await page.route('**/roadmap/', (route) =>
      route.fulfill({
        json: {
          career: 'Data Analyst',
          roadmap,
        },
      })
    )

    await page.route('**/progress/complete/101', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.fulfill({ status: 405 })
      }

      completionSaved = true
      roadmap = roadmap.map((step) =>
        step.id === 101 ? { ...step, completed: true } : step
      )

      return route.fulfill({
        json: { message: 'Step completed successfully.' },
      })
    })

    await page.goto('/roadmap')

    await expect(
      page.getByRole('heading', { name: 'Your Roadmap' })
    ).toBeVisible()

    await expect(page.getByRole('button', { name: /Python Fundamentals/ })).toBeVisible()

    await page.getByRole('button', {
      name: 'Mark Step Complete',
    }).click()

    await expect.poll(() => completionSaved).toBe(true)

    await expect(
      page.getByRole('status').filter({
        hasText: 'Python Fundamentals has been saved as completed.',
      })
    ).toBeVisible()

    await expect(
      page.getByText('Completed', { exact: true }).first()
    ).toBeVisible()
  })

  test('shows roadmap API error and recovers with Try Again', async ({ page }) => {
    await loginAsTestUser(page)

    let shouldFail = true

    await page.route('**/roadmap/', (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 503,
          json: { detail: 'Roadmap service unavailable.' },
        })
      }

      return route.fulfill({
        json: {
          career: 'Data Analyst',
          roadmap: sampleRoadmap,
        },
      })
    })

    await page.goto('/roadmap')

    await expect(
      page.getByRole('alert').filter({
        hasText: 'Roadmap service unavailable.',
      })
    ).toBeVisible()

    shouldFail = false

    await page.getByRole('button', { name: 'Try Again' }).click()

    await expect(page.getByRole('button', { name: /Python Fundamentals/ })).toBeVisible()
    await expect(page.getByText('Roadmap service unavailable.')).toHaveCount(0)
  })
})

test.describe('Settings page', () => {
  test('switches appearance theme and resets local changes', async ({ page }) => {
    await loginAsTestUser(page)

    await page.route('**/profile/', (route) =>
      route.fulfill({
        status: 404,
        json: { detail: 'Profile not found.' },
      })
    )

    await page.goto('/settings')

    await expect(
      page.getByRole('heading', { name: 'Profile' })
    ).toBeVisible()

    await page.getByRole('button', { name: /Dark/ }).click()
    await expect(page.locator('body')).toHaveClass(/dark-mode/)

    await page.getByRole('button', { name: /Reset/ }).click()

    await expect(page.locator('body')).toHaveClass(/light-mode/)

    await expect(
      page.getByRole('status').filter({
        hasText: 'Local Settings changes have been reset.',
      })
    ).toBeVisible()

    const overrides = await page.evaluate(() =>
      localStorage.getItem('skillbridge_settings_overrides')
    )

    expect(overrides).toBeNull()
  })

  test('validates name and saves profile through mocked API', async ({ page }) => {
    await loginAsTestUser(page)

    let savedPayload = null

    await page.route('**/profile/', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 404,
          json: { detail: 'Profile not found.' },
        })
      }

      if (route.request().method() === 'POST') {
        savedPayload = route.request().postDataJSON()

        return route.fulfill({
          json: {
            full_name: savedPayload.full_name,
            college: savedPayload.college,
            degree: savedPayload.degree,
            location: savedPayload.location,
          },
        })
      }

      return route.fulfill({ status: 405 })
    })

    await page.goto('/settings')

    const nameInput = page.getByPlaceholder('Enter your name')

    await expect(nameInput).toBeVisible()

    await nameInput.fill('')

    await page.getByRole('button', { name: /Save Settings/ }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Please enter your full name.',
      })
    ).toBeVisible()

    expect(savedPayload).toBeNull()

    await nameInput.fill('Test Student')

    await page.getByPlaceholder('Enter your college').fill('Test College')
    await page.getByPlaceholder('Enter your degree').fill('BCA')

    await page.getByRole('button', { name: /Save Settings/ }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Profile successfully saved to database.',
      })
    ).toBeVisible()

    expect(savedPayload).toMatchObject({
      full_name: 'Test Student',
      college: 'Test College',
      degree: 'BCA',
    })

    await expect(page.getByText('✓ Saved')).toBeVisible()
  })
})
