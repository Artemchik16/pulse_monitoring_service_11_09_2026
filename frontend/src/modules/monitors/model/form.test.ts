import { describe, expect, it } from 'vitest'

import { DEFAULT_MONITOR_FORM, intervalLabel, intervalOptions, monitorFormSchema, toPayload } from './form'

const valid = { ...DEFAULT_MONITOR_FORM, name: 'Сайт', url: 'https://example.com' }

function issues(values: Record<string, unknown>) {
  const result = monitorFormSchema.safeParse({ ...valid, ...values })
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('monitorFormSchema', () => {
  it('accepts a valid monitor', () => {
    expect(issues({})).toEqual({})
  })

  it.each([
    ['ftp://example.com', 'url'],
    ['example.com', 'url'],
    ['https://', 'url'],
  ])('rejects url %s', (url, field) => {
    expect(issues({ url })).toHaveProperty(field)
  })

  it('requires the timeout to be shorter than the interval', () => {
    expect(issues({ interval_sec: 60, timeout_sec: 60 })).toEqual({
      timeout_sec: 'Таймаут должен быть меньше интервала проверки',
    })
  })

  it('requires a non-empty expected status range', () => {
    expect(issues({ expected_status_from: 300, expected_status_to: 200 })).toHaveProperty('expected_status_to')
  })

  it('says "enter a number" for an empty number field', () => {
    expect(issues({ timeout_sec: Number.NaN }).timeout_sec).toBe('Введите число')
  })
})

describe('form <-> API', () => {
  it('sends the timeout in milliseconds and trims text', () => {
    expect(toPayload({ ...valid, name: '  Сайт ', timeout_sec: 2.5 })).toMatchObject({ name: 'Сайт', timeout_ms: 2500 })
  })

  it('labels intervals in proper Russian', () => {
    expect(intervalLabel(60)).toBe('Каждую минуту')
    expect(intervalLabel(120)).toBe('Каждые 2 минуты')
    expect(intervalLabel(300)).toBe('Каждые 5 минут')
    expect(intervalLabel(3600)).toBe('Каждый час')
  })

  it('keeps a custom interval set through the API selectable', () => {
    expect(intervalOptions(90).map((o) => o.value)).toContain('90')
  })
})
