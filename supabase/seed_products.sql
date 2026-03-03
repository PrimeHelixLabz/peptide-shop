-- Seed Products for Supabase
-- This is the recommended seed script that works with UUID primary keys
-- Run this in Supabase SQL Editor after migrations
-- Note: slug will be auto-generated from product name by trigger

-- Insert all 6 products
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
  '/images/product-bpc157.jpg',
  '["/images/product-bpc157.jpg"]'::jsonb,
  'Repair',
  true,
  100,
  '{"purity": "99.1%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water at the desired concentration. Store reconstituted solution at 2-8°C and use within 30 days. Lyophilized powder may be stored at -20°C for long-term preservation. Always handle under sterile conditions following laboratory safety protocols.',
  'Ships within 24 hours of order placement in protective packaging. All domestic orders include free priority shipping (2-3 business days). International orders are available with tracked express delivery (5-7 business days). Each shipment includes a certificate of analysis and is sealed for tamper evidence.'
),
(
  'TB-500',
  54.99,
  'A synthetic fraction of thymosin beta-4. Investigated for its role in cell migration and wound healing research.',
  'TB-500 is a synthetic analog of the naturally occurring peptide thymosin beta-4, a 43-amino acid protein first isolated from the thymus gland. Research has focused on its role in upregulating cell-building proteins such as actin, promoting cell migration and differentiation, and supporting tissue repair pathways. Published studies have examined its potential in cardiac, dermal, and corneal repair models. Each vial contains 5mg of lyophilized peptide verified to 98.7% purity by HPLC.',
  '/images/product-tb500.jpg',
  '["/images/product-tb500.jpg"]'::jsonb,
  'Recovery',
  true,
  100,
  '{"purity": "98.7%", "weight": "5mg", "form": "Lyophilized", "sequence": "Ac-SDKP (active fragment)"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water. Recommended storage at 2-8°C once reconstituted, with use within 21 days. Lyophilized form should be kept at -20°C. Handle with sterile technique and appropriate PPE in a controlled laboratory setting.',
  'Ships within 24 hours in protective packaging. Free priority domestic shipping (2-3 business days). International tracked express available (5-7 business days). Includes certificate of analysis and tamper-evident sealing.'
),
(
  'GHK-Cu',
  39.99,
  'A naturally occurring copper peptide complex. Researched for its potential in skin biology and tissue remodeling studies.',
  'GHK-Cu (Glycyl-L-Histidyl-L-Lysine Copper) is a naturally occurring tripeptide-copper complex found in human plasma, saliva, and urine. It has been extensively researched for its ability to promote collagen synthesis, attract immune cells, and support antioxidant and anti-inflammatory activity. Studies suggest GHK-Cu may play a role in gene expression related to tissue remodeling and wound repair. Each vial contains 5mg of lyophilized peptide at 99.3% verified purity.',
  '/images/product-ghkcu.jpg',
  '["/images/product-ghkcu.jpg"]'::jsonb,
  'Skin',
  true,
  100,
  '{"purity": "99.3%", "weight": "5mg", "form": "Lyophilized", "sequence": "Gly-His-Lys:Cu(II)"}'::jsonb,
  'For research use only. Reconstitute with sterile water or bacteriostatic water. Store reconstituted solution at 2-8°C and use within 14 days. Lyophilized form stable at -20°C for up to 24 months. Follow standard aseptic laboratory protocols during handling.',
  'Ships within 24 hours in insulated packaging. Free domestic priority shipping (2-3 business days). International express delivery available (5-7 business days). Certificate of analysis included with every order.'
),
(
  'Ipamorelin',
  44.99,
  'A selective growth hormone secretagogue. Studied for its targeted receptor activation with minimal off-target effects.',
  'Ipamorelin is a pentapeptide growth hormone secretagogue and ghrelin receptor agonist. Unlike other GH secretagogues, research indicates that Ipamorelin selectively stimulates growth hormone release without significantly affecting cortisol, prolactin, or ACTH levels. This selectivity has made it a compound of interest in endocrine and metabolic research. Each vial contains 5mg of lyophilized peptide, verified to 99.0% purity via HPLC analysis.',
  '/images/product-ipamorelin.jpg',
  '["/images/product-ipamorelin.jpg"]'::jsonb,
  'Growth',
  true,
  100,
  '{"purity": "99.0%", "weight": "5mg", "form": "Lyophilized", "sequence": "Aib-His-D-2-Nal-D-Phe-Lys-NH2"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water. Store reconstituted solution at 2-8°C with recommended use within 28 days. Lyophilized form stable at -20°C. Maintain sterile handling conditions per laboratory protocols.',
  'Ships within 24 hours via tracked logistics. Free priority domestic shipping (2-3 business days). International tracked express available (5-7 business days). Full certificate of analysis and tamper-evident packaging included.'
),
(
  'CJC-1295',
  59.99,
  'A modified growth hormone releasing hormone analog. Researched for sustained GH elevation in endocrine studies.',
  'CJC-1295 is a synthetic analog of growth hormone-releasing hormone (GHRH) consisting of 30 amino acids. It features a Drug Affinity Complex (DAC) modification that extends its half-life by binding to endogenous albumin. Research has demonstrated its ability to produce sustained, dose-dependent increases in growth hormone and IGF-1 levels. This makes it valuable for studies examining pulsatile GH secretion and prolonged receptor activation. Each vial contains 5mg at 98.5% HPLC-verified purity.',
  '/images/product-cjc1295.jpg',
  '["/images/product-cjc1295.jpg"]'::jsonb,
  'Growth',
  true,
  100,
  '{"purity": "98.5%", "weight": "5mg", "form": "Lyophilized", "sequence": "Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg-DAC"}'::jsonb,
  'For research use only. Reconstitute with bacteriostatic water at desired concentration. Store reconstituted product at 2-8°C and use within 21 days. Lyophilized powder stable at -20°C for long-term storage. Use strict aseptic technique.',
  'Ships within 24 hours in protective packaging. Free domestic priority shipping (2-3 business days). International express delivery available (5-7 business days). Certificate of analysis and COA documentation included.'
),
(
  'LL-37',
  64.99,
  'A human cathelicidin antimicrobial peptide. Investigated for its role in innate immune defense and inflammation pathways.',
  'LL-37 is the only human cathelicidin-derived antimicrobial peptide, a 37-amino acid sequence cleaved from the C-terminal end of hCAP18 by proteinase 3. Research has shown that LL-37 exhibits broad-spectrum antimicrobial activity and plays a key role in innate immune defense, wound healing, and inflammation modulation. Studies have investigated its interactions with bacterial membranes, its chemotactic properties, and its role in adaptive immunity signaling. Each vial contains 5mg at 98.9% verified purity.',
  '/images/product-ll37.jpg',
  '["/images/product-ll37.jpg"]'::jsonb,
  'Immune',
  false,
  0,
  '{"purity": "98.9%", "weight": "5mg", "form": "Lyophilized", "sequence": "LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES"}'::jsonb,
  'For research use only. Reconstitute with sterile water or appropriate buffer. Store reconstituted solution at 2-8°C and use within 14 days. Lyophilized form stable at -20°C. LL-37 is sensitive to repeated freeze-thaw cycles — aliquot as needed.',
  'Ships within 24 hours in insulated protective packaging. Free priority domestic shipping (2-3 business days). International tracked express available (5-7 business days). Certificate of analysis, MSDS, and tamper-evident sealing included.'
);

-- Verify the insert
SELECT id, name, price, category, in_stock FROM public.products ORDER BY created_at;
