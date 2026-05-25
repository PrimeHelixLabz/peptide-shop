"use client"

import { useMemo, useState } from "react"
import { Calculator } from "lucide-react"

interface ReconstitutionCalculatorProps {
  /** Peptide amount in mg per vial, parsed from the variant SKU (e.g. "10mg" -> 10). */
  defaultPeptideMg?: number
  productName: string
  variantSku?: string
}

type DoseUnit = "mcg" | "mg"

function parseMgFromSku(sku: string | undefined): number | null {
  if (!sku) return null
  const lowered = sku.toLowerCase()
  // Match "10mg", "10 mg", "10.5mg", "10mg/vial" — first number followed
  // (optionally with whitespace) by "mg". Cap at a sane upper bound so a
  // weird SKU like "10000mg" doesn't poison the default.
  const match = lowered.match(/(\d+(?:\.\d+)?)\s*mg/)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value) || value <= 0 || value > 500) return null
  return value
}

function clampPositive(input: string): number {
  const n = Number.parseFloat(input)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

export function ReconstitutionCalculator({
  defaultPeptideMg,
  productName,
  variantSku,
}: ReconstitutionCalculatorProps) {
  const initialMg = defaultPeptideMg ?? parseMgFromSku(variantSku) ?? 10
  const [peptideMg, setPeptideMg] = useState<string>(String(initialMg))
  const [waterMl, setWaterMl] = useState<string>("2")
  const [doseAmount, setDoseAmount] = useState<string>("250")
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("mcg")

  const result = useMemo(() => {
    const mg = clampPositive(peptideMg)
    const ml = clampPositive(waterMl)
    const dose = clampPositive(doseAmount)

    if (mg <= 0 || ml <= 0 || dose <= 0) {
      return null
    }

    // Concentration in mg/mL.
    const concentrationMgPerMl = mg / ml

    // Desired dose normalized to mg for the math.
    const doseInMg = doseUnit === "mcg" ? dose / 1000 : dose

    // Total vial would contain (mg) / (dose-in-mg) full doses.
    const dosesPerVial = mg / doseInMg

    // mL needed per dose.
    const mlPerDose = doseInMg / concentrationMgPerMl

    // On a U-100 insulin syringe, 100 IU = 1 mL.
    const iuPerDose = mlPerDose * 100

    return {
      concentrationMgPerMl,
      dosesPerVial,
      mlPerDose,
      iuPerDose,
    }
  }, [peptideMg, waterMl, doseAmount, doseUnit])

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Reconstitution &amp; dosing calculator
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Estimate concentration, mL per dose, and the corresponding insulin
            syringe reading (U-100) for {productName}. For lab-research planning
            only &mdash; not medical guidance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Peptide in vial (mg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={peptideMg}
            onChange={(e) => setPeptideMg(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Bacteriostatic water added (mL)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={waterMl}
            onChange={(e) => setWaterMl(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px]"
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Desired dose
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px]"
            />
            <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setDoseUnit("mcg")}
                className={`px-4 text-sm font-medium transition-colors min-h-[48px] ${
                  doseUnit === "mcg"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-gray-50"
                }`}
                aria-pressed={doseUnit === "mcg"}
              >
                mcg
              </button>
              <button
                type="button"
                onClick={() => setDoseUnit("mg")}
                className={`px-4 text-sm font-medium transition-colors min-h-[48px] ${
                  doseUnit === "mg"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-gray-50"
                }`}
                aria-pressed={doseUnit === "mg"}
              >
                mg
              </button>
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-2xl bg-gray-50 p-5">
        {result ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCell
              label="Concentration"
              value={`${result.concentrationMgPerMl.toFixed(2)} mg/mL`}
              hint={`${(result.concentrationMgPerMl * 1000).toFixed(0)} mcg/mL`}
            />
            <ResultCell
              label="Doses per vial"
              value={result.dosesPerVial.toFixed(1)}
              hint="at the dose entered above"
            />
            <ResultCell
              label="Volume per dose"
              value={`${result.mlPerDose.toFixed(3)} mL`}
            />
            <ResultCell
              label="Insulin syringe (U-100)"
              value={`${result.iuPerDose.toFixed(0)} IU`}
              hint="100 IU = 1 mL on a U-100 syringe"
              emphasis
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter peptide amount, water volume, and a desired dose to see the
            calculated values.
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Calculations are based on standard concentration math
        (concentration = mg / mL; IU = mL &times; 100 for U-100 syringes). For
        laboratory research planning only. All PrimeHelix Labz products are
        sold strictly for research purposes &mdash; not for human consumption.
      </p>
    </div>
  )
}

function ResultCell({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl bg-white p-4 ${
        emphasis ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-lg font-semibold ${
          emphasis ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
    </div>
  )
}
