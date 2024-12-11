"use client"

import { useCallback } from "react"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"

export function useReCaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha()

  const verifyRecaptcha = useCallback(
    async (action: string) => {
      if (!executeRecaptcha) {
        console.error("reCAPTCHA not initialized")
        return null
      }

      try {
        const token = await executeRecaptcha(action)
        return token
      } catch (error) {
        console.error("reCAPTCHA verification failed:", error)
        return null
      }
    },
    [executeRecaptcha]
  )

  return { verifyRecaptcha }
}
