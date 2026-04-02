import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Shipping Policy | PrimeHelix Labz",
  description:
    "Learn about PrimeHelix Labz shipping policies, delivery times, shipping methods, and international shipping information.",
  alternates: {
    canonical: "/shipping-policy",
  },
}

export default function ShippingPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Hero */}
        <Section background="muted" padding="md">
          <Container size="md">
            <PageHeader
              label="Information"
              title="Shipping Policy"
              description="Everything you need to know about shipping, delivery times, and order tracking."
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
                    This Shipping Policy was last updated on January 1, 2026.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Processing Time</h2>
                  <p className="text-muted-foreground mb-4">
                    Orders are typically processed within 1-3 business days (Monday through Friday, excluding holidays). Processing time begins after:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Payment has been successfully received and verified</li>
                    <li>All order information has been confirmed</li>
                    <li>Any required documentation has been received</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    During peak periods or sales events, processing times may be extended. You will receive an email notification once your order has been shipped.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Shipping Methods</h2>
                  <p className="text-muted-foreground mb-4">
                    We offer several shipping options to meet your needs:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Standard Shipping:</strong> 5-7 business days</li>
                    <li><strong>Express Shipping:</strong> 2-3 business days</li>
                    <li><strong>Overnight Shipping:</strong> Next business day (if ordered before 2 PM EST)</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Shipping costs are calculated at checkout based on your location and selected shipping method. Free shipping may be available for orders over a certain amount.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Domestic Shipping</h2>
                  <p className="text-muted-foreground">
                    We ship to all 50 states within the United States. Orders are shipped via USPS, UPS, or FedEx depending on your location and selected shipping method. You will receive a tracking number via email once your order ships.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">International Shipping</h2>
                  <p className="text-muted-foreground mb-4">
                    We currently offer international shipping to select countries. International orders are subject to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Customs clearance procedures, which may cause delays</li>
                    <li>Import duties and taxes, which are the responsibility of the recipient</li>
                    <li>Compliance with local laws and regulations</li>
                    <li>Extended delivery times (typically 7-21 business days)</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Please note that we are not responsible for any customs delays, duties, or taxes. It is the customer's responsibility to ensure that importing our products is legal in their country.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Order Tracking</h2>
                  <p className="text-muted-foreground">
                    Once your order has been shipped, you will receive an email with a tracking number. You can track your order using the tracking number on the carrier's website or through{" "}
                    <a href="/orders" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">
                      your account page
                    </a>
                    . Tracking information is typically available within 24 hours of shipment.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Shipping Address</h2>
                  <p className="text-muted-foreground mb-4">
                    Please ensure your shipping address is complete and accurate. We are not responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Orders shipped to incorrect addresses provided by the customer</li>
                    <li>Lost or stolen packages after delivery confirmation</li>
                    <li>Delays caused by incorrect or incomplete address information</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    If you need to change your shipping address after placing an order, please contact us immediately. We may be able to update the address if the order has not yet shipped.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Delivery Issues</h2>
                  <p className="text-muted-foreground mb-4">
                    If you experience any issues with delivery, please contact us immediately. Common issues include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Package not received within the estimated delivery window</li>
                    <li>Damaged package upon delivery</li>
                    <li>Incorrect items received</li>
                    <li>Missing items from your order</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We will work with you and the shipping carrier to resolve any delivery issues. Please retain all packaging and documentation until the issue is resolved.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Undeliverable Packages</h2>
                  <p className="text-muted-foreground">
                    If a package is returned to us as undeliverable due to an incorrect address, refusal of delivery, or failure to pick up the package, we will contact you to arrange reshipment. Additional shipping fees may apply for reshipment.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Weather and Natural Disasters</h2>
                  <p className="text-muted-foreground">
                    We are not responsible for delays caused by weather conditions, natural disasters, or other events beyond our control. In such cases, delivery times may be extended, and we appreciate your patience.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Holiday Shipping</h2>
                  <p className="text-muted-foreground">
                    During holiday seasons, shipping carriers may experience delays. We recommend placing orders well in advance of holidays to ensure timely delivery. Processing and shipping times may be extended during peak holiday periods.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have any questions about our shipping policy or need assistance with an order, please contact us at{" "}
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
