export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'user' | 'moderator' | 'admin'
  created_at: string
  updated_at: string
  last_sign_in?: string
  email_verified: boolean
  provider?: string
}

export interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  email_notifications: boolean
  language: string
  created_at: string
  updated_at: string
}
