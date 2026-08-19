/**
 * Adjacent-title candidates per Adzuna US category (PRD §8.3).
 *
 * Category-based matching for MVP: a searched title resolves to its dominant
 * Adzuna category, and these curated common titles from the same category are
 * offered as adjacent suggestions. Not a similarity model — flagged as a known
 * limitation in PRD §10.
 *
 * Keys are Adzuna's exact US category tags (from /v1/api/jobs/us/categories).
 * Titles are pre-normalized (lowercase) to match normalizeTitle() output.
 */

export interface AdjacentTitle {
  title: string;
  count: number;
}
export const CATEGORY_TITLES: Record<string, string[]> = {
  "accounting-finance-jobs": [
    "accountant",
    "financial analyst",
    "bookkeeper",
    "controller",
    "auditor",
    "payroll specialist",
  ],
  "it-jobs": [
    "software engineer",
    "data analyst",
    "data scientist",
    "devops engineer",
    "product manager",
    "cybersecurity analyst",
  ],
  "sales-jobs": [
    "sales representative",
    "account executive",
    "account manager",
    "sales manager",
    "business development representative",
  ],
  "customer-services-jobs": [
    "customer service representative",
    "call center agent",
    "customer success manager",
    "help desk specialist",
  ],
  "engineering-jobs": [
    "mechanical engineer",
    "electrical engineer",
    "civil engineer",
    "software engineer",
    "manufacturing engineer",
    "project engineer",
  ],
  "hr-jobs": [
    "human resources manager",
    "recruiter",
    "hr generalist",
    "talent acquisition specialist",
    "hr coordinator",
  ],
  "healthcare-nursing-jobs": [
    "registered nurse",
    "licensed practical nurse",
    "medical assistant",
    "nurse practitioner",
    "physical therapist",
    "caregiver",
  ],
  "hospitality-catering-jobs": [
    "chef",
    "line cook",
    "restaurant manager",
    "server",
    "bartender",
    "barista",
  ],
  "pr-advertising-marketing-jobs": [
    "marketing manager",
    "digital marketing specialist",
    "social media manager",
    "content writer",
    "seo specialist",
    "brand manager",
  ],
  "logistics-warehouse-jobs": [
    "warehouse associate",
    "forklift operator",
    "truck driver",
    "logistics coordinator",
    "supply chain analyst",
  ],
  "teaching-jobs": [
    "teacher",
    "substitute teacher",
    "tutor",
    "special education teacher",
    "teaching assistant",
  ],
  "trade-construction-jobs": [
    "electrician",
    "plumber",
    "carpenter",
    "construction laborer",
    "hvac technician",
    "welder",
  ],
  "admin-jobs": [
    "administrative assistant",
    "office manager",
    "receptionist",
    "executive assistant",
    "data entry clerk",
  ],
  "legal-jobs": [
    "paralegal",
    "attorney",
    "legal assistant",
    "compliance officer",
    "contract manager",
  ],
  "creative-design-jobs": [
    "graphic designer",
    "ux designer",
    "video editor",
    "copywriter",
    "art director",
  ],
  "graduate-jobs": [
    "intern",
    "junior software engineer",
    "management trainee",
    "research assistant",
  ],
  "retail-jobs": [
    "retail sales associate",
    "store manager",
    "cashier",
    "merchandiser",
    "assistant store manager",
  ],
  "consultancy-jobs": [
    "management consultant",
    "business analyst",
    "strategy consultant",
    "implementation consultant",
  ],
  "manufacturing-jobs": [
    "production worker",
    "machine operator",
    "assembler",
    "quality inspector",
    "production supervisor",
  ],
  "scientific-qa-jobs": [
    "research scientist",
    "lab technician",
    "quality assurance analyst",
    "chemist",
    "clinical research associate",
  ],
  "social-work-jobs": [
    "social worker",
    "case manager",
    "counselor",
    "behavioral therapist",
    "community outreach coordinator",
  ],
  "travel-jobs": [
    "travel agent",
    "flight attendant",
    "tour guide",
    "reservation agent",
  ],
  "energy-oil-gas-jobs": [
    "solar installer",
    "wind turbine technician",
    "petroleum engineer",
    "pipeline operator",
    "energy analyst",
  ],
  "property-jobs": [
    "property manager",
    "real estate agent",
    "leasing consultant",
    "facilities manager",
    "appraiser",
  ],
  "charity-voluntary-jobs": [
    "program coordinator",
    "development director",
    "grant writer",
    "volunteer coordinator",
  ],
  "domestic-help-cleaning-jobs": [
    "housekeeper",
    "cleaner",
    "janitor",
    "nanny",
    "home health aide",
  ],
  "maintenance-jobs": [
    "maintenance technician",
    "handyman",
    "groundskeeper",
    "building engineer",
    "custodian",
  ],
  "part-time-jobs": [
    "retail sales associate",
    "delivery driver",
    "server",
    "customer service representative",
    "warehouse associate",
  ],
  "other-general-jobs": [
    "general laborer",
    "driver",
    "security guard",
    "operations associate",
  ],
  unknown: [],
};
