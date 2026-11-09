import { z } from 'zod'

const email = z.string().trim().min(1, 'Введите email').pipe(z.email('Введите корректный email'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль'),
})

export const registerSchema = z
  .object({
    email,
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .refine((value) => !/^\d+$/.test(value), 'Пароль не может состоять только из цифр'),
    passwordConfirm: z.string().min(1, 'Повторите пароль'),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Пароли не совпадают',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

/** Search params of /login: where to go after sign-in and why the user is here. */
export const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

export type LoginSearch = z.infer<typeof loginSearchSchema>

/** Only same-origin paths: an open redirect would let a link send users to a phishing page. */
export function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}
