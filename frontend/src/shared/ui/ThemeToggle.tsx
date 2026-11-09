import { useSelector } from '@tanstack/react-store'
import { Moon, Sun } from 'lucide-react'

import { themeStore, toggleTheme } from '@/shared/lib/theme'

import { Button } from './Button'

export function ThemeToggle() {
  const theme = useSelector(themeStore)
  const isDark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      icon={isDark ? <Sun /> : <Moon />}
    />
  )
}
