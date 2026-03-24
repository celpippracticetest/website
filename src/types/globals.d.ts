export {}

// Create a type for the roles
export type Roles = 'admin' | 'user'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      roles?: Roles[]
      plan: "free" | "premium"
      celloToken?: string
      /** ISO string from Clerk publicMetadata (subscription / purchase time). */
      purchaseDate?: string
    }
  }
}