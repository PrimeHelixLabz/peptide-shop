import { AdminProductsTable } from "@/components/admin/admin-products-table"
import { getAllProducts } from "@/lib/api/server-products"
import { toAdminProduct } from "@/lib/api/admin-utils"

export default async function AdminProductsPage() {
  const products = await getAllProducts()
  const adminProducts = products.map(toAdminProduct)

  return <AdminProductsTable products={adminProducts} />
}
