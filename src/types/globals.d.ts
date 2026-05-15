export {}

// Create a type for the roles
export type Roles = 'admin' | 'user'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      roles?: Roles[]
      plan: "free" | "premium" | "plus" | "pro" | "enterprise"
      celloToken?: string
      /** ISO string from Clerk publicMetadata (subscription / purchase time). */
      purchaseDate?: string
      /** Set when the post–sign-up goals survey (`onboardingNew`) is submitted. */
      onboardingSurveyCompleted?: boolean
      /** Number of paid add-on seats beyond base device allowance. */
      deviceSeatAddons?: number
      /** Metadata marker when add-on seats are updated manually in-app. */
      deviceSeatAddonUpdatedAt?: string
      /** Snapshot of plan name when add-on was recorded. */
      deviceSeatAddonPlan?: string
      /** Internal marker for charge orchestration outside Stripe checkout flow. */
      deviceSeatChargeMode?: string
    }
  }
}