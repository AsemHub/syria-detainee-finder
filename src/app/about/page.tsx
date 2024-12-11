export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-8 text-4xl font-bold tracking-tight">About Syria Detainee Finder</h1>
        
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-primary">Our Mission</h2>
          <p className="mb-6 text-lg text-muted-foreground">
            Syria Detainee Finder is dedicated to helping families locate and reconnect with their loved ones who have been detained in Syria. 
            We provide a platform for sharing and accessing information about detainees, with the goal of bringing clarity and hope to affected families.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-primary">How We Help</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6 bg-card">
              <h3 className="mb-3 text-xl font-medium text-card-foreground">Information Sharing</h3>
              <p className="text-muted-foreground">
                We maintain a secure database of detainee information, allowing families and organizations to share and access critical details about missing individuals.
              </p>
            </div>
            <div className="rounded-lg border p-6 bg-card">
              <h3 className="mb-3 text-xl font-medium text-card-foreground">Data Collection</h3>
              <p className="text-muted-foreground">
                We work with human rights organizations and individuals to collect and verify information about detainees through our submission system.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-primary">Privacy & Security</h2>
          <p className="mb-6 text-lg text-muted-foreground">
            We take the security and privacy of submitted information seriously. All data is handled with strict confidentiality, 
            and we implement robust security measures to protect sensitive information.
          </p>
        </section>

        <section className="rounded-lg bg-primary p-8 text-primary-foreground">
          <h2 className="mb-4 text-2xl font-semibold">Get Involved</h2>
          <p className="mb-6">
            Your contribution can make a difference. Whether you have information to share or want to help in our mission, 
            every piece of information brings us closer to reuniting families.
          </p>
          <div className="flex gap-4">
            <a
              href="/submit"
              className="rounded-lg bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary hover:bg-background transition-colors"
            >
              Submit Information
            </a>
            <a
              href="/search"
              className="rounded-lg border border-primary-foreground px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-colors"
            >
              Search Database
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
