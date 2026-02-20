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
import { FormInput, FormTextarea, FormSelect, RichTextEditor } from "@/components/common"
import { cn } from "@/lib/utils"
import { isStorageUrl } from "@/lib/storage/supabase-storage"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProductVariantFormData {
  id?: string // For editing existing variants
  name: string // e.g., "10mg", "20mg", "60mg"
  price: string
  stock: string
  image?: string // Optional variant-specific image URL
  images?: string[] // Optional variant-specific images
  imageFiles: File[] // Files to upload for this variant
  imagePreviews: string[] // Preview URLs for this variant
  displayOrder: number
}

export interface ProductFormData {
  name: string
  description: string
  longDescription: string
  categoryId: string
  images: File[]
  imagePreviews: string[]
  specifications: Array<{ key: string; value: string }>
  usage: string
  shipping: string
  status: "Active" | "Inactive"
  variants: ProductVariantFormData[] // Product variants
}

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  longDescription: "",
  categoryId: "",
  images: [],
  imagePreviews: [],
  specifications: [{ key: "purity", value: "" }], // Purity as default property for peptides
  usage: "",
  shipping: "",
  status: "Active",
  variants: [{ name: "", price: "", stock: "0", imageFiles: [], imagePreviews: [], displayOrder: 0 }], // Start with one variant (required)
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
            // Convert specifications to array, ensuring purity is always present
            const specsArray = product.specifications
              ? Object.entries(product.specifications).map(([key, value]) => ({
                  key,
                  value: String(value),
                }))
              : []
            
            // Ensure purity is present as default property
            const hasPurity = specsArray.some((spec) => spec.key.toLowerCase() === "purity")
            if (!hasPurity) {
              specsArray.unshift({ key: "purity", value: "" })
            }

            // Load variants if they exist
            const variants: ProductVariantFormData[] = product.variants
              ? product.variants.map((v: any, index: number) => ({
                  id: v.id,
                  name: v.name || "",
                  price: v.price?.toString() || "",
                  stock: v.stockQuantity?.toString() || "0",
                  image: v.image || undefined,
                  images: v.images || undefined,
                  imageFiles: [],
                  imagePreviews: v.images && Array.isArray(v.images) && v.images.length > 0
                    ? v.images
                    : (v.image ? [v.image] : []),
                  displayOrder: v.displayOrder ?? index,
                }))
              : [{ name: "", price: "", stock: "0", imageFiles: [], imagePreviews: [], displayOrder: 0 }]

            setForm({
              name: product.name || "",
              // description: product.description || "", // DISABLED
              description: "", // DISABLED - keeping empty string for form compatibility
              longDescription: product.longDescription || "",
              categoryId: product.categoryId || "",
              images: [],
              imagePreviews: product.images || (product.image ? [product.image] : []),
              specifications: specsArray,
              usage: product.usage || "",
              shipping: product.shipping || "",
              status: product.inStock ? "Active" : "Inactive",
              variants,
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

  async function removeImage(index: number) {
    const preview = form.imagePreviews[index]
    
    // If it's an existing image from Supabase storage, delete it from storage
    if (preview && isStorageUrl(preview)) {
      try {
        const response = await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: preview }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Failed to delete image from storage:", errorData)
          toast.error("Failed to delete image from storage", {
            description: errorData.error || "The image was removed from the form but may still exist in storage.",
          })
        }
      } catch (error) {
        console.error("Error deleting image from storage:", error)
        toast.error("Error deleting image", {
          description: "The image was removed from the form but may still exist in storage.",
        })
      }
    }

    // Remove from form state
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

  /* ---- Variant handling ---- */

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: "",
          price: "",
          stock: "0",
          imageFiles: [],
          imagePreviews: [],
          displayOrder: prev.variants.length,
        },
      ],
    }))
  }

  function updateVariant(index: number, field: keyof ProductVariantFormData, value: string | number | File[] | string[]) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      ),
    }))
  }

  function removeVariant(index: number) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants
        .filter((_, i) => i !== index)
        .map((variant, i) => ({ ...variant, displayOrder: i })),
    }))
  }

  // Handle variant image uploads
  const handleVariantImageFiles = useCallback((variantIndex: number, files: FileList | null) => {
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
        setForm((prev) => {
          const updatedVariants = [...prev.variants]
          updatedVariants[variantIndex] = {
            ...updatedVariants[variantIndex],
            imageFiles: [...updatedVariants[variantIndex].imageFiles, file],
            imagePreviews: [...updatedVariants[variantIndex].imagePreviews, preview],
          }
          return { ...prev, variants: updatedVariants }
        })
      }
      reader.readAsDataURL(file)
    })
  }, [])

  async function removeVariantImage(variantIndex: number, imageIndex: number) {
    const variant = form.variants[variantIndex]
    const preview = variant.imagePreviews[imageIndex]
    
    // If it's an existing image from Supabase storage, delete it from storage
    if (preview && isStorageUrl(preview)) {
      try {
        const response = await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: preview }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Failed to delete image from storage:", errorData)
          toast.error("Failed to delete image from storage", {
            description: errorData.error || "The image was removed from the form but may still exist in storage.",
          })
        }
      } catch (error) {
        console.error("Error deleting image from storage:", error)
        toast.error("Error deleting image", {
          description: "The image was removed from the form but may still exist in storage.",
        })
      }
    }

    // Remove from form state
    setForm((prev) => {
      const updatedVariants = [...prev.variants]
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        imageFiles: updatedVariants[variantIndex].imageFiles.filter((_, i) => i !== imageIndex),
        imagePreviews: updatedVariants[variantIndex].imagePreviews.filter((_, i) => i !== imageIndex),
      }
      return { ...prev, variants: updatedVariants }
    })
  }

  /* ---- Submit ---- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Validate that Purity is provided (required default property)
      const puritySpec = form.specifications.find((spec) => spec.key.toLowerCase() === "purity")
      if (!puritySpec || !puritySpec.value.trim()) {
        toast.error("Purity is required", {
          description: "Please provide a purity value (e.g., 99.1%) as it's a required property for peptides.",
        })
        setSubmitting(false)
        return
      }

      // Validate that at least one variant is provided
      if (form.variants.length === 0) {
        toast.error("At least one variant is required", {
          description: "Please add at least one product variant (e.g., 10mg, 20mg, 60mg).",
        })
        setSubmitting(false)
        return
      }

      // Validate all variants have required fields
      for (let i = 0; i < form.variants.length; i++) {
        const variant = form.variants[i]
        if (!variant.name.trim()) {
          toast.error(`Variant ${i + 1} name is required`, {
            description: "Please provide a name for all variants (e.g., 10mg, 20mg).",
          })
          setSubmitting(false)
          return
        }
        if (!variant.price || parseFloat(variant.price) <= 0) {
          toast.error(`Variant ${i + 1} price is required`, {
            description: "Please provide a valid price for all variants.",
          })
          setSubmitting(false)
          return
        }
      }

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

      // Calculate overall stock status from variants
      const hasInStockVariant = form.variants.some(v => parseInt(v.stock) > 0)
      const totalStock = form.variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)

      const productData = {
        name: form.name,
        price: form.variants.length > 0 ? parseFloat(form.variants[0].price) : 0, // Use first variant price for backward compatibility
        // description: form.description, // DISABLED
        description: "", // DISABLED - keeping empty string for API compatibility
        longDescription: form.longDescription,
        image: allImages[0] || "",
        images: allImages,
        categoryId: form.categoryId || undefined,
        inStock: form.status === "Active" && hasInStockVariant,
        stockQuantity: totalStock,
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
        const result = await response.json()
        const savedProductId = result.product?.id || productId

        // Save variants if any exist
        if (form.variants.length > 0 && savedProductId) {
          try {
            // Delete existing variants that are not in the form
            const existingVariants = result.product?.variants || []
            const variantIdsToKeep = form.variants
              .map((v) => v.id)
              .filter((id): id is string => !!id)
            
            for (const existing of existingVariants) {
              if (!variantIdsToKeep.includes(existing.id)) {
                await fetch(`/api/products/${savedProductId}/variants/${existing.id}`, {
                  method: "DELETE",
                })
              }
            }

            // Create/update variants
            for (const variant of form.variants) {
              // Upload variant images first
              const variantImageUrls: string[] = []
              for (const file of variant.imageFiles) {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("productId", savedProductId)

                const uploadResponse = await fetch("/api/upload", {
                  method: "POST",
                  body: formData,
                })

                if (uploadResponse.ok) {
                  const uploadData = await uploadResponse.json()
                  variantImageUrls.push(uploadData.url)
                }
              }

              // Combine uploaded images with existing previews (URLs)
              const allVariantImages = [
                ...variant.imagePreviews.filter((preview) => preview.startsWith("http")),
                ...variantImageUrls,
              ]

              const variantData = {
                name: variant.name,
                price: parseFloat(variant.price),
                stockQuantity: parseInt(variant.stock) || 0,
                image: allVariantImages[0] || variant.image || undefined,
                images: allVariantImages.length > 0 ? allVariantImages : variant.images || undefined,
                displayOrder: variant.displayOrder,
              }

              if (variant.id) {
                // Update existing variant
                await fetch(`/api/products/${savedProductId}/variants/${variant.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(variantData),
                })
              } else {
                // Create new variant
                await fetch(`/api/products/${savedProductId}/variants`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(variantData),
                })
              }
            }
          } catch (variantError) {
            console.error("Error saving variants:", variantError)
            toast.error("Product saved but variants failed to save", {
              description: "Please edit the product to update variants.",
            })
          }
        }

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

              {/* Product Variants - Moved right after product name */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <label
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Product Variants (Strengths) <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      At least one variant is required. Add different strengths (e.g., 10mg, 20mg, 60mg) as variants. Each variant can have its own price, stock, and images.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addVariant}
                    className="text-xs font-medium text-brand-primary hover:text-brand-secondary"
                  >
                    + Add Variant
                  </Button>
                </div>
                {form.variants.length > 0 ? (
                  <div className="space-y-4">
                    {form.variants.map((variant, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-border bg-muted/30 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Variant {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(index)}
                            disabled={form.variants.length === 1}
                            className={`h-8 w-8 text-destructive hover:bg-destructive/10 ${
                              form.variants.length === 1 ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            aria-label="Remove variant"
                            title={form.variants.length === 1 ? "At least one variant is required" : undefined}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormInput
                            label="Variant Name"
                            placeholder="e.g., 10mg"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                            required
                          />
                          <FormInput
                            label="Price ($)"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, "price", e.target.value)}
                            required
                          />
                          <FormInput
                            label="Stock Quantity"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, "stock", e.target.value)}
                            required
                          />
                        </div>
                        
                        {/* Variant Images */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Variant Images (Optional)
                          </label>
                          {variant.imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {variant.imagePreviews.map((preview, imgIndex) => (
                                <div
                                  key={imgIndex}
                                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                                >
                                  <Image
                                    src={preview}
                                    alt={`Variant ${index + 1} image ${imgIndex + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 33vw, 10vw"
                                    unoptimized={preview.startsWith("http")}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeVariantImage(index, imgIndex)}
                                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
                                    aria-label="Remove image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div
                            onClick={() => {
                              const input = document.createElement("input")
                              input.type = "file"
                              input.accept = "image/*"
                              input.multiple = true
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files
                                if (files) handleVariantImageFiles(index, files)
                              }
                              input.click()
                            }}
                            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 px-4 py-3 text-center transition-all duration-200 hover:border-brand-primary/50 hover:bg-brand-primary/5"
                          >
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              Click to upload variant images
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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

              {/* Description - DISABLED */}
              {/* <FormTextarea
                label="Short Description"
                rows={5}
                placeholder="Describe this product..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              /> */}

              {/* Detailed Description (rich text) */}
              <RichTextEditor
                label="Detailed Description"
                value={form.longDescription}
                onChange={(html) => updateField("longDescription", html)}
                helperText="Shown on the product page Description tab. Supports formatting (bold, lists, links, etc)."
              />

              {/* Specifications */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <label
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Specifications
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Purity is required for all peptides
                    </p>
                  </div>
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
                    {form.specifications.map((spec, index) => {
                      const isPurity = spec.key.toLowerCase() === "purity"
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={isPurity ? "Purity (required)" : "Key (e.g., Weight)"}
                            value={spec.key}
                            onChange={(e) => updateSpecification(index, "key", e.target.value)}
                            disabled={isPurity}
                            className={`flex-1 h-10 rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20 ${
                              isPurity ? "opacity-75 cursor-not-allowed" : ""
                            }`}
                          />
                          <input
                            type="text"
                            placeholder={isPurity ? "Value (e.g., 99.1%)" : "Value (e.g., 5mg)"}
                            value={spec.value}
                            onChange={(e) => updateSpecification(index, "value", e.target.value)}
                            required={isPurity}
                            className="flex-1 h-10 rounded-xl bg-background border-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-primary/20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSpecification(index)}
                            disabled={isPurity}
                            className={`h-10 w-10 text-destructive hover:bg-destructive/10 ${
                              isPurity ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            aria-label={isPurity ? "Purity cannot be removed" : "Remove specification"}
                            title={isPurity ? "Purity is a required default property" : undefined}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
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
