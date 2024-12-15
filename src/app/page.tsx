import Image from "next/image";
import { SearchContainer } from "@/components/SearchContainer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="container mx-auto min-h-screen py-8 px-4">
      <div className="flex flex-col items-center justify-center space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          Syria Detainee Finder
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          A humanitarian platform dedicated to helping locate missing Syrian detainees and reuniting families.
        </p>
        
        <SearchContainer />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
              <CardDescription>
                Search for missing detainees using names, locations, or other identifying information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submit Information</CardTitle>
              <CardDescription>
                Submit new information about detainees or update existing records.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Organizations can submit multiple records via CSV file upload.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  )
}
