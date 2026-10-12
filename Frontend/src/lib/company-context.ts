export type CompanyContextResult =
  | { ok: true; context: string; sourceUrl: string }
  | { ok: false; error: string };

const TYPE_LABELS: Record<string, string> = {
  "web3-startup": "Web3 startup",
  dao: "DAO",
  agency: "agency",
  foundation: "foundation",
  infrastructure: "infrastructure provider",
  "service-company": "service company",
  enterprise: "enterprise team",
  other: "organization",
};

export async function fetchCompanyContext(input: {
  website: string;
  name?: string;
  workspaceType?: string;
  signal?: AbortSignal;
}): Promise<CompanyContextResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  if (input.signal?.aborted) {
    return { ok: false, error: "Research cancelled." };
  }

  const name = input.name?.trim() || "This company";
  const kind = TYPE_LABELS[input.workspaceType ?? ""] ?? "organization";
  const site = input.website.trim();

  return {
    ok: true,
    sourceUrl: site,
    context: [
      `${name} is a ${kind} using Hypertron for private payments.`,
      site ? `Public site: ${site}.` : null,
      "Customers pay through invoices and payment links. Settlement stays on the shielded pool, and the team reconciles from the workspace.",
      "Edit this draft before approving it. Approved context is stored with the workspace for later agent setup.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
