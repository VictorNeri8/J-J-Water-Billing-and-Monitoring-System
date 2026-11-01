import Link from "next/link"
import Image from "next/image"
import { Phone, MapPin } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4 md:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/jandj-logo.png"
                alt="J&J Water Distribution Services"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="text-lg font-bold text-foreground leading-tight">
                J&J WATER
                <span className="block text-sm font-medium text-muted-foreground">DISTRIBUTION SERVICES</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Providing clean, safe, and reliable water services to our community since 2023.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2 lg:col-span-2">
            {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/#rates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Water Rates
                  </Link>
                </li>
                <li>
                  <Link href="/customer-bill" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Check Bill
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Services</h3>
              <ul className="space-y-3">
                <li className="text-sm text-muted-foreground">Water Supply</li>
                <li className="text-sm text-muted-foreground">Meter Installation</li>
                <li className="text-sm text-muted-foreground">Billing Services</li>
                <li className="text-sm text-muted-foreground">Leak Detection</li>
                <li className="text-sm text-muted-foreground">Water Quality Testing</li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>J&J Building, Tagaytay, Calero, Liloan, Cebu. Philippines.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+63 929 532 3005</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            {new Date().getFullYear()} J&J Water Distribution Services. All rights reserved.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Terms and Conditions
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Developer:{" "}
            <Link
              href="https://www.clarkkentibale.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              Clark
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
