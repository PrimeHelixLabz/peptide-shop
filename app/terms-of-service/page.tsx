import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Terms of Service | PrimeHelix Labz",
  description:
    "Read the Terms of Service for PrimeHelix Labz. Understand the terms and conditions governing your use of our website and purchase of our products.",
}

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Hero */}
        <Section background="muted" padding="md">
          <Container size="md">
            <PageHeader
              label="Legal"
              title="Terms of Service"
              description="Please read these terms carefully before using our website or purchasing our products."
              align="center"
            />
          </Container>
        </Section>

        {/* Content */}
        <Section background="muted" padding="md">
          <Container size="md">
            <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Last Updated</h2>
                  <p className="text-muted-foreground">
                    These Terms of Service were last updated on January 1, 2026.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our website or services.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Use License</h2>
                  <p className="text-muted-foreground mb-4">
                    Permission is granted to temporarily access the materials on PrimeHelix Labz's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose or for any public display</li>
                    <li>Attempt to reverse engineer any software contained on the website</li>
                    <li>Remove any copyright or other proprietary notations from the materials</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Product Information and Intended Use</h2>
                  <p className="text-muted-foreground mb-4">
                    All products sold by PrimeHelix Labz are intended for research purposes only. By purchasing our products, you acknowledge and agree that:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Products are not for human consumption</li>
                    <li>Products are not for use as food, drugs, medical devices, or cosmetics</li>
                    <li>You are a qualified researcher or institution conducting legitimate research</li>
                    <li>You will comply with all applicable laws and regulations regarding the purchase, possession, and use of these products</li>
                    <li>You understand that these products may be subject to local, state, and federal regulations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Age Requirement</h2>
                  <p className="text-muted-foreground">
                    You must be at least 18 years of age to use this website and purchase our products. By using this website, you represent and warrant that you are at least 18 years old.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Account Registration</h2>
                  <p className="text-muted-foreground mb-4">
                    When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Maintaining the security of your account and password</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized use of your account</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Orders and Payment</h2>
                  <p className="text-muted-foreground mb-4">
                    When you place an order, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Provide accurate and complete information</li>
                    <li>Pay all charges incurred by your account</li>
                    <li>Comply with all applicable laws and regulations</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We reserve the right to refuse or cancel any order at our sole discretion. In the event of an order cancellation, we will refund any payments made.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Shipping and Delivery</h2>
                  <p className="text-muted-foreground">
                    Shipping terms are detailed in our{" "}
                    <a href="/shipping-policy" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">
                      Shipping Policy
                    </a>
                    . We are not responsible for delays caused by shipping carriers or customs. Estimated delivery times are approximate and not guaranteed.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Returns and Refunds</h2>
                  <p className="text-muted-foreground">
                    Due to the nature of our products, all sales are final. We do not accept returns or offer refunds except in cases of defective products or shipping errors. Please contact us immediately if you receive a defective product or incorrect order.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Disclaimer</h2>
                  <p className="text-muted-foreground mb-4">
                    The materials on PrimeHelix Labz's website are provided on an 'as is' basis. PrimeHelix Labz makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Implied warranties or conditions of merchantability</li>
                    <li>Fitness for a particular purpose</li>
                    <li>Non-infringement of intellectual property or other violation of rights</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    In no event shall PrimeHelix Labz or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on PrimeHelix Labz's website, even if PrimeHelix Labz or a PrimeHelix Labz authorized representative has been notified orally or in writing of the possibility of such damage.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Governing Law</h2>
                  <p className="text-muted-foreground">
                    These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which PrimeHelix Labz operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Changes to Terms</h2>
                  <p className="text-muted-foreground">
                    PrimeHelix Labz may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about these Terms of Service, please contact us at{" "}
                    <a href="/contact" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">
                      our contact page
                    </a>
                    .
                  </p>
                </section>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
