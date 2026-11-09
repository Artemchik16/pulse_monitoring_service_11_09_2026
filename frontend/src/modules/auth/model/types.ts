import type { TokenPair } from '@/shared/api'

export interface User {
  id: number
  email: string
  created_at: string
}

export interface AuthResponse {
  user: User
  tokens: TokenPair
}

export interface Credentials {
  email: string
  password: string
}
