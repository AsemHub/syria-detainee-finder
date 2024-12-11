'use server'

import type { Detainee } from "@/types/detainee"

// Temporary mock data for development
const mockResults: Detainee[] = [
  {
    id: "1",
    name: "Ahmad",
    surname: "Al-Hassan",
    motherName: "Fatima",
    lastSeenLocation: "Damascus, Syria",
    lastSeenDate: "2023-06-15",
    physicalDescription: "Height: 175cm, Build: Medium, Hair: Black, Eyes: Brown, Notable Features: Scar on left hand",
    status: "missing" as const,
    lastUpdated: "2023-12-01",
  },
  {
    id: "2",
    name: "Mohammed",
    surname: "Al-Sayyed",
    motherName: "Aisha",
    lastSeenLocation: "Aleppo, Syria",
    lastSeenDate: "2023-08-20",
    physicalDescription: "Height: 180cm, Build: Tall, Hair: Brown, Eyes: Green",
    status: "found" as const,
    lastUpdated: "2023-11-15",
  },
]

export type SearchFormData = {
  name: string
  surname: string
  motherName: string
  lastSeenLocation: string
  lastSeenDate: string
  physicalDescription: string
}

export async function searchAction(data: SearchFormData): Promise<Detainee[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))
  // For now, return mock results
  return mockResults
}
