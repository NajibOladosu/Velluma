/* ═══════════════════════════════════════════════════════
   Shared contracts data — single source of truth
   Used by both contracts/page.tsx (list) and
   contracts/[id]/page.tsx (detail builder).
   ═══════════════════════════════════════════════════════ */

export type ContractStatus = "draft" | "pending" | "signed" | "expired";

export interface Signer {
  id: string;
  name: string;
  role: string;
  status: "pending" | "signed";
}

export interface Contract {
  id: string;
  title: string;
  client: string;
  clientId: string;
  status: ContractStatus;
  value: string;
  numericValue: number;
  createdAt: string;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  template: string;
  description?: string;
  signers: Signer[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: "standard" | "custom";
  lastModified: string;
  usageCount: number;
  lockedClauses: number;
}

/* ─── Templates ─────────────────────────────────────── */

export const templatesData: ContractTemplate[] = [
  {
    id: "t1",
    name: "Master Services Agreement (Retainer)",
    description:
      "Core MSA with locked standard clauses for all retainer clients. Includes strict intellectual property and confidentiality terms.",
    type: "standard",
    lastModified: "Mar 10, 2026",
    usageCount: 45,
    lockedClauses: 8,
  },
  {
    id: "t2",
    name: "Independent Contractor Agreement",
    description: "Standard agreement for hiring freelancers or subcontractors.",
    type: "standard",
    lastModified: "Feb 15, 2026",
    usageCount: 18,
    lockedClauses: 5,
  },
  {
    id: "t3",
    name: "Web Development SOW",
    description:
      "Statement of work template specific to web engineering projects. Editable scope and timeline.",
    type: "custom",
    lastModified: "Mar 05, 2026",
    usageCount: 12,
    lockedClauses: 2,
  },
  {
    id: "t4",
    name: "Brand Design Agreement",
    description:
      "Contract template for brand identity and strategy projects. Flexible licensing terms.",
    type: "custom",
    lastModified: "Feb 28, 2026",
    usageCount: 28,
    lockedClauses: 0,
  },
];

/* ─── Active Contracts ──────────────────────────────── */

export const contractsData: Contract[] = [
  {
    id: "1",
    title: "Master Services Agreement",
    client: "Acme Corp",
    clientId: "1",
    status: "signed",
    value: "$12,500",
    numericValue: 12500,
    createdAt: "Feb 28, 2026",
    sentAt: "Mar 01, 2026",
    signedAt: "Mar 03, 2026",
    expiresAt: null,
    template: "Standard MSA",
    description: "Full-scope retainer for Acme Corp. Immutable scope and IP assignment clauses.",
    signers: [
      { id: "s1", name: "David Kim",     role: "Client",     status: "signed" },
      { id: "s2", name: "Sarah Connor",  role: "Freelancer", status: "signed" },
    ],
  },
  {
    id: "2",
    title: "Brand Identity Contract",
    client: "Vesper AI",
    clientId: "3",
    status: "pending",
    value: "$8,500",
    numericValue: 8500,
    createdAt: "Mar 05, 2026",
    sentAt: "Mar 06, 2026",
    signedAt: null,
    expiresAt: null,
    template: "Brand Design Agreement",
    description: "Brand identity project for Vesper AI — pending client counter-signature.",
    signers: [
      { id: "s3", name: "Lena Ray",      role: "Client",     status: "pending" },
      { id: "s2", name: "Sarah Connor",  role: "Freelancer", status: "signed"  },
    ],
  },
  {
    id: "3",
    title: "Mobile App Subcontractor",
    client: "Orbit Systems",
    clientId: "4",
    status: "draft",
    value: "$18,000",
    numericValue: 18000,
    createdAt: "Mar 10, 2026",
    sentAt: null,
    signedAt: null,
    expiresAt: null,
    template: "Independent Contractor",
    description: "Draft subcontractor agreement for the Orbit Systems mobile project.",
    signers: [
      { id: "s6", name: "James Holden",  role: "Client",     status: "pending" },
      { id: "s2", name: "Sarah Connor",  role: "Freelancer", status: "pending" },
    ],
  },
];

/* ─── Lookup helpers ────────────────────────────────── */

/** Returns the display name for a given contract OR template ID. */
export function resolveContractName(id: string): string {
  const contract = contractsData.find((c) => c.id === id);
  if (contract) return contract.title;
  const template = templatesData.find((t) => t.id === id);
  if (template) return template.name;
  return "Untitled Contract";
}

/** Returns the description for a given contract OR template ID. */
export function resolveContractDescription(id: string): string {
  const contract = contractsData.find((c) => c.id === id);
  if (contract) return contract.description ?? "";
  const template = templatesData.find((t) => t.id === id);
  if (template) return template.description;
  return "";
}

/** Returns true if the id belongs to a template (vs an active contract). */
export function isTemplateId(id: string): boolean {
  return templatesData.some((t) => t.id === id);
}
