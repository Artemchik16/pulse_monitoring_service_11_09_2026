import { describe, expect, it } from 'vitest'

import { slugify, statusPageFormSchema } from './form'

describe('slugify', () => {
  it('transliterates and joins with hyphens', () => {
    expect(slugify('Статус Acme')).toBe('status-acme')
    expect(slugify('  Мой  сервис №1!  ')).toBe('moy-servis-1')
    expect(slugify('Щука и ёж')).toBe('schuka-i-ezh')
  })
})

describe('statusPageFormSchema', () => {
  it('normalizes the slug to lowercase', () => {
    expect(statusPageFormSchema.parse({ title: 'T', slug: 'Acme-Status', monitor_ids: [] }).slug).toBe('acme-status')
  })

  it.each(['ab', '-acme', 'acme-', 'ac me', 'статус'])('rejects slug %s', (slug) => {
    expect(statusPageFormSchema.safeParse({ title: 'T', slug, monitor_ids: [] }).success).toBe(false)
  })
})
