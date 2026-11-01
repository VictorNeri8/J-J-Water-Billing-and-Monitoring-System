import Link from "next/link"

const sections = [
  {
    title: "Introduction",
    body: [
      "J&J Water Distribution Services values customer privacy and aims to handle personal information responsibly, transparently, and securely.",
      "This Privacy Policy explains how customer and website information may be collected, used, protected, shared, and retained in connection with water distribution services, billing, meter reading, payments, notifications, and customer support. It is general information only and is not formal legal advice.",
    ],
  },
  {
    title: "Information Collected",
    body: [
      "J&J Water Distribution Services may collect information such as customer name, service address, contact number, email address, account number, meter readings, billing records, payment records, and contact form messages.",
      "The system may also process technical information needed to secure the website, verify submissions, prevent abuse, and maintain reliable online services.",
    ],
  },
  {
    title: "How Information Is Used",
    body: [
      "Customer information is used for account registration, billing, meter reading, payment tracking, SMS or email notifications, customer support, service improvement, system security, fraud prevention, and operational reporting.",
      "Contact form messages are used to respond to inquiries, route concerns to the appropriate team, and maintain a record of public-site requests.",
    ],
  },
  {
    title: "Data Protection",
    body: [
      "J&J Water Distribution Services uses reasonable safeguards designed to protect customer information, including access control, role-based administrative access, secure database storage, OTP authentication for admin login, and limited access by authorized personnel.",
      "No system can guarantee absolute security, but customer records should only be accessed and processed for legitimate service, billing, support, administrative, or security purposes.",
    ],
  },
  {
    title: "Sharing of Information",
    body: [
      "J&J Water Distribution Services does not sell customer personal data.",
      "Information may be shared only when needed for service operations, such as with authorized SMS or email providers, technical service providers, or other parties that support customer communication and system operations. Information may also be disclosed when required by law, regulation, lawful order, or a valid government request.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "Customer, billing, meter reading, payment, and support records are kept only as long as reasonably necessary for service delivery, account management, operational records, legal compliance, dispute handling, security, and audit purposes.",
      "When information is no longer required, it should be deleted, archived, or handled according to applicable operational and legal requirements.",
    ],
  },
  {
    title: "Customer Rights",
    body: [
      "Customers may request access to their personal information, correction of inaccurate details, or deletion of information where applicable. Requests may be subject to identity verification, active service requirements, billing record needs, operational obligations, and legal retention requirements.",
      "These rights are generally aligned with Philippine data privacy expectations under the Data Privacy Act of 2012 and related guidance from the National Privacy Commission.",
    ],
  },
  {
    title: "Cookies and Website Security",
    body: [
      "The website may use cookies, security checks, or technical data to support website functionality, improve user experience, prevent spam or abuse, and protect public forms and administrative access.",
      "Some security features may rely on trusted third-party services to confirm that submissions are legitimate and to help keep the website available.",
    ],
  },
  {
    title: "Updates to Privacy Policy",
    body: [
      "This Privacy Policy may be updated when system features, service practices, security measures, or legal requirements change. The Last updated date will be revised when meaningful changes are made.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy-related questions, requests to correct customer details, or concerns about how information is handled, contact J&J Water Distribution Services through the Contact page or official office channels.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <div className="border-b border-border pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
            Customer privacy
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            How J&amp;J Water Distribution Services handles customer information for billing, meter reading, payment tracking, notifications, customer support, and website security.
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
          <p className="text-sm text-muted-foreground">Have a privacy question or need to update customer details?</p>
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
