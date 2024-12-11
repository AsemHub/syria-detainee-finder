import { render, screen, fireEvent } from "@testing-library/react"
import { Header } from "../header"

// Mock the next/link component
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

describe("Header", () => {
  it("renders the site title", () => {
    render(<Header />)
    expect(screen.getByText("Syria Detainee Finder")).toBeInTheDocument()
  })

  it("renders navigation links", () => {
    render(<Header />)
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("Submit Information")).toBeInTheDocument()
    expect(screen.getByText("Bulk Upload")).toBeInTheDocument()
    expect(screen.getByText("About")).toBeInTheDocument()
  })

  it("handles mobile menu interaction", () => {
    render(<Header />)
    const menuButton = screen.getByLabelText("Toggle menu")
    
    // Menu button should be visible
    expect(menuButton).toBeInTheDocument()
    
    // Click menu button
    fireEvent.click(menuButton)
    
    // Check if mobile navigation links are visible
    expect(screen.getAllByText("Search")).toHaveLength(2) // One in desktop nav, one in mobile nav
    expect(screen.getAllByText("Submit Information")).toHaveLength(2)
    expect(screen.getAllByText("Bulk Upload")).toHaveLength(2)
    expect(screen.getAllByText("About")).toHaveLength(2)
  })
})
