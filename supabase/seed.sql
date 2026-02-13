-- Quick Seed Script for Supabase
-- This script seeds the products table with sample data
-- Run this in the Supabase SQL Editor after running migrations
-- Note: id is auto-generated as UUID, slug is auto-generated from name

-- Clear existing products (optional - remove if you want to keep existing data)
-- DELETE FROM public.products;

-- Insert products
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
  'BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide derived from a protective protein found in human gastric juice. Comprising 15 amino acids, this peptide has been the subject of extensive in-vitro and in-vivo research for its potential role in tissue repair, angiogenesis, and cytoprotection.',
  '/images/product-bpc157.jpg',
  '["/images/product-bpc157.jpg"]'::jsonb,
  'Repair',
  true,
  100,
  '{"purity": "99.1%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water at the desired concentration.',
  'Ships within 24 hours via insulated cold-chain packaging.'
),
(
  'TB-500',
  54.99,
  'A synthetic fraction of thymosin beta-4. Investigated for its role in cell migration and wound healing research.',
  'TB-500 is a synthetic analog of the naturally occurring peptide thymosin beta-4, a 43-amino acid protein first isolated from the thymus gland.',
  '/images/product-tb500.jpg',
  '["/images/product-tb500.jpg"]'::jsonb,
  'Recovery',
  true,
  100,
  '{"purity": "98.7%", "weight": "5mg", "form": "Lyophilized", "sequence": "Ac-SDKP (active fragment)"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water.',
  'Ships within 24 hours via temperature-controlled packaging.'
),
(
  'GHK-Cu',
  39.99,
  'A naturally occurring copper peptide complex. Researched for its potential in skin biology and tissue remodeling studies.',
  'GHK-Cu (Glycyl-L-Histidyl-L-Lysine Copper) is a naturally occurring tripeptide-copper complex found in human plasma, saliva, and urine.',
  '/images/product-ghkcu.jpg',
  '["/images/product-ghkcu.jpg"]'::jsonb,
  'Skin',
  true,
  100,
  '{"purity": "99.3%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-His-Lys:Cu(II)"}'::jsonb,
  'For research use only. Reconstitute with sterile water or bacteriostatic water.',
  'Ships within 24 hours in insulated packaging.'
),
(
  'Ipamorelin',
  44.99,
  'A selective growth hormone secretagogue. Studied for its targeted receptor activation with minimal off-target effects.',
  'Ipamorelin is a pentapeptide growth hormone secretagogue and ghrelin receptor agonist.',
  '/images/product-ipamorelin.jpg',
  '["/images/product-ipamorelin.jpg"]'::jsonb,
  'Growth',
  true,
  100,
  '{"purity": "99.0%", "weight": "5mg", "form": "Lyophilized", "sequence": "Aib-His-D-2-Nal-D-Phe-Lys-NH2"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water.',
  'Ships within 24 hours via cold-chain logistics.'
),
(
  'CJC-1295',
  59.99,
  'A modified growth hormone releasing hormone analog. Researched for sustained GH elevation in endocrine studies.',
  'CJC-1295 is a synthetic analog of growth hormone-releasing hormone (GHRH) consisting of 30 amino acids.',
  '/images/product-cjc1295.jpg',
  '["/images/product-cjc1295.jpg"]'::jsonb,
  'Growth',
  true,
  100,
  '{"purity": "98.5%", "weight": "5mg", "form": "Lyophilized", "sequence": "Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-DAC"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water.',
  'Ships within 24 hours with temperature-controlled packaging.'
),
(
  'LL-37',
  64.99,
  'A human cathelicidin antimicrobial peptide. Investigated for its role in innate immune defense and inflammation pathways.',
  'LL-37 is the only human cathelicidin-derived antimicrobial peptide, a 37-amino acid sequence cleaved from the C-terminal end of hCAP18.',
  '/images/product-ll37.jpg',
  '["/images/product-ll37.jpg"]'::jsonb,
  'Immune',
  false,
  0,
  '{"purity": "98.9%", "weight": "5mg", "form": "Lyophilized", "sequence": "LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer.',
  'Ships within 24 hours via insulated cold-chain packaging.'
)
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT id, name, slug, price, category, in_stock FROM public.products ORDER BY created_at;

-- Note: 
-- - Product IDs are auto-generated as UUIDs
-- - Slugs are auto-generated from product names (lowercase, hyphens, unique)
