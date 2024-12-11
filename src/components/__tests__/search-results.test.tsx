import { render, screen } from "@testing-library/react"
import { SearchResults } from "../search-results"
import type { Detainee } from "../../types"

const mockResults: Detainee[] = [
  {
    id: "1",
    name: "John",
    surname: "Doe",
    motherName: "Jane",
    lastSeenLocation: "Damascus",
    lastSeenDate: "2023-01-01",
    status: "missing" as const,
    physicalDescription: "Tall with brown hair",
    lastUpdated: "2024-01-01",
  },
]

describe("SearchResults", () => {
  it("renders no results message when results array is empty", () => {
    render(<SearchResults results={[]} isLoading={false} />)
    expect(screen.getByText("No results found")).toBeInTheDocument()
  })

  it("renders search results correctly", () => {
    render(<SearchResults results={mockResults} isLoading={false} />)
    
    // Check if result count is displayed
    expect(screen.getByText("Found 1 results")).toBeInTheDocument()
    
    // Check if detainee information is displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("Last seen in Damascus")).toBeInTheDocument()
    expect(screen.getByText("Status: missing")).toBeInTheDocument()
  })

  it("displays physical description when available", () => {
    render(<SearchResults results={mockResults} isLoading={false} />)
    expect(screen.getByText("Tall with brown hair")).toBeInTheDocument()
  })

  it("formats dates correctly", () => {
    render(<SearchResults results={mockResults} isLoading={false} />)
    // Note: The actual format will depend on the user's locale
    expect(screen.getByText(new Date("2024-01-01").toLocaleDateString())).toBeInTheDocument()
  })

  it("shows loading skeleton", () => {
    render(<SearchResults results={[]} isLoading={true} />)
    // Check for skeleton loading elements
    const skeletons = screen.getAllByRole("generic").filter(
      element => element.className.includes("animate-pulse")
    )
    expect(skeletons).toHaveLength(3) // We show 3 skeleton items while loading
  })
})
