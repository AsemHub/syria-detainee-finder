import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">About Syria Detainee Finder</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-8">
            The Syria Detainee Finder is a humanitarian platform dedicated to helping families locate
            their loved ones who have been detained in Syria. Our mission is to provide a centralized,
            accessible database that aids in the search and documentation of detained individuals.
          </p>

          <div className="grid gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
                <CardDescription>
                  To facilitate the process of locating and identifying detained individuals in Syria,
                  providing hope and support to families searching for their loved ones.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardContent className="pt-6">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Search our database using names, locations, or other identifying information</li>
                    <li>Submit new information about detainees</li>
                    <li>Organizations can bulk upload verified detainee records</li>
                    <li>Receive updates when new information matches your search criteria</li>
                  </ul>
                </CardContent>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>
                  We prioritize the security and privacy of all submitted information. Our platform
                  implements strict data protection measures to ensure sensitive information remains
                  confidential and secure.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
