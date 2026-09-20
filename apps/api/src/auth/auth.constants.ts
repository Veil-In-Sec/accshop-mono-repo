export const BETTER_AUTH = Symbol("BETTER_AUTH")

export interface SessionUser {
  id: string
  name: string
  email: string
  emailVerified?: boolean
  image?: string | null
}
