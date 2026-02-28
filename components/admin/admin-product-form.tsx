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
  sku: string
  price: string
  stock: string
  isDefault?: boolean
  imageFiles: File[] // New files to upload for this variant
  imageFilePreviews: string[] // Data-URL previews corresponding 1:1 with imageFiles
  imagePreviews: string[] // Preview URLs for this variant
  primaryImageIndex: number
  displayOrder: number
}

export interface ProductFormData {
  name: string
  description: string
  longDescription: string
  categoryId: string
  thumbnailFile?: File
  thumbnailPreview: string
  // COA (Certificate of Analysis)
  coaFile?: File
  coaPreview: string
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
  thumbnailFile: undefined,
  thumbnailPreview: "",
   coaFile: undefined,
   coaPreview: "",
  specifications: [{ key: "purity", value: "" }], // Purity as default property for peptides
  usage: "",
  shipping: "",
  status: "Active",
  variants: [
    {
      sku: "",
      price: "",
      stock: "0",
      isDefault: true,
      imageFiles: [],
      imageFilePreviews: [],
      imagePreviews: [],
      primaryImageIndex: 0,
      displayOrder: 0,
    },
  ], // Start with one default variant (required)
}

async function syncVariantImagesToServer(
  productId: string,
  variantId: string,
  urls: string[],
  primaryIndex: number
) {
  try {
    await fetch(`/api/products/${productId}/variants/${variantId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: urls.map((url, i) => ({
          imageUrl: url,
          isPrimary: i === primaryIndex,
          sortOrder: i,
        })),
      }),
    })
  } catch (error) {
    console.error("Failed to sync variant images:", error)
    toast.error("Failed to update variant images", {
      description: "The image changes may not have been saved. Please try again.",
    })
  }
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
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

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
                  sku: v.sku || "",
                  price: v.price?.toString() || "",
                  stock: (v.stock ?? v.stockQuantity)?.toString() || "0",
                  isDefault: !!v.isDefault,
                  imageFiles: [],
                  imageFilePreviews: [],
                  imagePreviews: [],
                  primaryImageIndex: 0,
                  displayOrder: v.displayOrder ?? index,
                }))
              : [{ sku: "", price: "", stock: "0", color: "", size: "", isDefault: true, imageFiles: [], imageFilePreviews: [], imagePreviews: [], primaryImageIndex: 0, displayOrder: 0 }]

            // Load variant images for editing (from normalized variant_images table)
            const variantsWithImages: ProductVariantFormData[] = await Promise.all(
              variants.map(async (variant) => {
                if (!productId || !variant.id) return variant
                try {
                  const imgRes = await fetch(`/api/products/${productId}/variants/${variant.id}/images`)
                  if (!imgRes.ok) return variant
                  const imgData = await imgRes.json()
                  const imgs = Array.isArray(imgData.images) ? imgData.images : []
                  const urls = imgs.map((i: any) => i.imageUrl).filter(Boolean)
                  const primaryIdx = imgs.findIndex((i: any) => i.isPrimary)
                  return {
                    ...variant,
                    imagePreviews: urls,
                    primaryImageIndex: primaryIdx >= 0 ? primaryIdx : 0,
                  }
                } catch {
                  return variant
                }
              })
            )

            setForm({
              name: product.name || "",
              // description: product.description || "", // DISABLED
              description: "", // DISABLED - keeping empty string for form compatibility
              longDescription: product.longDescription || "",
              categoryId: product.categoryId || "",
              thumbnailFile: undefined,
              thumbnailPreview: product.thumbnailUrl || "",
              coaFile: undefined,
              coaPreview: product.coaUrl || "",
              specifications: specsArray,
              usage: product.usage || "",
              shipping: product.shipping || "",
              status: product.inStock ? "Active" : "Inactive",
              variants: variantsWithImages,
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

  /* ---- Thumbnail handling ---- */

  const handleThumbnailFile = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!file.type.startsWith("image/")) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        setForm((prev) => ({
          ...prev,
          thumbnailFile: file,
          thumbnailPreview: preview,
        }))

        // If editing an existing product, immediately upload and persist thumbnail
        if (productId) {
          ;(async () => {
            try {
              // Best-effort delete previous thumbnail from storage if it was a storage URL
              if (form.thumbnailPreview && isStorageUrl(form.thumbnailPreview)) {
                try {
                  await fetch("/api/upload/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: form.thumbnailPreview }),
                  })
                } catch {
                  // ignore delete failures here
                }
              }

              const thumbFd = new FormData()
              thumbFd.append("file", file)
              thumbFd.append("productId", productId)
              thumbFd.append("kind", "thumbnail")

              const uploadRes = await fetch("/api/upload", { method: "POST", body: thumbFd })
              if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}))
                console.error("Failed to upload thumbnail:", err)
                toast.error("Failed to upload thumbnail", {
                  description: err.error || "Please try again.",
                })
                return
              }

              const uploadData = await uploadRes.json()
              const url = uploadData.url as string | undefined
              if (!url) return

              setForm((prev) => ({
                ...prev,
                thumbnailFile: undefined,
                thumbnailPreview: url,
              }))

              await fetch(`/api/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ thumbnailUrl: url, image: url }),
              })
            } catch (error) {
              console.error("Error saving thumbnail:", error)
              toast.error("Failed to save thumbnail", {
                description: "The thumbnail may not have been updated. Please try again.",
              })
            }
          })()
        }
      }
      reader.readAsDataURL(file)
    },
    [productId, form.thumbnailPreview]
  )

  /* ---- COA handling ---- */

  const handleCoaFile = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!file.type.startsWith("image/")) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        setForm((prev) => ({
          ...prev,
          coaFile: file,
          coaPreview: preview,
        }))

        // If editing an existing product, immediately upload and persist COA image
        if (productId) {
          ;(async () => {
            try {
              // Best-effort delete previous COA image from storage if it was a storage URL
              if (form.coaPreview && isStorageUrl(form.coaPreview)) {
                try {
                  await fetch("/api/upload/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: form.coaPreview }),
                  })
                } catch {
                  // ignore delete failures here
                }
              }

              const coaFd = new FormData()
              coaFd.append("file", file)
              coaFd.append("productId", productId)
              coaFd.append("kind", "coa")

              const uploadRes = await fetch("/api/upload", { method: "POST", body: coaFd })
              if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}))
                console.error("Failed to upload COA image:", err)
                toast.error("Failed to upload COA image", {
                  description: err.error || "Please try again.",
                })
                return
              }

              const uploadData = await uploadRes.json()
              const url = uploadData.url as string | undefined
              if (!url) return

              setForm((prev) => ({
                ...prev,
                coaFile: undefined,
                coaPreview: url,
              }))

              await fetch(`/api/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coaUrl: url }),
              })
            } catch (error) {
              console.error("Error saving COA image:", error)
              toast.error("Failed to save COA image", {
                description: "The COA may not have been updated. Please try again.",
              })
            }
          })()
        }
      }
      reader.readAsDataURL(file)
    },
    [productId, form.coaPreview]
  )

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
    const file = e.dataTransfer.files?.[0] || null
    handleThumbnailFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    handleThumbnailFile(file)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
  }

  async function clearThumbnail() {
    const preview = form.thumbnailPreview
    
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
      thumbnailFile: undefined,
      thumbnailPreview: "",
    }))

    // If editing an existing product, immediately clear thumbnail on the product record
    if (productId) {
      try {
        await fetch(`/api/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnailUrl: null, image: null }),
        })
      } catch (error) {
        console.error("Error clearing thumbnail on product:", error)
        toast.error("Failed to update product thumbnail", {
          description: "The thumbnail reference may not have been removed from the product.",
        })
      }
    }
  }

  /* ---- COA helpers ---- */

  function handleCoaInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    handleCoaFile(file)
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
          sku: "",
          price: "",
          stock: "0",
          isDefault: false,
          imageFiles: [],
          imageFilePreviews: [],
          imagePreviews: [],
          primaryImageIndex: 0,
          displayOrder: prev.variants.length,
        },
      ],
    }))
  }

  function updateVariant(index: number, field: keyof ProductVariantFormData, value: any) {
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
        .map((variant, i) => ({ ...variant, displayOrder: i }))
        .map((variant, i, arr) => {
          // If we removed the default variant, ensure another becomes default.
          if (arr.some((v) => v.isDefault)) return variant
          return i === 0 ? { ...variant, isDefault: true } : { ...variant, isDefault: false }
        }),
    }))
  }

  // Handle variant image uploads
  const handleVariantImageFiles = useCallback(
    async (variantIndex: number, files: FileList | null) => {
      if (!files || files.length === 0) return

      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
      if (imageFiles.length === 0) return

      const targetVariant = form.variants[variantIndex]

      // If we don't yet have a saved product or variant, keep changes local and persist on Save
      if (!productId || !targetVariant?.id) {
        imageFiles.forEach((file) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const preview = e.target?.result as string
            setForm((prev) => {
              const updatedVariants = [...prev.variants]
              const v = updatedVariants[variantIndex]
              const existingCount = v.imagePreviews.length
              updatedVariants[variantIndex] = {
                ...v,
                imageFiles: [...v.imageFiles, file],
                imageFilePreviews: [...v.imageFilePreviews, preview],
                imagePreviews: [...v.imagePreviews, preview],
                primaryImageIndex: existingCount === 0 ? 0 : v.primaryImageIndex,
              }
              return { ...prev, variants: updatedVariants }
            })
          }
          reader.readAsDataURL(file)
        })
        return
      }

      // For existing products and variants, upload immediately and sync to server
      try {
        const uploadedUrls: string[] = []
        for (const file of imageFiles) {
          const fd = new FormData()
          fd.append("file", file)
          fd.append("productId", productId)
          fd.append("variantId", targetVariant.id)
          fd.append("kind", "variant")

          const up = await fetch("/api/upload", { method: "POST", body: fd })
          if (!up.ok) {
            const err = await up.json().catch(() => ({}))
            console.error("Failed to upload variant image:", err)
            toast.error("Failed to upload variant image", {
              description: err.error || "Please try again.",
            })
            continue
          }
          const upData = await up.json()
          if (upData?.url) {
            uploadedUrls.push(upData.url)
          }
        }

        if (uploadedUrls.length === 0) return

        const basePreviews = targetVariant.imagePreviews || []
        const nextPreviews = [...basePreviews, ...uploadedUrls]
        const nextPrimary =
          basePreviews.length === 0 ? 0 : targetVariant.primaryImageIndex ?? 0

        setForm((prev) => ({
          ...prev,
          variants: prev.variants.map((v, i) =>
            i === variantIndex
              ? {
                  ...v,
                  imagePreviews: nextPreviews,
                  imageFiles: [],
                  imageFilePreviews: [],
                  primaryImageIndex: nextPrimary,
                }
              : v
          ),
        }))

        await syncVariantImagesToServer(productId, targetVariant.id, nextPreviews, nextPrimary)
      } catch (error) {
        console.error("Error uploading variant images:", error)
        toast.error("Failed to upload variant images", {
          description: "Please try again.",
        })
      }
    },
    [form.variants, productId]
  )

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
            description:
              errorData.error ||
              "The image was removed from the form but may still exist in storage.",
          })
        }
      } catch (error) {
        console.error("Error deleting image from storage:", error)
        toast.error("Error deleting image", {
          description: "The image was removed from the form but may still exist in storage.",
        })
      }
    }

    // Compute next state for this variant
    let nextFiles = variant.imageFiles
    let nextFilePreviews = variant.imageFilePreviews
    if (preview && !preview.startsWith("http")) {
      const fileIdx = nextFilePreviews.indexOf(preview)
      if (fileIdx >= 0) {
        nextFiles = nextFiles.filter((_, i) => i !== fileIdx)
        nextFilePreviews = nextFilePreviews.filter((_, i) => i !== fileIdx)
      }
    }

    const nextPreviews = variant.imagePreviews.filter((_, i) => i !== imageIndex)
    let nextPrimary = variant.primaryImageIndex ?? 0
    if (imageIndex === nextPrimary) nextPrimary = 0
    else if (imageIndex < nextPrimary) nextPrimary = Math.max(0, nextPrimary - 1)
    if (nextPreviews.length === 0) nextPrimary = 0

    // Update local form state
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              imageFiles: nextFiles,
              imageFilePreviews: nextFilePreviews,
              imagePreviews: nextPreviews,
              primaryImageIndex: nextPrimary,
            }
          : v
      ),
    }))

    // If this is an existing variant on an existing product, immediately sync images
    if (productId && variant.id) {
      await syncVariantImagesToServer(productId, variant.id, nextPreviews, nextPrimary)
    }
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
          description: "Please add at least one product variant.",
        })
        setSubmitting(false)
        return
      }

      // Normalize default variant (exactly one)
      const defaultCount = form.variants.filter((v) => !!v.isDefault).length
      const variantsNormalized =
        defaultCount === 1
          ? form.variants
          : form.variants.map((v, i) => ({ ...v, isDefault: i === 0 }))

      // Convert specifications to object
      const specifications: Record<string, string | number> = {}
      form.specifications.forEach((spec) => {
        if (spec.key.trim() && spec.value.trim()) {
          const numValue = Number(spec.value)
          specifications[spec.key.trim()] = isNaN(numValue) ? spec.value.trim() : numValue
        }
      })

      // Validate all variants have required fields
      for (let i = 0; i < variantsNormalized.length; i++) {
        const variant = variantsNormalized[i]
        if (!variant.sku.trim()) {
          toast.error(`Variant ${i + 1} SKU is required`, {
            description: "Please provide a SKU for all variants.",
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

      // Calculate overall stock status from variants
      const hasInStockVariant = variantsNormalized.some((v) => parseInt(v.stock) > 0)
      const totalStock = variantsNormalized.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
      const defaultVariant = variantsNormalized.find((v) => v.isDefault) || variantsNormalized[0]

      const productData = {
        name: form.name,
        price: defaultVariant ? parseFloat(defaultVariant.price) : 0, // Backward compatibility
        // description: form.description, // DISABLED
        description: "", // DISABLED - keeping empty string for API compatibility
        longDescription: form.longDescription,
        thumbnailUrl: !form.thumbnailFile && form.thumbnailPreview?.startsWith("http") ? form.thumbnailPreview : undefined,
        image: "", // legacy
        images: [], // legacy
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
        if (!savedProductId) {
          throw new Error("Failed to determine saved product id")
        }

        // Upload/replace thumbnail if provided
        if (form.thumbnailFile) {
          // Best-effort delete existing thumbnail if it was a storage URL
          if (form.thumbnailPreview && isStorageUrl(form.thumbnailPreview)) {
            try {
              await fetch("/api/upload/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: form.thumbnailPreview }),
              })
            } catch {
              // ignore
            }
          }

          const thumbFd = new FormData()
          thumbFd.append("file", form.thumbnailFile)
          thumbFd.append("productId", savedProductId)
          thumbFd.append("kind", "thumbnail")

          const uploadRes = await fetch("/api/upload", { method: "POST", body: thumbFd })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            await fetch(`/api/products/${savedProductId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ thumbnailUrl: uploadData.url, image: uploadData.url }),
            })
          }
        }

        // Upload COA image if provided
        if (form.coaFile && savedProductId) {
          const coaFd = new FormData()
          coaFd.append("file", form.coaFile)
          coaFd.append("productId", savedProductId)
          coaFd.append("kind", "coa")

          const coaUploadRes = await fetch("/api/upload", { method: "POST", body: coaFd })
          if (coaUploadRes.ok) {
            const uploadData = await coaUploadRes.json()
            await fetch(`/api/products/${savedProductId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coaUrl: uploadData.url }),
            })
          }
        }

        // Save variants if any exist
        if (variantsNormalized.length > 0 && savedProductId) {
          try {
            // Fetch current variants from API (don't rely on product payload)
            const existingRes = await fetch(`/api/products/${savedProductId}/variants`, { cache: "no-store" })
            const existingJson = existingRes.ok ? await existingRes.json() : { variants: [] }
            const existingVariants = existingJson.variants || []
            const variantIdsToKeep = variantsNormalized
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
            for (const [idx, variant] of variantsNormalized.entries()) {
              const variantData = {
                sku: variant.sku,
                price: parseFloat(variant.price),
                stock: parseInt(variant.stock) || 0,
                isDefault: !!variant.isDefault,
                displayOrder: idx,
              }

              let savedVariantId = variant.id
              if (variant.id) {
                // Update existing variant
                await fetch(`/api/products/${savedProductId}/variants/${variant.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(variantData),
                })
              } else {
                // Create new variant
                const createRes = await fetch(`/api/products/${savedProductId}/variants`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(variantData),
                })
                if (createRes.ok) {
                  const created = await createRes.json()
                  savedVariantId = created.variant?.id
                }
              }

              if (!savedVariantId) {
                throw new Error("Failed to save variant")
              }

              // Upload new images (preserve ordering using preview->uploadedUrl mapping)
              const uploadedByPreview: Record<string, string> = {}
              for (let fIdx = 0; fIdx < variant.imageFiles.length; fIdx++) {
                const file = variant.imageFiles[fIdx]
                const preview = variant.imageFilePreviews[fIdx]

                const fd = new FormData()
                fd.append("file", file)
                fd.append("productId", savedProductId)
                fd.append("variantId", savedVariantId)
                fd.append("kind", "variant")

                const up = await fetch("/api/upload", { method: "POST", body: fd })
                if (up.ok) {
                  const upData = await up.json()
                  uploadedByPreview[preview] = upData.url
                }
              }

              const finalUrls = variant.imagePreviews
                .map((p) => (p.startsWith("http") ? p : uploadedByPreview[p]))
                .filter(Boolean) as string[]

              const primaryIndex = Math.min(
                Math.max(0, variant.primaryImageIndex || 0),
                Math.max(0, finalUrls.length - 1)
              )

              // If there are no URLs to persist and no new files were uploaded,
              // skip the image sync to avoid wiping existing images unintentionally.
              if (finalUrls.length === 0 && variant.imageFiles.length === 0) {
                continue
              }

              await fetch(`/api/products/${savedProductId}/variants/${savedVariantId}/images`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  images: finalUrls.map((url, i) => ({
                    imageUrl: url,
                    isPrimary: i === primaryIndex,
                    sortOrder: i,
                  })),
                }),
              })
            }

            // If no explicit thumbnail was provided, derive from default variant primary image.
            if (!form.thumbnailFile && (!form.thumbnailPreview || form.thumbnailPreview.trim() === "")) {
              await fetch(`/api/products/${savedProductId}/sync-thumbnail`, { method: "POST" })
            }
          } catch (variantError) {
            console.error("Error saving variants:", variantError)
            toast.error("Product saved but variants failed to save", {
              description: "Please edit the product to update variants.",
            })
          }
        }

        // After product and variants are saved, best-effort sync to Stripe
        if (savedProductId) {
          try {
            const stripeSyncRes = await fetch(`/api/stripe/sync-product/${savedProductId}`, {
              method: "POST",
            })
            if (!stripeSyncRes.ok) {
              const err = await stripeSyncRes.json().catch(() => ({}))
              console.error("Stripe sync failed:", err)
              toast.error("Product saved, but failed to sync with Stripe", {
                description: err.error || "Please check Stripe configuration.",
              })
            }
          } catch (stripeErr) {
            console.error("Stripe sync error:", stripeErr)
            toast.error("Product saved, but failed to sync with Stripe", {
              description: "Please verify your Stripe keys and try again.",
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
                            label="Variant SKU"
                            placeholder="e.g., 10MG"
                            value={variant.sku}
                            onChange={(e) => updateVariant(index, "sku", e.target.value)}
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
                            Variant Images <span className="text-destructive">*</span>
                          </label>
                          {variant.imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {variant.imagePreviews.map((preview, imgIndex) => (
                                <div
                                  key={imgIndex}
                                  className="relative aspect-square overflow-hidden rounded-lg bg-muted cursor-move"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", imgIndex.toString())
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    const fromIndex = parseInt(
                                      e.dataTransfer.getData("text/plain") || "-1",
                                      10
                                    )
                                    if (!Number.isNaN(fromIndex) && fromIndex !== imgIndex) {
                                      const nextPreviews = [...variant.imagePreviews]
                                      const [moved] = nextPreviews.splice(fromIndex, 1)
                                      nextPreviews.splice(imgIndex, 0, moved)

                                      let nextPrimary = variant.primaryImageIndex ?? 0
                                      if (fromIndex === nextPrimary) {
                                        nextPrimary = imgIndex
                                      } else if (
                                        fromIndex < nextPrimary &&
                                        imgIndex >= nextPrimary
                                      ) {
                                        nextPrimary = Math.max(0, nextPrimary - 1)
                                      } else if (
                                        fromIndex > nextPrimary &&
                                        imgIndex <= nextPrimary
                                      ) {
                                        nextPrimary = Math.min(
                                          nextPreviews.length - 1,
                                          nextPrimary + 1
                                        )
                                      }

                                      setForm((prev) => ({
                                        ...prev,
                                        variants: prev.variants.map((v, i) =>
                                          i === index
                                            ? {
                                                ...v,
                                                imagePreviews: nextPreviews,
                                                primaryImageIndex: nextPrimary,
                                              }
                                            : v
                                        ),
                                      }))

                                      if (productId && variant.id) {
                                        void syncVariantImagesToServer(
                                          productId,
                                          variant.id,
                                          nextPreviews,
                                          nextPrimary
                                        )
                                      }
                                    }
                                  }}
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm((prev) => ({
                                        ...prev,
                                        variants: prev.variants.map((v, i) =>
                                          i === index
                                            ? { ...v, primaryImageIndex: imgIndex }
                                            : v
                                        ),
                                      }))

                                      if (productId && variant.id && variant.imagePreviews.length) {
                                        void syncVariantImagesToServer(
                                          productId,
                                          variant.id,
                                          variant.imagePreviews,
                                          imgIndex
                                        )
                                      }
                                    }}
                                    className={cn(
                                      "absolute left-1 bottom-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
                                      variant.primaryImageIndex === imgIndex
                                        ? "bg-brand-primary text-white"
                                        : "bg-background/90 text-muted-foreground hover:bg-accent"
                                    )}
                                  >
                                    {variant.primaryImageIndex === imgIndex ? "Primary" : "Make primary"}
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
          {/* Thumbnail upload card */}
          <AdminCard title="Product Thumbnail">
            <div className="space-y-4">
              {/* Thumbnail preview */}
              {form.thumbnailPreview && (
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={form.thumbnailPreview}
                    alt="Product thumbnail"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 16vw"
                    unoptimized={form.thumbnailPreview.startsWith("http")}
                  />
                  <button
                    type="button"
                    onClick={clearThumbnail}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
                    aria-label="Remove thumbnail"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Upload area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => thumbnailInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
                  dragActive
                    ? "border-brand-primary bg-brand-primary/10 bg-brand-primary/5"
                    : "border-border bg-muted/50 hover:border-brand-primary/50 hover:bg-brand-primary/5"
                )}
                role="button"
                tabIndex={0}
                aria-label="Upload product thumbnail"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    thumbnailInputRef.current?.click()
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
                    {dragActive ? "Drop image here" : "Click or drag to upload"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Choose thumbnail image"
              />
            </div>
          </AdminCard>

          {/* COA upload card */}
          <AdminCard title="Certificate of Analysis (COA)">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Upload an image of the lab Certificate of Analysis. When present, a COA tab will appear on the product detail page.
              </p>

              {form.coaPreview && (
                <div className="relative overflow-hidden rounded-xl bg-muted border border-border">
                  <Image
                    src={form.coaPreview}
                    alt="COA preview"
                    width={800}
                    height={1000}
                    className="h-auto w-full object-contain bg-white"
                    unoptimized={form.coaPreview.startsWith("http")}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  COA Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoaInputChange}
                  className="block w-full rounded-xl border border-gray-200 bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
                />
                <p className="text-[11px] text-muted-foreground">
                  JPEG, PNG, or WebP up to 5MB. For structured details like lab name or test date, use Specifications.
                </p>
              </div>
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
