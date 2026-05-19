-- ============================================================
-- Migration: second batch of seeded blog posts (15 articles)
-- ============================================================
-- Adds 15 SEO-targeted research articles tied to real products in
-- the live catalog. Each post links to at least one product page on
-- /shop/<slug> and to existing posts in 036_seed_blog_posts.sql so
-- the internal link graph compounds. published_at is staggered over
-- the previous two weeks so the index doesn't suddenly show 15
-- posts dated the same day (looks spammy, hurts SEO).
--
-- All articles maintain the "research use only / not for human
-- consumption" framing per project policy. ON CONFLICT keeps the
-- migration idempotent against admin edits.

INSERT INTO public.blog_posts (
  slug, title, description, body_html, author_name, status, tags,
  read_minutes, published_at
) VALUES
(
  'ipamorelin-vs-cjc-1295',
  'Ipamorelin vs CJC-1295: Comparing Two Growth Hormone Secretagogues in Research',
  'A side-by-side research overview of Ipamorelin and CJC-1295 (NO DAC). Covers mechanism, receptor selectivity, half-life, and why preclinical studies frequently pair the two.',
  $body$<blockquote>For in-vitro and laboratory research only. PrimeHelix Labz does not provide medical, clinical, or dosing guidance for any compound discussed below.</blockquote>
<p>Ipamorelin and CJC-1295 are two of the most-studied research peptides in the growth-hormone secretagogue category. They are often discussed together because they act on different receptors, with mechanisms reported to be complementary in published rodent studies. This article walks through how they differ and why preclinical protocols frequently evaluate them in parallel.</p>
<h2>What each molecule is</h2>
<h3>Ipamorelin</h3>
<p>Ipamorelin is a synthetic pentapeptide (Aib-His-D-2-Nal-D-Phe-Lys-NH2) and a selective agonist of the growth hormone secretagogue receptor (GHSR-1a), the ghrelin receptor. Published animal studies report that Ipamorelin stimulates pulsatile GH release without significant elevation of cortisol, prolactin, or ACTH — a selectivity that has made it a recurring research tool for isolating GH-axis effects. Available as <a href="/shop/ipamorelin">Ipamorelin 5mg</a> and <a href="/shop/ipamorelin-10mg">Ipamorelin 10mg</a> lyophilized.</p>
<h3>CJC-1295 (NO DAC)</h3>
<p>CJC-1295 without the Drug Affinity Complex modification is a 30&ndash;amino-acid synthetic analog of growth hormone-releasing hormone (GHRH). Unlike its DAC-modified counterpart, CJC-1295 NO DAC has a short half-life — typically reported at ~30 minutes in published pharmacokinetic work. It acts on the GHRH receptor in the anterior pituitary. Available as <a href="/shop/cjc-1295">CJC-1295 5mg</a> and <a href="/shop/cjc-1295-10mg">CJC-1295 10mg</a>.</p>
<h2>Why they appear together in protocols</h2>
<p>The two molecules target different upstream receptors that converge on somatotroph GH release:</p>
<ul>
  <li><strong>CJC-1295</strong> activates the GHRH receptor.</li>
  <li><strong>Ipamorelin</strong> activates the ghrelin / GHSR-1a receptor.</li>
</ul>
<p>Published preclinical literature reports synergistic GH release when both pathways are stimulated simultaneously, larger than the sum of either alone. This is why research-supply catalogs commonly offer the pre-combined <a href="/shop/cjc-no-dac-ipa">CJC(NO DAC)/IPA 5mg/5mg</a> stack for parallel-pathway studies.</p>
<h2>Side-by-side</h2>
<table>
  <thead><tr><th>Attribute</th><th>Ipamorelin</th><th>CJC-1295 (NO DAC)</th></tr></thead>
  <tbody>
    <tr><td>Receptor</td><td>GHSR-1a (ghrelin)</td><td>GHRH receptor</td></tr>
    <tr><td>Length</td><td>5 amino acids</td><td>30 amino acids</td></tr>
    <tr><td>Half-life (reported)</td><td>~2 hours</td><td>~30 minutes</td></tr>
    <tr><td>Off-target hormone effects</td><td>Minimal (selective)</td><td>Minimal at normal research doses</td></tr>
    <tr><td>Common research use</td><td>GH-axis isolation studies</td><td>GHRH-axis isolation; pulse-amplitude studies</td></tr>
  </tbody>
</table>
<h2>Handling and storage</h2>
<p>Both peptides ship as lyophilized white powder and follow standard peptide storage protocols. See our <a href="/blog/peptide-storage-guide">peptide storage guide</a> for shelf life by storage condition. Both are typically reconstituted in bacteriostatic water for research workflows.</p>
<h2>What to confirm on the COA</h2>
<ul>
  <li><strong>Sequence</strong> &mdash; for Ipamorelin, the Aib-His-D-2-Nal-D-Phe-Lys-NH2 sequence; for CJC-1295, confirm the absence of the DAC modification if NO-DAC is required.</li>
  <li><strong>Purity</strong> &mdash; &ge;98% HPLC is standard.</li>
  <li><strong>Mass spec match</strong> for the expected molecular weight.</li>
</ul>
<p>For a deeper walkthrough see <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<h2>Further reading</h2>
<p>For broader context on growth-hormone secretagogue research, see our overviews of <a href="/blog/sermorelin-vs-tesamorelin-vs-cjc-1295">Sermorelin vs Tesamorelin vs CJC-1295</a> and the <a href="/blog/bpc-157-research-guide">BPC-157 research guide</a>.</p>
<blockquote><strong>Reminder:</strong> All content is summarized from preclinical literature for laboratory use only. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Ipamorelin', 'CJC-1295', 'growth hormone', 'secretagogue', 'comparison'],
  7,
  '2026-05-06T14:00:00Z'
),
(
  'glp-1-research-peptides-overview',
  'GLP-1 Research Peptides: Single, Dual, and Triple Agonists Compared',
  'A research overview of the GLP-1 receptor agonist class — from single-receptor analogs to dual GIP/GLP-1 and triple-agonist compounds — and how each is studied in metabolic-pathway research.',
  $body$<blockquote>For in-vitro and laboratory research only. None of the compounds described below are FDA-approved for the contexts discussed; published research is preclinical or limited-stage clinical literature summarized for educational purposes.</blockquote>
<p>Incretin-receptor research has become one of the most active areas in metabolic peptide science. The compounds fall into three structural generations &mdash; single agonist, dual agonist, and triple agonist &mdash; each engaging an expanding set of receptors. This article maps the landscape and points to which research-supply formats correspond to each.</p>
<h2>The receptor families involved</h2>
<ul>
  <li><strong>GLP-1R</strong> &mdash; glucagon-like peptide-1 receptor; involved in insulin secretion, satiety signaling, and gastric emptying.</li>
  <li><strong>GIPR</strong> &mdash; glucose-dependent insulinotropic polypeptide receptor; involved in postprandial insulin response and adipocyte metabolism.</li>
  <li><strong>GCGR</strong> &mdash; glucagon receptor; involved in hepatic glucose output and energy expenditure.</li>
</ul>
<h2>Single GLP-1 agonists</h2>
<p>The first generation of incretin research peptides targets only GLP-1R. <a href="/shop/ph-sm1">PH-SM1 10mg</a> is a research-grade GLP-1 receptor agonist commonly used in incretin-pathway studies. Published preclinical work focuses on insulin-secretion kinetics, glucose tolerance models, and central-satiety signaling.</p>
<h2>Dual GIP/GLP-1 agonists</h2>
<p>Dual agonists engage GIPR and GLP-1R simultaneously. <a href="/shop/ph-tz2">PH-TZ2 10mg</a> belongs to this class. Preclinical literature has reported additive effects on insulin response and on adipose-tissue glucose handling relative to GLP-1-only agonists, with the GIPR arm contributing the larger share of the body-composition signal in rodent studies.</p>
<h2>Triple agonists (GLP-1 / GIP / GCG)</h2>
<p>Triple agonists add glucagon-receptor engagement. <a href="/shop/ph-rt3-5mg">PH-RT3 5mg</a>, <a href="/shop/ph-rt3">10mg</a>, <a href="/shop/ph-rt3-1">20mg</a>, and higher-dose variants up to <a href="/shop/ph-rt3-3">60mg</a> are research-supply formats for this class. Adding GCGR engagement contributes to energy-expenditure effects observed in rodent metabolic models, on top of the incretin-driven insulin and satiety signals.</p>
<h2>The amylin angle</h2>
<p><a href="/shop/cagrillintide">Cagrilintide 5mg</a> is not a GLP-1 family member but is frequently studied alongside it. It is a long-acting amylin-receptor agonist; published preclinical and early clinical literature has explored amylin/GLP-1 co-administration for compounded satiety signaling.</p>
<h2>Research handling notes</h2>
<p>All of these peptides ship lyophilized and follow standard peptide storage practice &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. Triple agonists with larger sequences and bulkier modifications can be more sensitive to freeze-thaw cycles; aliquot reconstituted material before freezing.</p>
<h2>What to verify on the COA</h2>
<p>Because the GLP-1 class includes molecules with very similar names (and very different sequences), COA sequence verification is non-negotiable. See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a> for the fields that matter.</p>
<blockquote><strong>Reminder:</strong> The information above is a literature summary for in-vitro and laboratory research. Products are not intended for human use.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['GLP-1', 'GIP', 'incretin', 'triple agonist', 'metabolic research'],
  8,
  '2026-05-07T15:30:00Z'
),
(
  'sermorelin-vs-tesamorelin-vs-cjc-1295',
  'Sermorelin vs Tesamorelin vs CJC-1295: A GHRH Analog Comparison',
  'How three commonly studied GHRH analogs differ in sequence, half-life, and preclinical research context — and what to look for on each one''s COA.',
  $body$<blockquote>For in-vitro and laboratory research only. The compounds below are discussed in the context of published preclinical literature; nothing here is medical guidance.</blockquote>
<p>Sermorelin, Tesamorelin, and CJC-1295 are all synthetic analogs of growth hormone-releasing hormone (GHRH). They share the receptor target (GHRH receptor in the anterior pituitary) but differ in sequence length, stability, and the pharmacokinetic profile reported in preclinical studies. This article walks through the differences.</p>
<h2>The parent molecule</h2>
<p>Native GHRH is a 44&ndash;amino-acid peptide produced in the hypothalamus. Its bioactive core is the first 29 residues. Every GHRH analog discussed below is built on or around that GHRH(1-29) fragment.</p>
<h2>Sermorelin</h2>
<p>Sermorelin is GHRH(1-29) &mdash; the bioactive core, unmodified. Half-life in published rodent studies is short, typically reported under 15 minutes. It is the most "native-like" of the three. Available as <a href="/shop/sermorelin-5mg">Sermorelin 5mg</a> and <a href="/shop/sermorelin-10mg">Sermorelin 10mg</a>.</p>
<h2>Tesamorelin</h2>
<p>Tesamorelin is GHRH(1-44) with an N-terminal trans-3-hexenoic acid modification. The modification protects against dipeptidyl peptidase-4 (DPP-4) cleavage, extending the reported half-life relative to Sermorelin. Preclinical and clinical literature in lipodystrophy models is the most-cited Tesamorelin body of work. Available as <a href="/shop/tesamorelin">Tesamorelin 5mg</a> and <a href="/shop/tesamorelin-3">10mg</a>.</p>
<h2>CJC-1295 (NO DAC)</h2>
<p>CJC-1295 NO DAC is a 30&ndash;amino-acid analog with four amino-acid substitutions (D-Ala, Gln, Ala, Leu) that stabilize the molecule against DPP-4 cleavage. The half-life is intermediate. Available as <a href="/shop/cjc-1295">CJC-1295 5mg</a> and <a href="/shop/cjc-1295-10mg">10mg</a>. (The DAC-modified form, not in our catalog, adds a maleimide group that covalently binds endogenous albumin, extending half-life dramatically.)</p>
<h2>Comparison table</h2>
<table>
  <thead><tr><th>Attribute</th><th>Sermorelin</th><th>Tesamorelin</th><th>CJC-1295 (NO DAC)</th></tr></thead>
  <tbody>
    <tr><td>Sequence basis</td><td>GHRH(1-29)</td><td>GHRH(1-44) + hexenoyl</td><td>GHRH(1-30) + 4 substitutions</td></tr>
    <tr><td>Half-life (reported)</td><td>~10&ndash;15 min</td><td>~25&ndash;40 min</td><td>~30 min</td></tr>
    <tr><td>DPP-4 resistance</td><td>None</td><td>Hexenoyl modification</td><td>Amino-acid substitutions</td></tr>
    <tr><td>Most-cited literature</td><td>Pediatric GH-axis studies</td><td>Lipodystrophy / visceral fat</td><td>Pulse-amplitude research</td></tr>
  </tbody>
</table>
<h2>Pairing with ghrelin-receptor agonists</h2>
<p>All three are commonly studied in parallel with ghrelin-receptor agonists like Ipamorelin to evaluate dual-pathway GH release. See <a href="/blog/ipamorelin-vs-cjc-1295">Ipamorelin vs CJC-1295</a> for that pairing in detail.</p>
<h2>What to confirm on the COA</h2>
<p>For Sermorelin and Tesamorelin, verify the modification (or lack thereof) is explicitly stated. For CJC-1295, confirm "NO DAC" if that's what you ordered &mdash; the DAC and NO-DAC forms have very different stability profiles and are easy to confuse. See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a> for the rest of the checklist.</p>
<blockquote><strong>Reminder:</strong> All content above is for laboratory research only. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Sermorelin', 'Tesamorelin', 'CJC-1295', 'GHRH', 'comparison'],
  7,
  '2026-05-08T16:00:00Z'
),
(
  'epithalon-research-overview',
  'Epithalon Research Overview: Pineal Tetrapeptide, Telomerase Studies, and Lab Handling',
  'An overview of Epithalon, the synthetic tetrapeptide Ala-Glu-Asp-Gly studied in cellular aging, telomerase, and pineal-axis research. Covers mechanisms, model systems, and lab storage.',
  $body$<blockquote>For in-vitro and laboratory research only. The literature summarized below is preclinical and limited; no claims of effect in humans are made or implied.</blockquote>
<p>Epithalon (also spelled Epitalon) is a synthetic tetrapeptide with the sequence Ala-Glu-Asp-Gly. It was developed in the Saint Petersburg Institute of Bioregulation and Gerontology as a synthetic analog of epithalamin, a pineal-gland peptide fraction. The peptide has been studied for decades primarily by Russian research groups, with a smaller body of independent replication. Available as <a href="/shop/epithalon">Epithalon 10mg</a> lyophilized.</p>
<h2>Structure</h2>
<p>Epithalon&rsquo;s sequence is Ala-Glu-Asp-Gly (AEDG). Molecular weight is approximately 390 Da, making it among the smallest research peptides commonly sold.</p>
<h2>Mechanisms reported in published literature</h2>
<ul>
  <li><strong>Telomerase modulation.</strong> Published cell-culture work reports upregulation of telomerase activity in somatic cell lines treated with Epithalon, with extended replicative lifespan of fibroblasts in some protocols.</li>
  <li><strong>Pineal-axis interaction.</strong> Rodent studies have reported normalization of melatonin secretion patterns in aged animals, the most-cited mechanistic claim.</li>
  <li><strong>Gene expression.</strong> Cell-culture papers describe changes in expression of genes involved in cellular senescence and DNA repair.</li>
</ul>
<blockquote><strong>Research note:</strong> Much of the Epithalon literature is from a single research group. Independent replication is limited. Researchers should weight published claims accordingly.</blockquote>
<h2>Common research-model applications</h2>
<ul>
  <li>Cellular senescence and replicative-lifespan models in fibroblasts</li>
  <li>Telomerase-activity assays in immortalized and primary cell lines</li>
  <li>Rodent aging-cohort studies measuring melatonin secretion patterns</li>
</ul>
<h2>Handling and storage</h2>
<p>Epithalon is supplied lyophilized. Standard peptide storage practice applies &mdash; sealed at &minus;20&deg;C protected from light and moisture &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. The tetrapeptide structure is relatively stable, with reported lyophilized shelf life of 24+ months under proper conditions.</p>
<p>For research workflows, reconstitution in bacteriostatic water is standard. The small molecular weight means concentration math is straightforward.</p>
<h2>Related peptides</h2>
<p>Epithalon is sometimes discussed alongside other short bioregulator peptides developed by the same research school, including <a href="/shop/pinealon">Pinealon</a> (a three-residue pineal-derived peptide). The two are structurally distinct and the published literature for one does not transfer cleanly to the other.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> Ala-Glu-Asp-Gly. Confirm the order &mdash; the related peptide Vilon (Lys-Glu) and the longer "PRE-7" peptides have similar branding but different chemistry.</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match</strong> for ~390 Da.</li>
</ul>
<p>For COA-reading guidance, see <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All material above is for in-vitro and laboratory research. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Epithalon', 'telomerase', 'pineal', 'aging research'],
  6,
  '2026-05-09T13:00:00Z'
),
(
  'mots-c-research-overview',
  'MOTS-c Research Overview: Mitochondrial-Derived Peptide and Metabolic Pathways',
  'An overview of MOTS-c, the 16-amino-acid mitochondrial-derived peptide encoded within the 12S rRNA region of mtDNA. Covers mechanisms studied in AMPK and insulin-sensitivity research.',
  $body$<blockquote>For in-vitro and laboratory research only. Information below summarizes published preclinical literature for educational and laboratory-supply context.</blockquote>
<p>MOTS-c (Mitochondrial Open Reading frame of the Twelve S rRNA-c) is a 16-amino-acid peptide encoded within the mitochondrial 12S rRNA region of mitochondrial DNA &mdash; one of the first identified members of a class of mitochondrial-derived peptides (MDPs). Published research has focused on its role as a regulator of cellular metabolism. Available as <a href="/shop/mots-c">MOTS-c 10mg</a> lyophilized.</p>
<h2>Structure and origin</h2>
<p>MOTS-c is encoded by a small open reading frame inside mtDNA, not the nuclear genome &mdash; an unusual feature that makes it a member of the still-emerging mitochondrial-peptide field. The 16&ndash;amino-acid sequence is conserved across mammals, suggesting functional importance. Molecular weight is approximately 2174 Da.</p>
<h2>Mechanisms studied in published literature</h2>
<ul>
  <li><strong>AMPK pathway activation.</strong> The most-cited mechanism in MOTS-c literature is activation of AMP-activated protein kinase (AMPK), the central cellular energy sensor, with downstream effects on glucose uptake and fatty-acid oxidation.</li>
  <li><strong>Insulin sensitivity.</strong> Rodent metabolic-syndrome models have reported improvements in insulin sensitivity after MOTS-c administration.</li>
  <li><strong>Folate cycle interaction.</strong> Published mechanistic work describes interaction with the methionine-folate cycle, contributing to the metabolic-regulator framing of the peptide.</li>
  <li><strong>Exercise physiology.</strong> A subset of the literature reports MOTS-c as an "exercise-mimetic" in animal models, with effects overlapping endurance-training adaptations.</li>
</ul>
<h2>Common research-model applications</h2>
<ul>
  <li>High-fat-diet rodent metabolic-syndrome models</li>
  <li>Skeletal-muscle glucose-uptake assays in C2C12 cell culture</li>
  <li>Mitochondrial-respiration assays (Seahorse, Oroboros) in primary cells</li>
</ul>
<h2>Handling and storage</h2>
<p>MOTS-c ships lyophilized. Standard peptide storage applies &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. The 16-residue sequence is moderately stable; aliquot reconstituted material before freezing to minimize freeze-thaw degradation.</p>
<h2>Related research peptides</h2>
<p>MOTS-c is often grouped with other metabolic-regulator research peptides in the literature, including <a href="/shop/5-amino-1mq">5-Amino-1MQ</a> (an NNMT inhibitor) and <a href="/shop/nad">NAD+</a> (the coenzyme central to mitochondrial redox). See <a href="/blog/5-amino-1mq-research-guide">our 5-Amino-1MQ research guide</a> for the NNMT/NAD+ side of this story.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> 16 amino acids matching the published MOTS-c sequence (M-R-W-Q-E-M-G-Y-I-F-Y-P-R-K-L-R).</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match</strong> for ~2174 Da.</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a> for full field-level guidance.</p>
<blockquote><strong>Reminder:</strong> The information above is summarized from preclinical research literature for laboratory and educational purposes. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['MOTS-c', 'mitochondrial', 'AMPK', 'metabolic research'],
  6,
  '2026-05-10T14:00:00Z'
),
(
  '5-amino-1mq-research-guide',
  '5-Amino-1MQ Research Guide: NNMT Inhibition and the NAD+ Connection',
  'A research overview of 5-Amino-1MQ, a small-molecule NNMT inhibitor studied for its effects on cellular methylation balance, NAD+ pools, and adipocyte metabolism.',
  $body$<blockquote>For in-vitro and laboratory research only. 5-Amino-1MQ is a research-grade small molecule, not an approved therapeutic. No medical use is implied.</blockquote>
<p>5-Amino-1MQ (5-Amino-1-methylquinolinium) is a small-molecule inhibitor of nicotinamide N-methyltransferase (NNMT), the enzyme that methylates nicotinamide to produce 1-methylnicotinamide (MNAM). The research interest is downstream: NNMT activity depletes the methyl-donor pool (SAM) and the NAD+ precursor pool simultaneously, so inhibiting it changes the cellular methylation and NAD+ landscape in ways that have been explored in metabolic-research literature. Available as <a href="/shop/5-amino-1mq">5-Amino-1MQ 50mg</a>.</p>
<h2>Mechanism in one paragraph</h2>
<p>NNMT consumes S-adenosylmethionine (SAM, the universal methyl donor) and nicotinamide (an NAD+ precursor) to generate MNAM. In tissues that highly express NNMT &mdash; notably adipose tissue and certain tumor cell lines &mdash; this activity is reported in published literature to deplete intracellular SAM and reduce nicotinamide salvage into NAD+. Inhibiting NNMT with 5-Amino-1MQ reverses these flows in cell-culture models.</p>
<h2>Mechanisms studied in published literature</h2>
<ul>
  <li><strong>Adipocyte energy metabolism.</strong> The most-cited mechanistic literature on 5-Amino-1MQ reports increased intracellular SAM and NAD+ in cultured adipocytes, with effects on lipolysis markers in cell-culture work.</li>
  <li><strong>Tumor cell biology.</strong> NNMT is overexpressed in several cancer types; cell-culture studies have explored NNMT inhibition in those contexts.</li>
  <li><strong>Methylation landscape.</strong> Studies measuring SAM/SAH ratios after NNMT inhibition report changes consistent with a restored methylation-donor pool.</li>
</ul>
<h2>Why it's discussed alongside NAD+</h2>
<p>Published reviews frame NNMT inhibition and direct NAD+ supplementation as two strategies aimed at the same downstream readout &mdash; cellular NAD+ availability. Direct supplementation uses <a href="/shop/nad">NAD+ 500mg</a>, <a href="/shop/nad-1000mg">NAD+ 1000mg</a>, or related precursors. NNMT inhibition with 5-Amino-1MQ instead reduces the catabolism of nicotinamide upstream of the salvage pathway. The two approaches are sometimes studied in parallel in cell-culture protocols.</p>
<h2>Related metabolic-research compounds</h2>
<p>For other peptides explored in the same metabolic-research category, see our overviews of <a href="/blog/mots-c-research-overview">MOTS-c</a> and <a href="/blog/glp-1-research-peptides-overview">GLP-1 research peptides</a>.</p>
<h2>Handling notes</h2>
<p>5-Amino-1MQ is a small molecule rather than a peptide and is supplied as a stable lyophilized or crystalline powder. Standard cold/dark storage applies; for general guidance see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Chemical identity</strong> &mdash; CAS number where available, plus molecular formula.</li>
  <li><strong>Purity</strong> &ge;98% (HPLC or HPLC/UV).</li>
  <li><strong>Mass spec match</strong> for the expected MW.</li>
</ul>
<p>For COA fields see <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All content above is for in-vitro and laboratory research. Products are not intended for human use.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['5-Amino-1MQ', 'NNMT', 'NAD+', 'metabolic research'],
  6,
  '2026-05-11T12:30:00Z'
),
(
  'nad-research-handling-guide',
  'NAD+ in the Lab: Purity, Stability, and Reconstitution for Research Use',
  'A practical research-handling guide for NAD+ as supplied in lyophilized form. Covers purity expectations, hydration sensitivity, reconstitution solvents, and freeze-thaw best practice.',
  $body$<blockquote>For in-vitro and laboratory research only. NAD+ is an endogenous coenzyme; the discussion below covers research-supply handling, not medical or clinical use.</blockquote>
<p>Nicotinamide adenine dinucleotide (NAD+) is the central coenzyme of cellular redox biochemistry. It is supplied for research use in lyophilized form, typically as the free acid or as a disodium salt. This article covers the handling considerations that distinguish NAD+ from a typical research peptide.</p>
<h2>Research-supply formats</h2>
<p>PrimeHelix carries three dose formats: <a href="/shop/nad-1000mg">NAD+ 1000mg</a>, <a href="/shop/nad">NAD+ 500mg</a>, and <a href="/shop/nad-333mg-under-dosed-sale">NAD+ 330mg (under-dosed sale)</a>. The under-dosed format is sold as such on the COA &mdash; useful when stock or budget is the constraint and a non-standard mass is acceptable.</p>
<h2>Stability characteristics</h2>
<p>NAD+ is significantly more moisture-sensitive than the average lyophilized peptide:</p>
<ul>
  <li>Hygroscopic in the lyophilized form &mdash; the vial absorbs water from ambient humidity on opening.</li>
  <li>Hydrolytically sensitive in solution, especially at neutral or alkaline pH.</li>
  <li>Heat-sensitive &mdash; reconstituted NAD+ degrades faster at room temperature than most peptides.</li>
</ul>
<h2>Reconstitution</h2>
<p>For most research uses, NAD+ is reconstituted in cold sterile water or sterile saline immediately before the experiment. Bacteriostatic water (0.9% benzyl alcohol) is acceptable for short-term use but is not recommended for long-term reconstituted storage because of the hydrolysis kinetics. For our broader treatment of solvents, see the article on <a href="/blog/how-to-reconstitute-research-peptides">how to reconstitute research peptides</a>.</p>
<h2>Reconstitution rules of thumb</h2>
<ul>
  <li>Cold solvent (2&ndash;8&deg;C), not room temperature.</li>
  <li>Use within 24 hours when stored at 2&ndash;8&deg;C; same-day use for room-temperature storage.</li>
  <li>Aliquot before freezing &mdash; NAD+ tolerates freeze-thaw poorly relative to typical peptides.</li>
  <li>Protect from light during storage.</li>
</ul>
<h2>Long-term storage</h2>
<table>
  <thead><tr><th>State</th><th>Temperature</th><th>Typical Stability</th></tr></thead>
  <tbody>
    <tr><td>Lyophilized, sealed</td><td>&minus;20&deg;C</td><td>12&ndash;24 months</td></tr>
    <tr><td>Lyophilized, sealed</td><td>2&ndash;8&deg;C</td><td>3&ndash;6 months</td></tr>
    <tr><td>Reconstituted in water</td><td>2&ndash;8&deg;C</td><td>24&ndash;72 hours</td></tr>
    <tr><td>Reconstituted in saline</td><td>2&ndash;8&deg;C</td><td>24&ndash;72 hours</td></tr>
    <tr><td>Reconstituted, frozen</td><td>&minus;80&deg;C</td><td>1&ndash;3 months (single freeze)</td></tr>
  </tbody>
</table>
<h2>Purity considerations</h2>
<p>Commercial NAD+ should be supplied at &ge;98% purity by HPLC. The two impurity peaks worth scrutinizing on the chromatogram are NADH (reduced form) and ADP-ribose (hydrolysis product). A COA showing significant ADP-ribose suggests hydrolytic degradation during manufacture or storage.</p>
<h2>Related research compounds</h2>
<p>For research interest in NAD+ pools beyond direct supplementation, see our <a href="/blog/5-amino-1mq-research-guide">5-Amino-1MQ research guide</a>, which covers NNMT inhibition as an alternative upstream lever on NAD+ availability.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li>Identity (free acid vs disodium salt &mdash; affects mass per vial).</li>
  <li>Water content (Karl Fischer) &mdash; high water content is a stability red flag, especially for NAD+.</li>
  <li>HPLC chromatogram showing the NAD+ peak as the dominant species.</li>
</ul>
<p>For broader COA guidance see <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All content above is for laboratory and research use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['NAD+', 'stability', 'reconstitution', 'lab handling'],
  6,
  '2026-05-12T11:00:00Z'
),
(
  'kpv-research-overview',
  'KPV Tripeptide Research Overview: POMC-Derived Peptide in Inflammation Models',
  'An overview of KPV, the C-terminal tripeptide of α-MSH (Lys-Pro-Val) studied for its activity in inflammation, gut-barrier, and skin-research models.',
  $body$<blockquote>For in-vitro and laboratory research only. KPV is a research-grade tripeptide; nothing below constitutes medical guidance.</blockquote>
<p>KPV is the C-terminal tripeptide of alpha-melanocyte-stimulating hormone (α-MSH), composed of Lysine-Proline-Valine. Despite its small size (molecular weight ~342 Da), published research literature has examined KPV in inflammation-model systems, gut-barrier function studies, and dermal-research contexts. Available as <a href="/shop/kpv">KPV 10mg</a> lyophilized.</p>
<h2>Origin</h2>
<p>α-MSH is a 13&ndash;amino-acid peptide cleaved from pro-opiomelanocortin (POMC). Research in the 1990s identified the C-terminal KPV fragment as carrying much of the anti-inflammatory activity of the parent peptide, with substantially less off-target receptor engagement &mdash; an observation that has driven KPV-specific research since.</p>
<h2>Mechanisms reported in published literature</h2>
<ul>
  <li><strong>NF-κB pathway modulation.</strong> Cell-culture studies report attenuation of NF-κB nuclear translocation in stimulated macrophages.</li>
  <li><strong>Cytokine modulation.</strong> Published work reports reduced production of TNF-α and IL-6 in LPS-stimulated cell models.</li>
  <li><strong>Epithelial-barrier integrity.</strong> A subset of the literature has examined KPV in intestinal-epithelial-barrier models, with reported effects on tight-junction protein expression.</li>
  <li><strong>Independence from MC1R.</strong> Mechanistic work has reported KPV activity in cells lacking the canonical melanocortin-1 receptor, suggesting non-MC1R mediated pathways.</li>
</ul>
<h2>Common research-model applications</h2>
<ul>
  <li>LPS-stimulated macrophage cell-culture assays</li>
  <li>Dextran-sulfate-sodium (DSS) rodent colitis models</li>
  <li>Caco-2 epithelial-barrier-integrity assays</li>
  <li>Dermal inflammation cell-culture work</li>
</ul>
<h2>Handling and storage</h2>
<p>The KPV tripeptide is small and relatively stable. Lyophilized shelf life is generally 24+ months at &minus;20&deg;C. For reconstitution, sterile water is standard for short-term cell-culture use; bacteriostatic water is appropriate for protocols requiring multi-day reconstituted storage. See our <a href="/blog/peptide-storage-guide">peptide storage guide</a> for general practice and the article on <a href="/blog/how-to-reconstitute-research-peptides">how to reconstitute research peptides</a> for solvent selection.</p>
<h2>Frequently confused with</h2>
<ul>
  <li><strong>α-MSH</strong> &mdash; the full 13-amino-acid parent peptide; different mechanism profile.</li>
  <li><strong>Melanotan I / Melanotan II</strong> &mdash; α-MSH analog research peptides studied for melanocortin-receptor activity; see our <a href="/blog/melanotan-1-vs-melanotan-2">Melanotan I vs Melanotan II</a> article.</li>
  <li><strong>KLOW blend</strong> &mdash; <a href="/shop/klow">KLOW 80mg</a> is a research-formulation product that includes KPV alongside GHK-Cu, BPC-157, and TB-500.</li>
</ul>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> Lys-Pro-Val. Three letters &mdash; easy to spot.</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match</strong> for ~342 Da.</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> Information above summarizes preclinical research literature for in-vitro and laboratory work. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['KPV', 'inflammation', 'tripeptide', 'POMC', 'gut barrier'],
  6,
  '2026-05-13T12:00:00Z'
),
(
  'melanotan-1-vs-melanotan-2',
  'Melanotan I vs Melanotan II: A Research Comparison of α-MSH Analogs',
  'Side-by-side overview of Melanotan I (MT-1) and Melanotan II (MT-2) — two synthetic α-MSH analogs studied in pigmentation, melanocortin-receptor, and dermal-biology research.',
  $body$<blockquote>For in-vitro and laboratory research only. The molecules below are research-grade peptides; nothing constitutes guidance for human use, including any cosmetic or tanning context.</blockquote>
<p>Melanotan I and Melanotan II are two synthetic analogs of alpha-melanocyte-stimulating hormone (α-MSH), the 13-amino-acid POMC-derived peptide that activates melanocortin receptors. The two are often grouped together &mdash; and often confused &mdash; in the research-peptide market. They are structurally and pharmacologically distinct. Both are available lyophilized as <a href="/shop/mt-1">MT-1 10mg</a> and <a href="/shop/mt-2">MT-2 10mg</a>.</p>
<h2>What each molecule is</h2>
<h3>Melanotan I (Afamelanotide)</h3>
<p>Melanotan I is a linear 13-amino-acid α-MSH analog with two substitutions (Nle⁴, D-Phe⁷). It is highly selective for the melanocortin-1 receptor (MC1R) &mdash; the receptor primarily expressed on melanocytes. The clinical compound afamelanotide is the same molecule and has been studied in published clinical literature for erythropoietic protoporphyria.</p>
<h3>Melanotan II</h3>
<p>Melanotan II is a cyclic 7-amino-acid α-MSH analog. The cyclization and shorter sequence give it a broader melanocortin-receptor profile &mdash; in particular, significant activity at MC3R and MC4R, the central-nervous-system melanocortin receptors. The MC4R activity is responsible for the appetite- and libido-related effects observed in animal-model literature, and is the structural rationale for the related research compound PT-141.</p>
<h2>Side-by-side comparison</h2>
<table>
  <thead><tr><th>Attribute</th><th>Melanotan I</th><th>Melanotan II</th></tr></thead>
  <tbody>
    <tr><td>Structure</td><td>Linear, 13 amino acids</td><td>Cyclic, 7 amino acids</td></tr>
    <tr><td>Approx. MW</td><td>~1646 Da</td><td>~1024 Da</td></tr>
    <tr><td>Receptor selectivity</td><td>MC1R-selective</td><td>MC1R, MC3R, MC4R (broad)</td></tr>
    <tr><td>Primary research interest</td><td>Pigmentation, photoprotection models</td><td>Pigmentation + appetite/libido pathways</td></tr>
    <tr><td>Clinical analog</td><td>Afamelanotide</td><td>None approved</td></tr>
  </tbody>
</table>
<h2>The PT-141 connection</h2>
<p>PT-141 (bremelanotide) is structurally a metabolite-stabilized analog of Melanotan II focused on MC4R agonism without the MC1R pigmentation activity. See our <a href="/blog/pt-141-research-overview">PT-141 research overview</a> for the bremelanotide story; <a href="/shop/pt-141">PT-141 10mg</a> is available as a research product.</p>
<h2>Handling and storage</h2>
<p>Both peptides ship lyophilized and follow standard storage protocol &mdash; sealed at &minus;20&deg;C protected from light. See our <a href="/blog/peptide-storage-guide">peptide storage guide</a> for shelf life by storage condition. Both are reconstituted in bacteriostatic water for standard research workflows.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence and structure</strong> &mdash; for MT-2 in particular, confirm the cyclic structure and 7-residue length.</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match</strong> for the expected MW (very different between MT-1 and MT-2 &mdash; an obvious sanity check).</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All material above is summarized from preclinical research literature. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Melanotan', 'MT-1', 'MT-2', 'melanocortin', 'comparison'],
  6,
  '2026-05-14T10:00:00Z'
),
(
  'pt-141-research-overview',
  'PT-141 Research Overview: Bremelanotide and the Melanocortin-4 Pathway',
  'An overview of PT-141 (bremelanotide), the MC4R-selective melanocortin agonist studied in central nervous system signaling and sexual-behavior research models.',
  $body$<blockquote>For in-vitro and laboratory research only. PT-141 is a research-grade peptide; nothing below should be interpreted as medical or clinical guidance.</blockquote>
<p>PT-141 (bremelanotide) is a synthetic heptapeptide and selective agonist of the melanocortin-4 receptor (MC4R). It is structurally a metabolite-stabilized analog of Melanotan II, designed to retain the central melanocortin activity while reducing the MC1R-mediated pigmentation activity. Available as <a href="/shop/pt-141">PT-141 10mg</a> lyophilized.</p>
<h2>The melanocortin receptor family in brief</h2>
<ul>
  <li><strong>MC1R</strong> &mdash; melanocytes; pigmentation pathway.</li>
  <li><strong>MC2R</strong> &mdash; adrenal cortex; cortisol synthesis (the ACTH receptor).</li>
  <li><strong>MC3R</strong> &mdash; CNS; energy homeostasis.</li>
  <li><strong>MC4R</strong> &mdash; CNS; appetite, autonomic regulation, sexual-response circuits.</li>
  <li><strong>MC5R</strong> &mdash; exocrine glands; sebum-production research.</li>
</ul>
<p>PT-141 is largely MC4R-driven, with reduced MC1R activity relative to Melanotan II &mdash; the structural rationale for its different research profile.</p>
<h2>Mechanisms reported in published literature</h2>
<ul>
  <li><strong>Central MC4R agonism.</strong> The most-cited mechanism is direct MC4R activation in hypothalamic neuronal populations.</li>
  <li><strong>Pro-erectile behavior in rodent models.</strong> Published preclinical work consistently reports increased mounting behavior in rat models, with the effect blocked by MC4R antagonists.</li>
  <li><strong>Autonomic effects.</strong> Some animal-model literature reports transient blood-pressure and flushing responses, consistent with autonomic engagement.</li>
</ul>
<h2>Common research-model applications</h2>
<ul>
  <li>Rodent sexual-behavior models for melanocortin pathway dissection</li>
  <li>MC4R receptor-binding and functional assays</li>
  <li>Comparative studies against Melanotan II to dissect MC1R vs MC4R contributions</li>
</ul>
<h2>Handling and storage</h2>
<p>PT-141 ships lyophilized and follows standard peptide-handling protocol &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. Reconstitution is typically in bacteriostatic water.</p>
<h2>Frequently confused with</h2>
<ul>
  <li><strong>Melanotan II</strong> &mdash; the structural parent. See our <a href="/blog/melanotan-1-vs-melanotan-2">Melanotan I vs Melanotan II</a> comparison.</li>
  <li><strong>Kisspeptin</strong> &mdash; <a href="/shop/kisspeptin">Kisspeptin 5mg</a> targets the reproductive HPG axis at a different node and is sometimes mistakenly grouped with PT-141 in the libido-research literature.</li>
</ul>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> heptapeptide bremelanotide sequence.</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match.</strong></li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> Content above is from preclinical research literature for laboratory and educational use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['PT-141', 'bremelanotide', 'MC4R', 'melanocortin'],
  6,
  '2026-05-15T11:00:00Z'
),
(
  'selank-vs-semax',
  'Selank vs Semax: Comparing Two Russian Neuropeptide Research Compounds',
  'A research comparison of Selank and Semax — two synthetic heptapeptides developed by Russian research institutes and studied in anxiolytic, cognitive, and neurotrophic research contexts.',
  $body$<blockquote>For in-vitro and laboratory research only. Neither compound is approved for therapeutic use outside specific national contexts; published literature summarized below is preclinical or limited-clinical.</blockquote>
<p>Selank and Semax are two synthetic heptapeptides developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. Both have been studied for decades in Russian research literature, with a smaller body of independent replication outside of that. They are often grouped together but address different biological systems. Available as <a href="/shop/selank">Selank 5mg</a> and <a href="/shop/semax">Semax 5mg</a>.</p>
<h2>What each molecule is</h2>
<h3>Selank</h3>
<p>Selank is a synthetic analog of the immunomodulatory tetrapeptide tuftsin (Thr-Lys-Pro-Arg), extended with a Pro-Gly-Pro stabilizing C-terminus &mdash; total length 7 amino acids. Research literature emphasizes anxiolytic and immunomodulatory mechanisms in rodent models.</p>
<h3>Semax</h3>
<p>Semax is a synthetic analog of ACTH(4-10) (Met-Glu-His-Phe-Pro-Gly-Pro), preserving the central neuropeptide-active region of ACTH but removing the corticotropin-stimulating activity. Research literature emphasizes cognitive, neuroprotective, and BDNF-related mechanisms.</p>
<h2>Side-by-side comparison</h2>
<table>
  <thead><tr><th>Attribute</th><th>Selank</th><th>Semax</th></tr></thead>
  <tbody>
    <tr><td>Parent peptide</td><td>Tuftsin</td><td>ACTH(4-10)</td></tr>
    <tr><td>Length</td><td>7 amino acids</td><td>7 amino acids</td></tr>
    <tr><td>Primary mechanism</td><td>GABA/BDNF modulation, immunomodulation</td><td>BDNF/NGF upregulation, neuroprotection</td></tr>
    <tr><td>Primary research context</td><td>Anxiolytic and stress models</td><td>Cognitive and ischemic models</td></tr>
  </tbody>
</table>
<h2>Mechanisms reported in published literature</h2>
<h3>Selank</h3>
<ul>
  <li>Modulation of GABAergic signaling in rodent anxiety models.</li>
  <li>Changes in expression of cytokines including IL-6 and IFN-γ in cell-culture immunomodulation assays.</li>
  <li>BDNF expression changes in rat hippocampal tissue.</li>
</ul>
<h3>Semax</h3>
<ul>
  <li>Upregulation of BDNF and NGF in rat-brain studies.</li>
  <li>Neuroprotective effects in middle-cerebral-artery-occlusion (MCAO) rodent ischemic models.</li>
  <li>Modulation of dopaminergic and serotonergic systems in behavioral models.</li>
</ul>
<h2>Common research-model applications</h2>
<ul>
  <li>Rodent anxiety paradigms (elevated plus maze, open field) for Selank.</li>
  <li>Rodent cognitive paradigms (Morris water maze, novel object recognition) for Semax.</li>
  <li>Both have been studied in models of stress-induced behavioral changes.</li>
</ul>
<h2>Handling and storage</h2>
<p>Both peptides ship lyophilized. Standard storage applies &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. Both are typically reconstituted in bacteriostatic or sterile water; some research protocols use intranasal-formulation buffers for in-vivo work.</p>
<h2>Related peptides</h2>
<p>For other neuropeptide research compounds in the catalog, see <a href="/shop/dsip">DSIP 5mg</a> (delta sleep-inducing peptide) and <a href="/shop/pinealon">Pinealon 10mg</a>.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li>Full sequence for Selank (Thr-Lys-Pro-Arg-Pro-Gly-Pro) and Semax (Met-Glu-His-Phe-Pro-Gly-Pro). Easy to mix up &mdash; both are heptapeptides starting with non-canonical residues.</li>
  <li>Purity &ge;98% by HPLC.</li>
  <li>Mass spec match.</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All content above is summarized from preclinical literature for laboratory and educational use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Selank', 'Semax', 'neuropeptide', 'comparison'],
  7,
  '2026-05-16T09:30:00Z'
),
(
  'thymic-peptides-research-overview',
  'Thymic Peptides in Immunology Research: Thymosin Alpha-1 and Thymalin',
  'A research overview comparing Thymosin Alpha-1 and Thymalin, two thymic-derived peptide preparations studied in immunology research, with notes on lab handling and COA verification.',
  $body$<blockquote>For in-vitro and laboratory research only. The compounds below are research-grade preparations; nothing below constitutes medical guidance.</blockquote>
<p>The thymus gland produces a family of peptides involved in T-cell maturation. Two thymic preparations appear frequently in research-supply catalogs: Thymosin Alpha-1, a single defined 28-amino-acid peptide, and Thymalin, a peptide-fraction preparation extracted from thymic tissue. They are distinct molecules with overlapping research literature. Available as <a href="/shop/thymosin-alpha-1">Thymosin Alpha-1 5mg</a> and <a href="/shop/thymalin">Thymalin 10mg</a>.</p>
<h2>Thymosin Alpha-1</h2>
<p>Thymosin Alpha-1 (Tα1) is a 28&ndash;amino-acid acetylated peptide originally isolated from thymosin fraction 5. It is a single, defined molecule with a known sequence and CAS number. Published research has examined its activity in T-cell function, dendritic-cell maturation, and antiviral-immunity models. The clinical compound thymalfasin is the same molecule and has approved therapeutic use in some jurisdictions.</p>
<h2>Thymalin</h2>
<p>Thymalin is a thymus-derived peptide-fraction preparation, not a single defined peptide. Russian research literature has examined Thymalin in immunomodulation and aging-research contexts. Because it is a fraction rather than a single molecule, COA verification is necessarily different: rather than a defined sequence, the COA reports the peptide-content profile and source/production process.</p>
<h2>Mechanisms reported in published literature</h2>
<h3>Thymosin Alpha-1</h3>
<ul>
  <li>Modulation of T-helper-1 and T-helper-2 cytokine balance in cell-culture assays.</li>
  <li>Activation of Toll-like receptor 9 signaling in dendritic cells.</li>
  <li>Antiviral effects in published preclinical models for hepatitis viruses.</li>
</ul>
<h3>Thymalin</h3>
<ul>
  <li>Changes in T-cell subpopulation distribution in aged-rodent studies.</li>
  <li>Cytokine-profile modulation in stress-model literature.</li>
</ul>
<h2>Related research peptides</h2>
<p>For other immunology-relevant peptide research, see literature on LL-37 (a cathelicidin) and <a href="/shop/vip">VIP 5mg</a> (vasoactive intestinal peptide), both with documented immunomodulatory mechanisms in published cell-culture work.</p>
<h2>Handling and storage</h2>
<p>Thymosin Alpha-1 is supplied lyophilized as a single defined peptide and follows standard peptide-handling practice &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. Thymalin is also lyophilized; because it is a fraction, batch-to-batch consistency is more dependent on the producer&rsquo;s manufacturing process, making lot-level COA review particularly important.</p>
<h2>What to verify on the COA</h2>
<h3>Thymosin Alpha-1</h3>
<ul>
  <li>Full 28&ndash;amino-acid sequence with the N-terminal acetylation explicitly noted.</li>
  <li>Purity &ge;98% by HPLC.</li>
  <li>Mass spec match for ~3108 Da.</li>
</ul>
<h3>Thymalin</h3>
<ul>
  <li>Peptide-fraction profile / total peptide content.</li>
  <li>Source-tissue and production-process declaration.</li>
  <li>Microbial-contamination screening relevant to a tissue-derived preparation.</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a> for general field-level guidance.</p>
<blockquote><strong>Reminder:</strong> All material is summarized from preclinical research literature for laboratory and educational use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['Thymosin Alpha-1', 'Thymalin', 'immunology', 'thymic peptide'],
  7,
  '2026-05-16T15:00:00Z'
),
(
  'ss-31-research-overview',
  'SS-31 Research Overview: Mitochondria-Targeting Tetrapeptide and Cardiolipin Binding',
  'A research overview of SS-31 (elamipretide), the cardiolipin-binding mitochondrial tetrapeptide studied in models of ischemia-reperfusion, mitochondrial dysfunction, and oxidative stress.',
  $body$<blockquote>For in-vitro and laboratory research only. SS-31 is a research-grade peptide; nothing below constitutes medical or clinical guidance.</blockquote>
<p>SS-31 (also known as elamipretide, Bendavia, or MTP-131) is a synthetic aromatic-cationic tetrapeptide that concentrates in the inner mitochondrial membrane. Its defining feature is binding to cardiolipin, a phospholipid uniquely abundant in mitochondrial membranes. Published preclinical literature has examined SS-31 in cardiac ischemia-reperfusion, age-related mitochondrial dysfunction, and oxidative-stress models. Available as <a href="/shop/ss-31">SS-31 10mg</a> lyophilized.</p>
<h2>Structure</h2>
<p>SS-31 is a tetrapeptide with the sequence D-Arg-2',6'-dimethylTyr-Lys-Phe-NH2. The alternating aromatic-cationic structure is the basis of its selective concentration in the inner mitochondrial membrane &mdash; the molecule partitions into negatively charged membranes via electrostatic attraction without requiring membrane potential.</p>
<h2>Mechanisms reported in published literature</h2>
<ul>
  <li><strong>Cardiolipin binding.</strong> The most-cited mechanism is direct binding to cardiolipin, the phospholipid that anchors cytochrome c and other electron-transport-chain components.</li>
  <li><strong>Stabilization of supercomplex assemblies.</strong> Published work reports that SS-31 binding preserves cardiolipin-dependent assembly of electron-transport-chain supercomplexes.</li>
  <li><strong>Reactive-oxygen-species reduction.</strong> Cell-culture and rodent studies have reported decreased mitochondrial ROS production and decreased oxidative damage markers in injured-tissue models.</li>
  <li><strong>Cytochrome-c peroxidase reduction.</strong> Mechanistic literature describes attenuation of the cytochrome-c/cardiolipin peroxidase activity that initiates apoptosis in stressed mitochondria.</li>
</ul>
<h2>Common research-model applications</h2>
<ul>
  <li>Cardiac ischemia-reperfusion rodent models</li>
  <li>Aged-skeletal-muscle mitochondrial-function studies</li>
  <li>Renal ischemia-reperfusion models</li>
  <li>Cell-culture mitochondrial-function assays under oxidative stress</li>
</ul>
<h2>Related research peptides</h2>
<p>For other mitochondrial-relevant research compounds, see our overview of <a href="/blog/mots-c-research-overview">MOTS-c</a> (mitochondrial-derived peptide) and the <a href="/blog/nad-research-handling-guide">NAD+ research handling guide</a>. The three address mitochondrial function at different levels: membrane structure (SS-31), retrograde signaling (MOTS-c), and redox-cofactor supply (NAD+).</p>
<h2>Handling and storage</h2>
<p>SS-31 ships lyophilized and follows standard peptide-storage protocol &mdash; sealed at &minus;20&deg;C protected from light. See our <a href="/blog/peptide-storage-guide">peptide storage guide</a> for shelf life by storage condition.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> D-Arg-DMT-Lys-Phe-NH2 (the 2',6'-dimethyl-tyrosine residue is non-canonical and must be explicitly stated).</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match</strong> for the expected MW including the dimethyltyrosine and C-terminal amidation.</li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All content above is summarized from preclinical research literature for laboratory and educational use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['SS-31', 'elamipretide', 'mitochondrial', 'cardiolipin'],
  6,
  '2026-05-17T11:00:00Z'
),
(
  'aod-9604-research-guide',
  'AOD-9604 Research Guide: HGH Fragment 176-191 and Lipolysis Pathway Studies',
  'An overview of AOD-9604, a 16-amino-acid synthetic fragment of the C-terminus of human growth hormone studied for its reported lipolytic activity without IGF-1 elevation.',
  $body$<blockquote>For in-vitro and laboratory research only. AOD-9604 is a research-grade peptide; no medical or clinical guidance is implied.</blockquote>
<p>AOD-9604 is a synthetic 16-amino-acid peptide derived from the C-terminal region of human growth hormone (residues 177-191, with an N-terminal tyrosine added for synthesis purposes &mdash; sometimes confusingly described as "HGH fragment 176-191"). Published preclinical literature has examined the peptide for lipolytic activity that is, according to the dominant research framing, dissociated from the IGF-1-mediated growth signaling of full-length growth hormone. Available as <a href="/shop/aod-9604">AOD-9604 5mg</a> lyophilized.</p>
<h2>Origin</h2>
<p>The C-terminus of growth hormone was identified in 1990s research as carrying a lipolytic activity distinct from the broader growth-promoting effects of the parent hormone. AOD-9604 was developed as a synthetic representation of this fragment for research and clinical-investigation use, with the additional N-terminal tyrosine added to enable radiolabeling and synthesis.</p>
<h2>Mechanisms reported in published literature</h2>
<ul>
  <li><strong>Lipolytic activity in adipocyte models.</strong> Cell-culture studies report increased lipolysis in 3T3-L1 and primary adipocyte models.</li>
  <li><strong>Inhibition of lipogenesis.</strong> Some published work reports reduced fatty-acid synthesis under AOD-9604 treatment.</li>
  <li><strong>Dissociation from IGF-1 axis.</strong> The defining mechanistic claim is that AOD-9604 produces these effects without significant IGF-1 elevation &mdash; an important difference from full-length growth hormone or from <a href="/shop/cjc-1295">CJC-1295</a>-type GH-axis stimulants.</li>
</ul>
<blockquote><strong>Research note:</strong> Several clinical trials of AOD-9604 in adiposity research failed to demonstrate the body-composition effects observed in rodent models. The discrepancy between preclinical and clinical literature is significant and should be considered when interpreting any AOD-9604 study.</blockquote>
<h2>Common research-model applications</h2>
<ul>
  <li>3T3-L1 adipocyte lipolysis and lipogenesis assays</li>
  <li>Rodent diet-induced-obesity models</li>
  <li>Cartilage-research models (a less-cited area; AOD-9604 has appeared in some chondrocyte studies)</li>
</ul>
<h2>Related research peptides</h2>
<p>For other compounds in metabolic and growth-pathway research, see our overviews of <a href="/blog/sermorelin-vs-tesamorelin-vs-cjc-1295">Sermorelin vs Tesamorelin vs CJC-1295</a> and <a href="/blog/glp-1-research-peptides-overview">GLP-1 research peptides</a>.</p>
<h2>Handling and storage</h2>
<p>AOD-9604 ships lyophilized and follows standard peptide-storage protocol &mdash; see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. Reconstitution is typically in bacteriostatic water.</p>
<h2>What to verify on the COA</h2>
<ul>
  <li><strong>Sequence:</strong> the 16-residue sequence including the N-terminal tyrosine. Confirm the disulfide bond (if expected) between residues that form the loop structure.</li>
  <li><strong>Purity</strong> &ge;98% by HPLC.</li>
  <li><strong>Mass spec match.</strong></li>
</ul>
<p>See <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All material above is summarized from preclinical and clinical research literature for laboratory and educational use. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['AOD-9604', 'HGH fragment', 'lipolysis', 'metabolic research'],
  6,
  '2026-05-18T10:00:00Z'
),
(
  'how-to-reconstitute-research-peptides',
  'How to Reconstitute Research Peptides: Bacteriostatic Water, Sterile Water, and Acetic Acid Solvents',
  'A practical guide to choosing a reconstitution solvent for research peptides. Covers bacteriostatic water, sterile water, acetic acid solutions, and concentration math.',
  $body$<blockquote>For in-vitro and laboratory research only. All practices below are general laboratory technique guidance; always defer to the specific COA for the peptide and lot you are working with.</blockquote>
<p>Reconstituting a lyophilized peptide correctly is the most consequential single step in handling a research peptide. Use the wrong solvent and a sequence-sensitive peptide can begin degrading immediately; use the right one and you have weeks of usable material. This article covers the standard reconstitution solvents in laboratory research workflows.</p>
<h2>The three common solvents</h2>
<h3>Bacteriostatic water</h3>
<p>Bacteriostatic water is sterile water containing 0.9% benzyl alcohol as a preservative. The benzyl alcohol inhibits bacterial growth in the reconstituted vial, extending usable shelf life for protocols that span multiple days. It is the default solvent for most research peptides in laboratory workflows. Available as <a href="/shop/bac-water">BAC Water 10mL</a> and pharmaceutical-grade formats: <a href="/shop/bacteriostatic-water-10ml-pharmaceutical-grade">10mL</a>, <a href="/shop/bacteriostatic-water">30mL</a>, and <a href="/shop/bacteriostatic-water-3ml-pharmaceutical-quality">3mL</a>.</p>
<h3>Sterile water for injection</h3>
<p>Plain sterile water (no preservative) is used when benzyl alcohol is contraindicated for the downstream application &mdash; for example, some cell-culture protocols where benzyl alcohol could interfere with the assay readout. Reconstituted shelf life is shorter, typically 24&ndash;72 hours refrigerated.</p>
<h3>Acetic acid solutions</h3>
<p>Some peptides have poor solubility in neutral water and require a mildly acidic solvent. <a href="/shop/acetic-water-10ml">Acetic Water 10mL</a> (0.6% acetic acid) is the standard research-supply format. Acetic acid solubilizes hydrophobic peptides and certain sequences with strongly aggregating side chains. The COA usually specifies when an acidic solvent is recommended.</p>
<h2>Choosing the solvent</h2>
<table>
  <thead><tr><th>Situation</th><th>Recommended solvent</th></tr></thead>
  <tbody>
    <tr><td>Standard water-soluble peptide, multi-day protocol</td><td>Bacteriostatic water</td></tr>
    <tr><td>Cell-culture assay sensitive to benzyl alcohol</td><td>Sterile water</td></tr>
    <tr><td>Hydrophobic peptide, poor solubility in water</td><td>0.1&ndash;1% acetic acid</td></tr>
    <tr><td>NAD+ and oxidation-sensitive cofactors</td><td>Cold sterile water (use quickly)</td></tr>
  </tbody>
</table>
<h2>Reconstitution concentration math</h2>
<p>The relationship is straightforward: concentration = mass / volume.</p>
<ul>
  <li>5mg peptide + 2mL solvent = 2.5mg/mL (or 2500 mcg/mL).</li>
  <li>5mg peptide + 5mL solvent = 1mg/mL.</li>
  <li>10mg peptide + 2mL solvent = 5mg/mL.</li>
</ul>
<p>Choosing the reconstitution volume is a balance between minimizing dead-volume losses (favor smaller volumes) and keeping concentrations workable for your assay (favor more dilute solutions where small volumes are hard to pipette accurately).</p>
<h2>Step-by-step</h2>
<ol>
  <li>Bring the lyophilized vial to room temperature before opening &mdash; condensation on a cold vial is contamination waiting to happen.</li>
  <li>Sanitize both rubber stoppers (peptide vial and solvent vial) with 70% isopropyl alcohol.</li>
  <li>Draw the solvent slowly. Inject it down the side of the peptide vial, not directly onto the lyophilized cake &mdash; this prevents foaming.</li>
  <li>Do not shake. Gently swirl or invert until the cake fully dissolves. Most peptides dissolve in seconds; some sequence-sensitive peptides take a few minutes.</li>
  <li>If the solution does not clarify completely, gently warm to room temperature and swirl again. Cloudiness or particulates after 10 minutes of gentle agitation indicates a solubility issue &mdash; re-check the COA solvent recommendation.</li>
  <li>Label the vial with date of reconstitution. Store at 2&ndash;8&deg;C if used within the standard window; aliquot and freeze at &minus;20&deg;C or colder for longer-term storage.</li>
</ol>
<h2>Common mistakes</h2>
<ul>
  <li><strong>Shaking aggressively</strong> &mdash; introduces aggregation and degradation. Always swirl.</li>
  <li><strong>Injecting solvent into the cake</strong> &mdash; causes foaming and entraps peptide in the foam.</li>
  <li><strong>Using bacteriostatic water for very short cell-culture experiments where benzyl alcohol affects the readout.</strong></li>
  <li><strong>Reconstituting and leaving at room temperature overnight</strong> &mdash; many peptides degrade significantly in 8 hours at room temperature.</li>
  <li><strong>Repeated freeze-thaw of the same aliquot.</strong> Always aliquot before freezing.</li>
</ul>
<h2>Further reading</h2>
<p>For storage practice once the peptide is reconstituted, see our <a href="/blog/peptide-storage-guide">peptide storage guide</a>. For COA fields that specify the recommended solvent, see <a href="/blog/how-to-read-peptide-coa">how to read a peptide COA</a>.</p>
<blockquote><strong>Reminder:</strong> All information is for in-vitro and laboratory research. Products are not intended for human consumption.</blockquote>$body$,
  'PrimeHelix Labz Research Team',
  'published',
  ARRAY['reconstitution', 'bacteriostatic water', 'sterile water', 'acetic acid', 'lab handling'],
  7,
  '2026-05-19T08:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;
