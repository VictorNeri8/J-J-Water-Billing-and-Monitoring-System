import Link from "next/link"

const sections = [
  {
    title: "Introduction",
    body: [
      "These Terms and Conditions explain the practical rules for using the public website and customer service system provided for J&J Water Distribution Services.",
      "This page is for general customer guidance and is not formal legal advice. Official service concerns should still be coordinated through J&J Water Distribution Services' authorized channels.",
    ],
  },
  {
    title: "Use of the Website",
    body: [
      "Visitors and customers should use the website responsibly. You must not misuse contact forms, submit false or harmful information, attempt unauthorized access, interfere with the website, or disrupt any service, account, billing, or administrative function.",
    ],
  },
  {
    title: "Service Information",
    body: [
      "Rates, billing details, service descriptions, office information, and other public materials are provided to help customers understand available water distribution services.",
      "J&J Water Distribution Services may update this information when operational, pricing, service, or administrative requirements change.",
    ],
  },
  {
    title: "Customer Responsibilities",
    body: [
      "Customers are responsible for providing accurate account, contact, address, and service information. Customers should also pay water bills on time, monitor notices sent to their registered contact details, and report leaks, billing questions, or account concerns through official channels.",
    ],
  },
  {
    title: "Billing and Payments",
    body: [
      "Water billing is based on recorded water consumption, meter readings, applicable rates, and any relevant account or service charges. Payment records, account balances, and billing activity are handled by authorized finance personnel.",
      "Customers should review their bills and contact J&J Water Distribution Services promptly if they believe a billing record, reading, or payment entry needs to be checked.",
    ],
  },
  {
    title: "SMS and Email Notifications",
    body: [
      "Customers may receive SMS, email, or other service-related notices about billing, payment reminders, account updates, submitted inquiries, maintenance information, or other water service concerns.",
      "Customers should keep their contact details current so important notices can be delivered to the correct phone number or email address.",
    ],
  },
  {
    title: "Limitations",
    body: [
      "The website and related online services may not always be available. Access can be affected by maintenance, internet connectivity, third-party service issues, power interruptions, security checks, or other technical problems.",
      "J&J Water Distribution Services will make reasonable efforts to keep public information available, but the website should not be treated as the only channel for urgent service concerns.",
    ],
  },
  {
    title: "Changes to Terms",
    body: [
      "J&J Water Distribution Services may update these Terms and Conditions when needed to reflect service changes, website updates, operational practices, or legal and regulatory requirements.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For questions about these terms, billing, account records, payments, or water service concerns, contact J&J Water Distribution Services through the Contact page or official office channels.",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <div className="border-b border-border pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
            Customer terms
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            Clear, practical terms for using the J&amp;J Water Distribution Services public website, customer communication channels, and billing information features.
          </p>
          <p className="mt-5 text-sm font-medium text-foreground">Last updated: May 20, 2026</p>
        </div>

        <div className="space-y-10 py-10">
          {sections.map((section, index) => (
            <section key={section.title} className="grid gap-4 border-b border-border/70 pb-10 last:border-b-0">
              <div className="flex items-start gap-4">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Need help with an account, bill, or service request?</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              Back to Home
            </Link>
            <Link href="/contact" className="inline-flex h-10 items-center justify-center rounded-full bg-cyan-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
              Contact Us
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
