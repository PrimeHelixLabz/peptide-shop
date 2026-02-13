import Link from "next/link"

export interface RecentOrder {
  id: string
  customer: string
  email: string
  items: number
  total: string
  status: "Shipped" | "Processing" | "Delivered" | "Pending"
  date: string
}

const statusStyles: Record<RecentOrder["status"], string> = {
  Shipped: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
  Processing: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  Delivered: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  Pending: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
}

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <section aria-label="Recent orders" className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer
              </th>
              <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Date
              </th>
              <th className="hidden px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                Items
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {order.id}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-foreground">
                    {order.customer}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.email}</p>
                </td>
                <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                  {order.date}
                </td>
                <td className="hidden px-6 py-4 text-center text-sm text-muted-foreground sm:table-cell">
                  {order.items}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                  {order.total}
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyles[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="flex items-center justify-center px-6 py-16">
          <p className="text-sm text-muted-foreground">No orders found.</p>
        </div>
      )}
    </section>
  )
}
