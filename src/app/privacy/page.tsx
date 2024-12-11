export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-6 py-8 md:px-8 md:py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-green dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="mb-4">
            Syria Detainee Finder is committed to protecting the privacy and security of our users.
            This Privacy Policy explains how we collect, use, and safeguard your information when
            you use our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <h3 className="text-xl font-medium mb-3">Personal Information</h3>
          <p className="mb-4">
            When you submit information about detainees, we collect:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Names and personal details of detainees</li>
            <li>Location information</li>
            <li>Dates of detention</li>
            <li>Contact information of submitters</li>
          </ul>
          
          <h3 className="text-xl font-medium mb-3">Technical Information</h3>
          <p className="mb-4">
            We automatically collect certain technical information when you visit our platform:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Usage data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="mb-4">We use the collected information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Help locate and identify detainees</li>
            <li>Connect families with relevant information</li>
            <li>Improve our platform and services</li>
            <li>Ensure platform security</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your information:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Encryption of sensitive data</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Secure data storage</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access your personal information</li>
            <li>Request corrections to your data</li>
            <li>Request deletion of your data</li>
            <li>Object to data processing</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy or our data practices, please
            contact us at:
          </p>
          <div className="bg-card p-4 rounded-lg">
            <p>Email: privacy@syriadetaineefinder.org</p>
            <p>Address: [Organization Address]</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. The latest version will always
            be posted on this page with the effective date.
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </section>
      </div>
    </div>
  )
}
