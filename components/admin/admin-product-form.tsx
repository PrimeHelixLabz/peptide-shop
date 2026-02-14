"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Upload,
  X,
  ImageIcon,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminCard } from "@/components/common/admin-card"
import { FormInput, FormTextarea, FormSelect } from "@/components/common"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProductFormData {
  name: string
  price: string
  stock: string
  description: string
  longDescription: string
  categoryId: string
  images: File[]
  imagePreviews: string[]
  specifications: Array<{ key: string; value: string }>
  usage: string
  shipping: string
  status: "Active" | "Inactive"
}

const initialFormData: ProductFormData = {
  name: "",
  price: "",
  stock: "",
  description: "",
  longDescription: "",
  categoryId: "",
  images: [],
  imagePreviews: [],
  specifications: [],
  usage: "",
  shipping: "",
  status: "Active",
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AdminProductFormProps {
  productId?: string
  initialData?: Partial<ProductFormData>
}

export function AdminProductForm({ productId, initialData }: AdminProductFormProps = {}) {
  const [form, setForm] = useState<ProductFormData>(() => ({
    ...initialFormData,
    ...initialData,
  }))
  const [dragActive, setDragActive] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories")
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Error loading categories:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [])

  // Load product data if editing
  useEffect(() => {
    if (productId && !initialData) {
      async function loadProduct() {
        try {
          const response = await fetch(`/api/products/${productId}`)
          if (response.ok) {
            const data = await response.json()
            const product = data.product
            setForm({
              name: product.name || "",
              price: product.price?.toString() || "",
              stock: product.stockQuantity?.toString() || "0",
              description: product.description || "",
              longDescription: product.longDescription || "",
              categoryId: product.categoryId || "",
              images: [],
              imagePreviews: product.images || (product.image ? [product.image] : []),
              specifications: product.specifications
                ? Object.entries(product.specifications).map(([key, value]) => ({
                    key,
                    value: String(value),
                  }))
                : [],
              usage: product.usage || "",
              shipping: product.shipping || "",
              status: product.inStock ? "Active" : "Inactive",
            })
          }
        } catch (error) {
          console.error("Error loading product:", error)
        }
      }
      loadProduct()
    }
  }, [productId, initialData])

  /* ---- Field helpers ---- */

  function updateField<K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /* ---- Image handling ---- */

  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
    if (imageFiles.length === 0) return

    const newFiles: File[] = []
    let loadedCount = 0

    imageFiles.forEach((file) => {
      newFiles.push(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        loadedCount++
        const preview = e.target?.result as string
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, file],
          imagePreviews: [...prev.imagePreviews, preview],
        }))
      }
      reader.readAsDataURL(file)
    })
  }, [])

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleImageFiles(e.dataTransfer.files)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleImageFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
    }))
  }

  function addSpecification() {
    setForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }))
  }

  function updateSpecification(index: number, field: "key" | "value", value: string) {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      ),
    }))
  }

  function removeSpecification(index: number) {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }))
  }

  /* ---- Submit ---- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Upload images first
      const imageUrls: string[] = []
      for (const file of form.images) {
        const formData = new FormData()
        formData.append("file", file)
        if (productId) {
          formData.append("productId", productId)
        }

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          imageUrls.push(uploadData.url)
        }
      }

      // Combine uploaded images with existing previews (URLs)
      const allImages = [
        ...form.imagePreviews.filter((preview) => preview.startsWith("http")),
        ...imageUrls,
      ]

      // Convert specifications to object
      const specifications: Record<string, string | number> = {}
      form.specifications.forEach((spec) => {
        if (spec.key.trim() && spec.value.trim()) {
          const numValue = Number(spec.value)
          specifications[spec.key.trim()] = isNaN(numValue) ? spec.value.trim() : numValue
        }
      })

      const productData = {
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
        longDescription: form.longDescription,
        image: allImages[0] || "",
        images: allImages,
        categoryId: form.categoryId || undefined,
        inStock: form.status === "Active",
        stockQuantity: parseInt(form.stock) || 0,
        specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
        usage: form.usage || undefined,
        shipping: form.shipping || undefined,
      }

      const url = productId ? `/api/products/${productId}` : "/api/products"
      const method = productId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        toast.success("Product saved successfully")
        window.location.href = "/admin/products"
      } else {
        const errorData = await response.json()
        
        // Handle validation errors
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.map((err: any) => {
            const field = err.path?.join(".") || "field"
            return `${field}: ${err.message}`
          }).join(", ")
          toast.error("Validation error", {
            description: errorMessages,
          })
        } else {
          toast.error("Failed to save product", {
            description: errorData.error || "An unexpected error occurred",
          })
        }
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Failed to save product", {
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>

      {/* Two-column grid on large screens */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ====== Left column – Details ====== */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Product details card */}
          <AdminCard title="Product Details">
            <div className="flex flex-col gap-5">
              {/* Name */}
              <FormInput
                label="Product Name"
                placeholder="e.g. BPC-157"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />

              {/* Price & Stock row */}
              <div className="grid gap-5 sm:grid-cols-2">
                <FormInput
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  required
                />
                <FormInput
                  label="Stock Quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => updateField("stock", e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <FormSelect
                label="Category"
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}
                required
                disabled={loadingCategories}
                options={[
                  { value: "", label: "Select a category" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />

              {/* Description */}
              <FormTextarea
                label="Description"
                rows={5}
                placeholder="Describe this product..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                required
              />

              {/* Specifications */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Specifications
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSpecification}
                    className="text-xs font-medium text-brand-primary hover:text-brand-secondary"
                  >
                    + Add Specification
                  </Button>
                </div>
                {form.specifications.length > 0 ? (
                  <div className="space-y-2">
                    {form.specifications.map((spec, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Key (e.g., Purity)"
                          value={spec.key}
                          onChange={(e) => updateSpecification(index, "key", e.target.value)}
                          className="flex-1 h-10 rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g., 99%)"
                          value={spec.value}
                          onChange={(e) => updateSpecification(index, "value", e.target.value)}
                          className="flex-1 h-10 rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSpecification(index)}
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          aria-label="Remove specification"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No specifications added. Click "Add Specification" to add one.
                  </p>
                )}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* ====== Right column – Image & Status ====== */}
        <div className="flex flex-col gap-6">
          {/* Images upload card */}
          <AdminCard title="Product Images">
            <div className="space-y-4">
              {/* Image gallery */}
              {form.imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {form.imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <Image
                        src={preview}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 16vw"
                        unoptimized={preview.startsWith("http")}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
                  dragActive
                    ? "border-brand-primary bg-brand-primary/10 bg-brand-primary/5"
                    : "border-border bg-muted/50 hover:border-brand-primary/50 hover:bg-brand-primary/5"
                )}
                role="button"
                tabIndex={0}
                aria-label="Upload product images"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
                  {dragActive ? (
                    <Upload className="h-5 w-5 text-brand-primary" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dragActive ? "Drop images here" : "Click or drag to upload"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG up to 5MB each
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Choose image files"
              />
            </div>
          </AdminCard>

          {/* Status card */}
          <AdminCard title="Status">

            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {form.status === "Active" ? "Active" : "Inactive"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.status === "Active"
                    ? "Product is visible in the store"
                    : "Product is hidden from the store"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.status === "Active"}
                onClick={() =>
                  updateField(
                    "status",
                    form.status === "Active" ? "Inactive" : "Active"
                  )
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                  form.status === "Active"
                    ? "bg-gradient-to-r from-brand-primary to-brand-secondary"
                    : "bg-muted"
                }`}
              >
                <span className="sr-only">Toggle product status</span>
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-md transform transition-transform ${
                    form.status === "Active"
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </AdminCard>

          {/* Actions card */}
          <AdminCard>
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full"
              >
                {submitting ? "Saving..." : productId ? "Update Product" : "Save Product"}
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-12 w-full"
              >
                <Link href="/admin/products">Cancel</Link>
              </Button>
            </div>
          </AdminCard>
        </div>
      </div>
    </form>
  )
}
