import { expect, type Page, test } from '@playwright/test'

import { fail, hang, MONITORS, mockApi, notFound, ok, paginated, type Scenario } from './mockApi'

interface ScreenCase {
  name: string
  path: string
  scenario?: Scenario
  /** Text that proves the intended state rendered */
  expectText?: string | RegExp
  /** Or an accessible label (skeletons announce themselves with aria-label) */
  expectLabel?: string
}

const cases: ScreenCase[] = [
  { name: 'login', path: '/login', scenario: { signedIn: false }, expectText: 'Вход' },
  { name: 'login-expired', path: '/login?reason=expired', scenario: { signedIn: false }, expectText: /Сессия истекла/ },
  { name: 'register', path: '/register', scenario: { signedIn: false }, expectText: 'Создать аккаунт' },

  { name: 'dashboard', path: '/', expectText: 'Сайт' },
  { name: 'dashboard-loading', path: '/', scenario: { monitors: hang }, expectLabel: 'Загрузка мониторов' },
  { name: 'dashboard-empty', path: '/', scenario: { monitors: ok(paginated([])), summary: ok({ results: [] }) }, expectText: 'Мониторов пока нет' },
  { name: 'dashboard-error', path: '/', scenario: { monitors: fail() }, expectText: 'Не удалось загрузить мониторы' },
  { name: 'dashboard-summary-error', path: '/', scenario: { summary: fail() }, expectText: /Не удалось загрузить статистику/ },
  { name: 'dashboard-filter-empty', path: '/?status=DOWN', scenario: { monitors: ok(paginated([MONITORS[1]])) }, expectText: /Нет мониторов со статусом/ },

  { name: 'monitor', path: '/monitors/1', expectText: 'Последние проверки' },
  { name: 'monitor-30d', path: '/monitors/1?period=30d', expectText: 'Последние проверки' },
  { name: 'monitor-empty-history', path: '/monitors/1', scenario: { incidents: ok(paginated([])), checks: ok(paginated([])), stats: ok({ period: '24h', since: '', until: '', bucket_sec: 900, checks_total: 0, checks_failed: 0, uptime_pct: null, avg_response_ms: null, p95_response_ms: null, incidents_count: 0, series: [] }) }, expectText: 'Проверок ещё не было' },
  { name: 'monitor-sections-error', path: '/monitors/1', scenario: { stats: fail(), incidents: fail(), checks: fail() }, expectText: 'Не удалось загрузить проверки' },
  { name: 'monitor-not-found', path: '/monitors/999', scenario: { monitor: notFound() }, expectText: 'Страница не найдена' },

  { name: 'monitor-new', path: '/monitors/new', expectText: 'Новый монитор' },
  { name: 'monitor-edit', path: '/monitors/1/edit', expectText: 'Изменить монитор' },

  { name: 'status-pages', path: '/status-pages', expectText: 'acme-corporation-status' },
  { name: 'status-pages-empty', path: '/status-pages', scenario: { statusPages: ok(paginated([])) }, expectText: 'Статус-страниц пока нет' },
  { name: 'status-pages-error', path: '/status-pages', scenario: { statusPages: fail() }, expectText: 'Не удалось загрузить данные' },
  { name: 'status-page-edit', path: '/status-pages/1/edit', expectText: 'Изменить статус-страницу' },

  { name: 'public-status', path: '/status/acme', scenario: { signedIn: false }, expectText: 'Частичный сбой' },
  { name: 'public-status-loading', path: '/status/acme', scenario: { signedIn: false, publicPage: hang }, expectText: 'Загрузка…' },
  { name: 'public-status-not-found', path: '/status/nope', scenario: { signedIn: false, publicPage: notFound() }, expectText: 'Статус-страница не найдена' },
  { name: 'public-status-error', path: '/status/acme', scenario: { signedIn: false, publicPage: fail() }, expectText: 'Не удалось загрузить данные' },

  { name: 'not-found', path: '/no-such-page', expectText: 'Страница не найдена' },
]

/** The page must never scroll sideways; content clipped by `truncate` is fine. */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    const scrolls = doc.scrollWidth > doc.clientWidth
    // Diagnostics only: who sticks out, when the page really scrolls
    const offenders = scrolls
      ? [...document.querySelectorAll<HTMLElement>('body *')]
          .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
          .filter((el) => !el.closest('[data-allow-overflow]'))
          .slice(-5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.getAttribute('class')).slice(0, 60)}`)
      : []
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders }
  })
  expect(overflow.scrollWidth, `page scrolls sideways; sticking out: ${overflow.offenders.join(', ')}`).toBeLessThanOrEqual(overflow.clientWidth)
}

for (const screen of cases) {
  test(screen.name, async ({ page }, testInfo) => {
    await mockApi(page, screen.scenario)
    await page.goto(screen.path)
    const marker = screen.expectLabel
      ? page.getByLabel(screen.expectLabel)
      : page.getByText(screen.expectText!).filter({ visible: true }).first()
    await expect(marker).toBeVisible({ timeout: 15_000 })
    // Let lazy chunks (chart) and retries settle before measuring
    await page.waitForTimeout(screen.name.includes('error') ? 4500 : 600)
    await expectNoHorizontalScroll(page)
    await page.screenshot({ path: testInfo.outputPath(`${screen.name}.png`), fullPage: true })
  })
}

test('offline: a banner explains why nothing loads', async ({ page, context }, testInfo) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByText('Сайт').first()).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByText('Нет подключения к интернету')).toBeVisible()
  await expectNoHorizontalScroll(page)
  await page.screenshot({ path: testInfo.outputPath('offline.png') })

  await context.setOffline(false)
  await expect(page.getByText('Нет подключения к интернету')).toBeHidden()
})

test('chart chunk failing to load breaks only the chart', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.route('**/assets/ResponseTimeChart-*.js', (route) => route.abort())
  await page.goto('/monitors/1')

  await expect(page.getByText('Не удалось показать график.')).toBeVisible({ timeout: 15_000 })
  // The rest of the page still works
  await expect(page.getByText('99,17 %')).toBeVisible()
  await expect(page.getByText('Последние проверки')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('chart-failed.png') })
})
