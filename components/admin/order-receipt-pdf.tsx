"use client"

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import { format } from "date-fns"
import type { Order } from "@/lib/db/schema"
import { formatPaymentMethod } from "@/lib/format-payment-method"
import { CARRIER_OPTIONS } from "@/lib/shipping/carriers"

/**
 * Vector PDF version of the packing slip — kept visually in step with the
 * on-screen slip in <OrderReceipt />. react-pdf uses a CSS subset (flexbox,
 * no grid) and only PNG/JPG images, so the logo is passed in as a PNG data
 * URL the caller derives from /logo-1.webp via canvas.
 */

const BLACK = "#000000"
const MUTED = "#666666"
const FAINT = "#8c8c8c"
const LINE = "#d9d9d9"

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    color: BLACK,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 18,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 36, height: 36, objectFit: "contain", marginRight: 10 },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  slipLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerMeta: { fontSize: 8, color: MUTED, marginTop: 3 },
  headerOrderNo: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },

  twoCol: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 18 },
  colLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: FAINT,
    marginBottom: 6,
  },
  addrLine: { fontSize: 10, lineHeight: 1.5 },
  addrName: { fontFamily: "Helvetica-Bold" },
  detailLine: { fontSize: 10, lineHeight: 1.5, textAlign: "right" },
  detailMuted: { color: MUTED },

  tHead: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
    paddingVertical: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
    paddingVertical: 7,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  cItem: { flex: 1 },
  cQty: { width: 50, textAlign: "center" },
  cUnit: { width: 70, textAlign: "right" },
  cAmount: { width: 80, textAlign: "right" },
  itemName: { fontFamily: "Helvetica-Bold" },
  variant: { color: MUTED },

  totals: { marginTop: 14, flexDirection: "row", justifyContent: "flex-end" },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  totalLabel: { color: MUTED },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#b3b3b3",
    paddingTop: 8,
    marginTop: 4,
  },
  grandText: { fontSize: 12, fontFamily: "Helvetica-Bold" },

  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 18,
  },
  thanks: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  disclaimer: { fontSize: 8, color: "#8c8c8c", marginTop: 6, lineHeight: 1.5 },
})

export function OrderReceiptPdf({
  order,
  customerName,
  logoDataUrl,
}: {
  order: Order
  customerName?: string
  logoDataUrl?: string
}) {
  const addr = order.shippingAddress as Order["shippingAddress"] & {
    firstName?: string
    lastName?: string
  }
  const shipToName =
    customerName ||
    (addr?.firstName && addr?.lastName
      ? `${addr.firstName} ${addr.lastName}`
      : order.email || "")

  const carrierLabel = order.trackingCarrier
    ? CARRIER_OPTIONS.find((c) => c.value === order.trackingCarrier)?.label ??
      order.trackingCarrier
    : null

  const hasDiscount = order.discountAmount != null && order.discountAmount > 0

  return (
    <Document title={`Packing Slip ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.brandName}>PrimeHelix Labz</Text>
              <Text style={styles.brandSub}>Research Peptides</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.slipLabel}>Packing Slip</Text>
            <Text style={styles.headerMeta}>
              {format(new Date(order.createdAt), "MMM d, yyyy")}
            </Text>
            <Text style={styles.headerOrderNo}>#{order.orderNumber}</Text>
          </View>
        </View>

        {/* Ship to + order details */}
        <View style={styles.twoCol}>
          <View>
            <Text style={styles.colLabel}>Ship To</Text>
            {shipToName ? (
              <Text style={[styles.addrLine, styles.addrName]}>{shipToName}</Text>
            ) : null}
            <Text style={styles.addrLine}>{addr?.street}</Text>
            <Text style={styles.addrLine}>
              {addr?.city}, {addr?.state} {addr?.zipCode}
            </Text>
            <Text style={styles.addrLine}>{addr?.country}</Text>
          </View>
          <View>
            <Text style={[styles.colLabel, { textAlign: "right" }]}>Order Details</Text>
            <Text style={styles.detailLine}>
              <Text style={styles.detailMuted}>Order: </Text>
              {order.orderNumber}
            </Text>
            <Text style={styles.detailLine}>
              <Text style={styles.detailMuted}>Payment: </Text>
              {formatPaymentMethod(order.paymentMethod)}
            </Text>
            {order.trackingNumber ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailMuted}>Tracking: </Text>
                {carrierLabel ? `${carrierLabel} · ` : ""}
                {order.trackingNumber}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.tHead}>
          <Text style={[styles.th, styles.cItem]}>Item</Text>
          <Text style={[styles.th, styles.cQty]}>Qty</Text>
          <Text style={[styles.th, styles.cUnit]}>Unit</Text>
          <Text style={[styles.th, styles.cAmount]}>Amount</Text>
        </View>
        {order.items.map((item, index) => {
          const showVariant =
            item.variantName &&
            !item.productName.includes(`(${item.variantName})`)
          return (
            <View style={styles.tRow} key={index}>
              <Text style={styles.cItem}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {showVariant ? (
                  <Text style={styles.variant}> ({item.variantName})</Text>
                ) : null}
              </Text>
              <Text style={styles.cQty}>{item.quantity}</Text>
              <Text style={styles.cUnit}>${item.price.toFixed(2)}</Text>
              <Text style={styles.cAmount}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>${order.subtotal.toFixed(2)}</Text>
            </View>
            {hasDiscount ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Discount{order.discountCode ? ` (${order.discountCode})` : ""}
                </Text>
                <Text>-${order.discountAmount!.toFixed(2)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping</Text>
              <Text>${order.shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Service Fee</Text>
              <Text>${order.serviceFee.toFixed(2)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandText}>Total Paid</Text>
              <Text style={styles.grandText}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.thanks}>Thank you for your order.</Text>
          <Text style={styles.disclaimer}>
            All products are sold strictly for research purposes only. Not for
            human consumption. © 2026 PrimeHelix Labz. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
