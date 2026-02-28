import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Privacy Policy | PrimeHelix Labz",
  description:
    "Learn how PrimeHelix Labz collects, uses, and protects your personal information. Our commitment to your privacy and data security.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Hero */}
        <Section background="muted" padding="md">
          <Container size="md">
            <PageHeader
              label="Legal"
              title="Privacy Policy"
              description="Your privacy is important to us. This policy explains how we collect, use, and protect your personal information."
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
                    This Privacy Policy was last updated on January 1, 2026.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
                  <p className="text-muted-foreground mb-4">
                    We collect information that you provide directly to us when you:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Create an account or place an order</li>
                    <li>Subscribe to our newsletter or marketing communications</li>
                    <li>Contact us for customer support</li>
                    <li>Participate in surveys or promotions</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    The types of information we may collect include your name, email address, shipping address, billing address, phone number, payment information, and any other information you choose to provide.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-4">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Process and fulfill your orders</li>
                    <li>Send you order confirmations and shipping updates</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Send you marketing communications (with your consent)</li>
                    <li>Improve our website and services</li>
                    <li>Detect and prevent fraud or abuse</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Information Sharing</h2>
                  <p className="text-muted-foreground mb-4">
                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>With service providers who assist us in operating our website and conducting our business (e.g., payment processors, shipping companies)</li>
                    <li>When required by law or to protect our rights</li>
                    <li>In connection with a business transfer or merger</li>
                    <li>With your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
                  <p className="text-muted-foreground">
                    We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Cookies and Tracking Technologies</h2>
                  <p className="text-muted-foreground">
                    We use cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and personalize content. You can control cookie preferences through your browser settings.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights</h2>
                  <p className="text-muted-foreground mb-4">
                    Depending on your location, you may have certain rights regarding your personal information, including:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>The right to access your personal information</li>
                    <li>The right to correct inaccurate information</li>
                    <li>The right to delete your personal information</li>
                    <li>The right to object to processing of your information</li>
                    <li>The right to data portability</li>
                    <li>The right to withdraw consent</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    To exercise these rights, please contact us using the information provided in the Contact section below.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about this Privacy Policy or our data practices, please contact us at{" "}
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
