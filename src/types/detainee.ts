export type Detainee = {
  id: string
  name: string
  surname: string
  motherName: string
  lastSeenLocation: string
  lastSeenDate: string
  physicalDescription: string
  status: "missing" | "found" | "unknown"
  lastUpdated: string
}
