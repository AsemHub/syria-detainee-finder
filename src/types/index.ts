export interface Detainee {
  id: string
  name: string
  surname: string
  motherName: string
  lastSeenLocation: string
  lastSeenDate: string
  status: "found" | "missing" | "unknown"
  physicalDescription?: string
  lastUpdated: string
}
