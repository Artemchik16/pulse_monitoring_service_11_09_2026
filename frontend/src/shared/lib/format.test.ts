import { describe, expect, it } from 'vitest'

import { formatMs, formatPercent, formatRelative } from './format'

describe('format', () => {
  it('formats response time', () => {
    expect(formatMs(87)).toBe('87 мс')
    expect(formatMs(1234)).toBe('1,2 с')
    expect(formatMs(null)).toBe('—')
  })

  it('formats uptime', () => {
    expect(formatPercent(100)).toBe('100 %')
    expect(formatPercent(99.934)).toBe('99,93 %')
    expect(formatPercent(null)).toBe('—')
  })

  it('formats relative time', () => {
    const now = new Date('2026-11-09T12:00:00Z')
    expect(formatRelative('2026-11-09T11:59:50Z', now)).toBe('только что')
    expect(formatRelative('2026-11-09T11:55:00Z', now)).toBe('5 минут назад')
    expect(formatRelative('2026-11-09T09:00:00Z', now)).toBe('3 часа назад')
    expect(formatRelative('2026-11-08T12:00:00Z', now)).toBe('вчера')
  })
})
