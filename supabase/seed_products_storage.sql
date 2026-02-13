-- Seed Products for Supabase with Storage URLs
-- This script seeds products with Supabase Storage image paths
-- IMPORTANT: 
-- 1. Upload product images to Supabase Storage bucket "products" first
-- 2. Images should be organized in directories by product UUID: {product-uuid}/{filename}
-- 3. After inserting products, update image paths with actual product UUIDs
-- 4. Or use the UPDATE statements at the bottom after products are created

-- Example Storage path format:
-- {product-uuid}/product-bpc157.jpg
-- Will be converted to: {SUPABASE_URL}/storage/v1/object/public/products/{product-uuid}/product-bpc157.jpg

-- Note: Since product IDs are auto-generated UUIDs, you'll need to:
-- Option A: Insert products first, then update image paths with UPDATE statements
-- Option B: Use a script that creates products and uploads images in the correct directory

-- Insert all 6 products (images will be updated after creation)
INSERT INTO public.products (
  name,
  price,
  description,
  long_description,
  image,
  images,
  category,
  in_stock,
  stock_quantity,
  specifications,
  usage,
  shipping
) VALUES
(
  'BPC-157',
  49.99,
  'A pentadecapeptide composed of 15 amino acids. Widely studied for tissue repair and regenerative research applications.',
  'BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide derived from a protective protein found in human gastric juice. Comprising 15 amino acids, this peptide has been the subject of extensive in-vitro and in-vivo research for its potential role in tissue repair, angiogenesis, and cytoprotection. Studies have explored its interaction with the nitric oxide system and its influence on growth factor expression. Each vial contains 5mg of lyophilized peptide, HPLC-verified for purity exceeding 99%.',
  'temp/product-bpc157.jpg', -- Temporary path - will be updated after product creation
  '["temp/product-bpc157.jpg"]'::jsonb,
  'Repair',
  true,
  100,
  '{"purity": "99.1%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water at the desired concentration. Store reconstituted solution at 2-8°C and use within 30 days. Lyophilized powder may be stored at -20°C for long-term preservation. Always handle under sterile conditions following laboratory safety protocols.',
  'Ships within 24 hours of order placement via insulated cold-chain packaging. All domestic orders include free priority shipping (2-3 business days). International orders are available with tracked express delivery (5-7 business days). Each shipment includes a certificate of analysis and is sealed for tamper evidence.'
),
(
  'TB-500',
  54.99,
  'A synthetic fraction of thymosin beta-4. Investigated for its role in cell migration and wound healing research.',
  'TB-500 (Thymosin Beta-4 Fragment) is a synthetic peptide fragment derived from thymosin beta-4, a naturally occurring protein involved in cell migration, wound healing, and tissue regeneration. This fragment has been studied for its potential to promote angiogenesis, enhance cell migration, and support tissue repair mechanisms. Research has focused on its interaction with actin and its role in cellular processes. Each vial contains 5mg of lyophilized peptide, verified for purity.',
  'temp/product-tb500.jpg',
  '["temp/product-tb500.jpg"]'::jsonb,
  'Repair',
  true,
  85,
  '{"purity": "98.7%", "weight": "5mg", "form": "Lyophilized", "sequence": "LKKTETQ"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer solution. Store reconstituted peptide at 2-8°C and use within 14 days. Lyophilized form should be stored at -20°C. Handle with appropriate laboratory safety measures.',
  'Ships within 24 hours via temperature-controlled packaging. Free domestic shipping (2-3 business days). International express shipping available (5-7 business days). Includes certificate of analysis and tamper-evident packaging.'
),
(
  'GHK-Cu',
  39.99,
  'A naturally occurring copper peptide complex. Researched for its potential in skin biology and tissue remodeling studies.',
  'GHK-Cu (Glycyl-L-Histidyl-L-Lysine-Copper) is a naturally occurring tripeptide complexed with copper. This peptide has been extensively researched for its potential role in skin biology, wound healing, and tissue remodeling. Studies have explored its antioxidant properties, collagen synthesis promotion, and its interaction with growth factors. Each vial contains 5mg of lyophilized peptide-copper complex.',
  'temp/product-ghkcu.jpg',
  '["temp/product-ghkcu.jpg"]'::jsonb,
  'Anti-Aging',
  true,
  120,
  '{"purity": "99.3%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-His-Lys"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer. Store reconstituted solution at 2-8°C. Lyophilized form stable at -20°C. Avoid repeated freeze-thaw cycles.',
  'Ships within 24 hours via insulated packaging. Free priority domestic shipping (2-3 business days). International tracked express available (5-7 business days). Certificate of analysis included.'
),
(
  'Ipamorelin',
  49.99,
  'A growth hormone secretagogue. Studied for its selective stimulation of growth hormone release.',
  'Ipamorelin is a pentapeptide growth hormone secretagogue (GHS) that selectively stimulates growth hormone (GH) release without significantly affecting cortisol, prolactin, or other hormones. Research has focused on its mechanism of action through the ghrelin receptor and its potential applications in growth hormone research. Each vial contains 5mg of lyophilized peptide, HPLC-verified.',
  'temp/product-ipamorelin.jpg',
  '["temp/product-ipamorelin.jpg"]'::jsonb,
  'Growth',
  true,
  90,
  '{"purity": "98.5%", "weight": "5mg", "form": "Lyophilized", "sequence": "Aib-His-D-2-Nal-D-Phe-Lys-NH2"}'::jsonb,
  'For research use only. Reconstitute with sterile water or bacteriostatic water. Store reconstituted solution at 2-8°C and use within 30 days. Lyophilized powder stable at -20°C. Handle under sterile conditions.',
  'Ships within 24 hours via cold-chain packaging. Free domestic priority shipping (2-3 business days). International express available (5-7 business days). Includes COA and tamper-evident seal.'
),
(
  'CJC-1295',
  59.99,
  'A long-acting growth hormone releasing hormone analog. Investigated for sustained growth hormone release.',
  'CJC-1295 is a synthetic growth hormone releasing hormone (GHRH) analog modified with a drug affinity complex (DAC) for extended half-life. This modification allows for sustained release and prolonged activity. Research has explored its potential for sustained growth hormone elevation and its applications in growth hormone research. Each vial contains 5mg of lyophilized peptide.',
  'temp/product-cjc1295.jpg',
  '["temp/product-cjc1295.jpg"]'::jsonb,
  'Growth',
  true,
  75,
  '{"purity": "97.8%", "weight": "5mg", "form": "Lyophilized", "sequence": "Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer. Store reconstituted solution at 2-8°C. Lyophilized form stable at -20°C. Follow sterile laboratory protocols.',
  'Ships within 24 hours via temperature-controlled packaging. Free priority domestic shipping (2-3 business days). International tracked express (5-7 business days). Certificate of analysis included.'
),
(
  'LL-37',
  64.99,
  'A human antimicrobial peptide. Researched for its role in innate immunity and wound healing.',
  'LL-37 is a 37-amino acid antimicrobial peptide derived from the C-terminal domain of human cathelicidin. This peptide has been extensively studied for its antimicrobial properties, immune modulation, and wound healing capabilities. Research has explored its interaction with bacterial membranes, its role in inflammation, and its potential therapeutic applications. Each vial contains 5mg of lyophilized peptide.',
  'temp/product-ll37.jpg',
  '["temp/product-ll37.jpg"]'::jsonb,
  'Immune',
  false,
  0,
  '{"purity": "98.9%", "weight": "5mg", "form": "Lyophilized", "sequence": "LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer. Store reconstituted solution at 2-8°C and use within 14 days. Lyophilized form stable at -20°C. LL-37 is sensitive to repeated freeze-thaw cycles — aliquot as needed.',
  'Ships within 24 hours via insulated cold-chain packaging. Free priority domestic shipping (2-3 business days). International tracked express available (5-7 business days). Certificate of analysis, MSDS, and tamper-evident sealing included.'
);

-- Verify the insert
SELECT id, name, slug, price, category, in_stock FROM public.products ORDER BY created_at;

-- IMPORTANT: After products are created, update image paths with actual product UUIDs
-- Run the UPDATE statements from update_product_images.sql (replace UUIDs with actual product IDs):

/*
-- Example UPDATE statements (replace UUIDs with actual product IDs from above query):
UPDATE public.products 
SET image = id || '/product-bpc157.jpg',
    images = jsonb_build_array(id || '/product-bpc157.jpg')
WHERE slug = 'bpc-157';

-- Repeat for all products...
*/

-- Then upload images to Supabase Storage in format: products/{product-uuid}/{filename}

-- Note: 
-- - Product IDs are auto-generated as UUIDs
-- - Slugs are auto-generated from product names (lowercase, hyphens, unique)
-- - Image paths should be in format: {product-uuid}/{filename}
-- - Upload images to: products/{product-uuid}/{filename} in Supabase Storage
-- - The application will convert these paths to full Supabase Storage URLs
