import { H2, H3, P, UL, OL, LI, Callout, ResearchNote } from "@/components/blog/article-prose"
import type { BlogPost } from "@/lib/blog/types"

const meta = {
  slug: "how-to-read-peptide-coa",
  title: "How to Read a Peptide Certificate of Analysis (COA)",
  description:
    "A field-by-field walkthrough of a peptide Certificate of Analysis. Learn what HPLC purity, mass spectrometry, lot number, and accompanying chromatograms actually tell you, and which red flags to watch for.",
  publishedAt: "2026-05-15",
  author: "PrimeHelix Labz Research Team",
  readMinutes: 6,
  tags: ["COA", "purity", "HPLC", "mass spectrometry", "quality"],
} as const

function Article() {
  return (
    <>
      <Callout>
        For laboratory and research-supply use only. The intent of this guide is
        to help researchers interpret quality documentation when sourcing
        peptides. Nothing here constitutes medical or clinical guidance.
      </Callout>

      <P>
        A Certificate of Analysis (COA) is the single most important document
        a research peptide should ship with. It is the supplier&rsquo;s
        statement, ideally backed by third-party laboratory data, of what is
        actually in the vial. A COA without supporting analytical data is a
        product label, not a quality document.
      </P>
      <P>
        This article walks through the fields of a typical peptide COA and
        explains what each one means, what &ldquo;good&rdquo; looks like, and
        which red flags should make you pause before purchasing.
      </P>

      <H2>Anatomy of a peptide COA</H2>
      <P>A complete COA generally contains the following sections.</P>

      <H3>1. Product identity</H3>
      <UL>
        <LI>
          <strong>Product name</strong> &mdash; the trade or research name (e.g.,
          &ldquo;BPC-157&rdquo;).
        </LI>
        <LI>
          <strong>Sequence</strong> &mdash; the explicit amino-acid sequence in
          one-letter or three-letter code. <em>Critical:</em> trade names like
          &ldquo;TB-500&rdquo; are not strict chemical identifiers; the sequence
          on the COA is.
        </LI>
        <LI>
          <strong>Molecular formula and molecular weight.</strong>
        </LI>
        <LI>
          <strong>CAS number,</strong> when one exists.
        </LI>
      </UL>

      <H3>2. Lot or batch identification</H3>
      <UL>
        <LI>
          <strong>Lot/batch number</strong> &mdash; must match the number printed
          on the vial. If it doesn&rsquo;t match, the COA is not for the product
          in your hand.
        </LI>
        <LI>
          <strong>Manufacture date</strong> &mdash; combined with shelf-life
          guidance below, this tells you how much of the stable life is left.
        </LI>
        <LI>
          <strong>Expiry / re-test date</strong> &mdash; the date by which the
          supplier has guaranteed the assayed properties hold.
        </LI>
      </UL>

      <H3>3. Analytical results</H3>
      <P>This is the core of the COA. Look for:</P>
      <UL>
        <LI>
          <strong>HPLC purity</strong> &mdash; expressed as a percentage. For
          most published preclinical work, &ge;98% is the target. Anything
          below 95% is unusual for a commercial research peptide.
        </LI>
        <LI>
          <strong>Mass spectrometry result</strong> &mdash; the observed
          molecular weight. It should match the theoretical molecular weight
          stated in the identity section to within standard MS tolerances.
        </LI>
        <LI>
          <strong>Water content</strong> &mdash; usually by Karl Fischer titration.
          High water content in a lyophilized peptide is a stability red flag.
        </LI>
        <LI>
          <strong>Acetate / TFA content</strong> &mdash; counter-ion content from
          the synthesis process. Affects net peptide mass per vial.
        </LI>
        <LI>
          <strong>Appearance</strong> &mdash; usually &ldquo;white to off-white
          lyophilized powder.&rdquo; Anything else warrants a question.
        </LI>
      </UL>

      <H3>4. Accompanying analytical data</H3>
      <P>
        A high-quality COA includes the actual chromatograms and spectra, not
        just the summary numbers:
      </P>
      <UL>
        <LI>
          <strong>HPLC chromatogram</strong> showing a single dominant peak.
          Multiple comparable peaks suggest multiple species in the vial.
        </LI>
        <LI>
          <strong>Mass spec trace</strong> with the major ion peak labeled and
          matching the expected mass.
        </LI>
      </UL>
      <ResearchNote>
        If a supplier provides only a summary table with no chromatograms or
        spectra, ask for the underlying data. Reputable third-party labs always
        produce them.
      </ResearchNote>

      <H3>5. Storage and handling</H3>
      <UL>
        <LI>
          <strong>Recommended storage temperature</strong> (typically &minus;20&deg;C
          for lyophilized).
        </LI>
        <LI>
          <strong>Reconstitution recommendations</strong> &mdash; solvent and
          concentration ranges.
        </LI>
        <LI>
          <strong>Handling cautions</strong> &mdash; light, humidity, freeze-thaw.
        </LI>
      </UL>
      <P>
        For more on this section in practice, see our{" "}
        <a className="text-primary underline" href="/blog/peptide-storage-guide">
          peptide storage guide
        </a>
        .
      </P>

      <H3>6. Issuing party and signatures</H3>
      <UL>
        <LI>
          <strong>Issuing laboratory.</strong> A COA from an independent,
          ISO-accredited testing lab carries more weight than one issued
          purely by the manufacturer.
        </LI>
        <LI>
          <strong>Date of testing</strong> and <strong>analyst signature</strong>{" "}
          (or electronic signature). Both should be present.
        </LI>
      </UL>

      <H2>Red flags</H2>
      <OL>
        <LI>
          <strong>No COA at all,</strong> or a COA generated only as a generic
          template not tied to a specific lot.
        </LI>
        <LI>
          <strong>Lot number on the COA does not match the vial.</strong> Common
          when a supplier reuses an old COA for a new batch.
        </LI>
        <LI>
          <strong>No chromatograms or mass-spec traces,</strong> only summary
          numbers.
        </LI>
        <LI>
          <strong>HPLC purity stated to several decimal places without a
          chromatogram</strong>&mdash;real instruments do not justify that
          precision.
        </LI>
        <LI>
          <strong>Appearance description that doesn&rsquo;t match what&rsquo;s
          in the vial.</strong>
        </LI>
        <LI>
          <strong>COA dated long before the manufacture date</strong>&mdash;the
          tested material is not the material shipped.
        </LI>
      </OL>

      <H2>What to do with the COA after purchase</H2>
      <UL>
        <LI>
          File it with the lot number; treat it as a primary lab record.
        </LI>
        <LI>
          When you publish or share results from work using the peptide, cite
          the lot and supplier.
        </LI>
        <LI>
          For long-running studies, request fresh COA testing from the supplier
          before reordering &mdash; some suppliers re-assay aged stock and
          re-issue updated COAs.
        </LI>
      </UL>

      <H2>Further reading</H2>
      <P>
        For background on the most-discussed research peptides, see our{" "}
        <a className="text-primary underline" href="/blog/bpc-157-research-guide">
          BPC-157 research guide
        </a>{" "}
        and{" "}
        <a className="text-primary underline" href="/blog/ghk-cu-research-overview">
          GHK-Cu research overview
        </a>
        .
      </P>

      <Callout>
        <strong>Reminder:</strong> All information above is for in-vitro and
        laboratory research purposes. PrimeHelix Labz products are not intended
        for human consumption.
      </Callout>
    </>
  )
}

const post: BlogPost = {
  ...meta,
  Component: Article,
}

export default post
