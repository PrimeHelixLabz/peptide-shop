import { AdminProductsTable } from "@/components/admin/admin-products-table"
import { getProducts } from "@/lib/db/supabase"
import { toAdminProduct } from "@/lib/api/admin-utils"

export default async function AdminProductsPage() {
  // Include archived and inactive products for admin view
  const products = await getProducts({ includeArchived: true, includeInactive: true })
  const adminProducts = products.map(toAdminProduct)

  return <AdminProductsTable products={adminProducts} />
}
