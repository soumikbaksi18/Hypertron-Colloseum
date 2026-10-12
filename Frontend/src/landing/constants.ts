export const BOOK_DEMO = "https://calendly.com/kararsweta/30min";

export const PRODUCT_EYEBROW = "Everything around the payment";

export const PRODUCT_HEADLINE = "Private payments need more than a protocol.";

export const PRODUCT_COPY =
  "Hypertron connects private settlement with the payment and operational infrastructure businesses need to accept, manage, and disclose.";

export const PRODUCT_FEATURES = [
  {
    title: "Accept",
    copy: "Payment links and hosted checkout for private Solana payments.",
  },
  {
    title: "Manage",
    copy: "Treasury, settlement, and reconciliation around every payment.",
  },
  {
    title: "Disclose",
    copy: "Selective disclosure and audit workflows when someone needs to see.",
  },
] as const;

export const WAYS = [
  {
    title: "Use the platform",
    headline: "Accept private payments without building the infrastructure.",
    copy: "Create payment links, manage settlements, and operate your treasury from the Hypertron workspace.",
    audience: "For merchants and finance teams",
    tags: ["Payment links", "Checkout", "Treasury"],
    href: "#operations",
    cta: "Explore platform",
  },
  {
    title: "Use the privacy infrastructure",
    headline: "Call the shielded pool from your own Solana app.",
    copy: "The pool is shared infrastructure. Your app deposits, transfers, and unshields against the same Merkle tree Hypertron merchants use — no dashboard, no new anonymity set.",
    audience: "For protocol and infrastructure developers",
    tags: ["Shared pool", "App integration", "Shared anonymity set", "Open prover"],
    href: "#ecosystem",
    cta: "See the stack",
  },
  {
    title: "Use the API",
    headline: "Give your product private checkout.",
    copy: "Add Hypertron-powered payment flows through an API designed for Stripe-like integration.",
    audience: "For application developers",
    tags: ["Payment API", "Checkout", "Webhooks", "Settlement status"],
    href: "/app/developers",
    cta: "Read the docs",
  },
] as const;

export const JOURNEY = [
  {
    label: "Create",
    copy: "The merchant generates a private payment request — amount, memo, and destination stay off the public ledger until settlement.",
  },
  {
    label: "Pay",
    copy: "The customer pays through Hypertron checkout — hosted or via payment link — without leaving a public trail of amount or counterparty.",
  },
  {
    label: "Shield",
    copy: "Funds enter the shared privacy pool. Value is held privately in the Merkle tree until the merchant is ready to claim.",
  },
  {
    label: "Settle",
    copy: "A private transfer reaches the merchant. Confirmation lands without exposing the full payment path on-chain.",
  },
  {
    label: "Operate",
    copy: "The merchant reconciles the settlement, updates treasury, and runs disclosure workflows when someone needs to see a record.",
  },
] as const;

export const PRIVACY_ROLES = [
  {
    title: "Customer",
    copy: "Sensitive payment information is not unnecessarily public.",
  },
  {
    title: "Merchant",
    copy: "Business transaction history remains private.",
  },
  {
    title: "Auditor",
    copy: "Relevant information can be selectively disclosed.",
  },
] as const;

export const OPERATIONS = [
  { title: "Payment links", copy: "Issue a private request without exposing your books." },
  { title: "Invoices", copy: "Track what is owed, paid, and still in flight." },
  { title: "Treasury", copy: "See balances and move capital from one workspace." },
  { title: "Private balance", copy: "Hold value in the pool until you are ready to claim." },
  { title: "Settlement status", copy: "Follow a payment from request to confirmation." },
  { title: "Claim / confirmation", copy: "Take receipt when the private transfer lands." },
  { title: "Disclosure", copy: "Open a record for an auditor without opening the ledger." },
] as const;

export const FAQS = [
  {
    question: "What is Hypertron?",
    answer: [
      "Hypertron is private payment infrastructure for Solana. Businesses can accept and operate private payments through the platform. Developers can integrate private checkout through the API, or call Hypertron privacy infrastructure from their own Solana applications.",
    ],
  },
  {
    question: "Who is Hypertron for?",
    answer: ["Three groups can use Hypertron."],
    roles: [
      {
        title: "Businesses",
        copy: "Use the workspace to create payment links, accept payments, manage settlements, and operate treasury.",
      },
      {
        title: "Application developers",
        copy: "Add Hypertron-powered private checkout to your product through the API.",
      },
      {
        title: "Protocol developers",
        copy: "Call the privacy infrastructure from a Solana application without using the dashboard.",
      },
    ],
  },
  {
    question: "Do I have to use the Hypertron dashboard?",
    answer: [
      "No. Hypertron can be used at different layers. Use the full platform, integrate private checkout through the API, or interact with the privacy infrastructure from your own Solana application.",
    ],
    path: ["Platform", "API", "Protocol"],
  },
  {
    question: "Can I integrate Hypertron into my own Solana application?",
    answer: [
      "Yes. Your app can deposit, transfer, and unshield against the same Merkle tree Hypertron merchants use. You do not need the dashboard, and you do not get a new anonymity set. Proofs stay off-chain.",
    ],
  },
  {
    question: "What does Hypertron make private?",
    answer: [
      "Hypertron is designed to reduce unnecessary exposure of payment information on the public ledger. Depending on the flow, details such as amounts and counterparties can stay private while Solana settlement remains verifiable.",
      "Privacy is not invisibility. Relevant information can be disclosed when required through selective disclosure.",
    ],
  },
  {
    question: "How does selective disclosure work?",
    answer: [
      "Hypertron separates the ability to view payment information from the ability to spend funds. Authorized parties can receive viewing information to inspect relevant details without receiving spending authority.",
    ],
    link: { href: "#privacy", label: "Learn about the privacy model" },
  },
  {
    question: "Can I use Hypertron's existing privacy infrastructure?",
    answer: [
      "Yes. Integrated applications call the deployed pool and share the same note set, rather than deploying an isolated privacy system for every application.",
    ],
  },
  {
    question: "How is Hypertron different from a privacy protocol?",
    answer: [
      "Hypertron is not only a privacy pool. It connects privacy infrastructure to the payment experience around it: checkout, payment links, merchant operations, treasury, settlement, APIs, and selective disclosure.",
      "Developers can also access the underlying privacy infrastructure directly when they do not need the Hypertron application layer.",
    ],
    stack: true,
  },
  {
    question: "What assets and networks does Hypertron support?",
    answer: [
      "Hypertron is built on Solana. The shielded pool targets native SOL. USDC on the same privacy circuits is on the production roadmap. Payment currencies in the app are not the same as a live private pool.",
    ],
    link: { href: "/app/developers", label: "View the developer API" },
  },
  {
    question: "Is Hypertron live?",
    answer: [
      "Hypertron is currently available through early access. The platform and privacy infrastructure are being actively developed and tested, with access available to selected businesses and developers.",
    ],
    link: { href: BOOK_DEMO, label: "Request early access", external: true },
  },
] as const;

export const MERCHANT_FAQS = [
  {
    question: "Do I need to understand crypto to use Hypertron?",
    answer:
      "No. Merchants can use Hypertron through the workspace and payment interfaces without interacting directly with the underlying cryptography.",
  },
  {
    question: "Can I create a payment link?",
    answer:
      "Yes. Merchants can create payment links and hosted checkout flows for their customers.",
  },
  {
    question: "Can I see and reconcile my payments?",
    answer:
      "Yes. Hypertron provides operational tooling around payment status, settlement, treasury, and selective disclosure.",
  },
] as const;
