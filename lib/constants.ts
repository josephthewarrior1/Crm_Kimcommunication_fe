export const INDUSTRIES = [
  "Aerospace & Defense",
  "Agriculture & Forestry",
  "Arts, Entertainment & Recreation",
  "Architecture & Construction",
  "Education",
  "Education - Higher",
  "Financial Services (Banking / Insurance / Multifinance / Fintech)",
  "Government - Federal/National",
  "Government - State/Local",
  "Healthcare",
  "Hospitality",
  "Manufacturing",
  "Media & Advertising",
  "Mining/Oil/Gas",
  "Pharmaceutical",
  "Professional Service",
  "Reseller/Integrator",
  "Retail",
  "Technology",
  "Telecommunication",
  "Transportation & Logistics",
  "Utility",
  "Wholesale/Distributor",
  "Holding Company",
  "Principal",
  "Other"
] as const;

export type Industry = typeof INDUSTRIES[number];

export const REVENUE_SIZES = [
  "< $1M",
  "$1M - $10M",
  "$10M - $50M",
  "$50M - $100M",
  "$100M - $500M",
  "> $500M"
] as const;

export const EMPLOYEE_SIZES = [
  "< 50 employees",
  "50-100 employees",
  "100-500 employees",
  "500-1000 employees",
  "> 1000 employees"
] as const;

