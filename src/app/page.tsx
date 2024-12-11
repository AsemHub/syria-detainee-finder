"use client"

import Link from "next/link"

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-8 md:px-8 md:py-16">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          Help Find Missing
          <div className="text-primary dark:text-primary">Syrian Detainees</div>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
          Join our mission to locate and share information about Syrian detainees.
          Every piece of information can help reunite families.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8">
          <Link 
            href="/search" 
            className="primary-button px-6 py-3 rounded-md w-full sm:w-auto text-center"
          >
            Search for Detainees
          </Link>
          <Link 
            href="/submit" 
            className="secondary-button px-6 py-3 rounded-md w-full sm:w-auto text-center"
          >
            Submit Information
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Search Database</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Search our comprehensive database using various criteria to find information about detainees.
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Submit Information</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Share valuable information about detainees you may have encountered or know about.
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Bulk Upload</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Organizations can submit multiple records at once using our CSV upload feature.
          </p>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-primary mt-16 p-8 sm:p-12 rounded-lg text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
          Every Detail Matters
        </h2>
        <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8 text-sm sm:text-base">
          Your information could be the missing piece that helps locate someone&apos;s loved one. Join our
          community effort to bring clarity to families.
        </p>
        <Link 
          href="/submit" 
          className="bg-background text-primary hover:bg-background/90 px-8 py-3 rounded-md inline-block w-full sm:w-auto"
        >
          Share What You Know
        </Link>
      </div>
    </div>
  )
}
