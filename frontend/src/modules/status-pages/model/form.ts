import { z } from 'zod'

export const MAX_STATUS_PAGES = 5
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const statusPageFormSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(100, 'Не длиннее 100 символов'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Не короче 3 символов')
    .max(50, 'Не длиннее 50 символов')
    .regex(SLUG_PATTERN, 'Только строчные латинские буквы, цифры и дефис (не в начале и не в конце)'),
  monitor_ids: z.array(z.number()),
})

export type StatusPageFormValues = z.input<typeof statusPageFormSchema>
export type StatusPagePayload = z.output<typeof statusPageFormSchema>

export const STATUS_PAGE_FORM_FIELDS = ['title', 'slug', 'monitor_ids'] as const

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Suggest an address from the title: «Статус Acme» -> "status-acme". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '')
}

export function publicStatusUrl(slug: string): string {
  return `${window.location.origin}/status/${slug}`
}
