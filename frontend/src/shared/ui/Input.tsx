import type { InputHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

import { inputClassName } from './inputStyles'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />
}
