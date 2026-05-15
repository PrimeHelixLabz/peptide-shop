export interface FaqItem {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: "Are your products intended for human consumption?",
    answer:
      "No. All products sold by PrimeHelix Labz are strictly intended for in-vitro research and laboratory use only. They are not intended for human or animal consumption, and we do not provide guidance on dosing, administration, or therapeutic use. By purchasing from us, you acknowledge and agree to these terms.",
  },
  {
    question: "How are your peptides tested for purity?",
    answer:
      "Every batch undergoes rigorous third-party testing through independent, ISO-accredited laboratories. We use High-Performance Liquid Chromatography (HPLC) and Mass Spectrometry (MS) to verify identity, purity, and composition. Certificates of Analysis (COAs) are available for every product and can be downloaded directly from the product page.",
  },
  {
    question: "What are your shipping times and methods?",
    answer:
      "Orders placed before 2:00 PM EST on business days ship the same day via FedEx 2Day, with delivery in 2 business days. Shipping is a flat $15, and free for any order with a subtotal of $250 or more.",
  },
  {
    question: "How can I track my order?",
    answer:
      "Once your order ships, you will receive an email confirmation containing your tracking number and a direct link to the carrier’s tracking page. You can also view the status of all current and past orders by logging into your account on our website. If your tracking information has not updated within 48 hours of shipment, please reach out to our support team.",
  },
]
