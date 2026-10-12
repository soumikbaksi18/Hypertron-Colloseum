import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Globe2,
  ImageUp,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { HypertronLogoMark } from "../dashboard/hypertron-logo-mark";
import { useWalletSession } from "../../context/WalletContext";
import { fetchCompanyContext } from "../../lib/company-context";
import { createWorkspace } from "../../lib/workspaces";
import "../../account/account.css";
import {
  DEFAULT_DRAFT,
  STEPS,
  SUGGESTED_ROLES,
  WORKSPACE_TYPES,
  type Option,
  type TeamInvite,
  type WizardStep,
  type WorkspaceDraft,
} from "./workspace-create-options";

const DRAFT_KEY = "hypertron:create-workspace:draft:v5";
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_DATA_URL_LENGTH = 600_000;
const BRAND_BTN_START = "#121F46";
const BRAND_BTN_END = "#4A63BE";
const BRAND_BUTTON_GRADIENT = `linear-gradient(90deg, ${BRAND_BTN_START} 0%, ${BRAND_BTN_END} 100%)`;

function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => {
      if (href === "/dashboard") {
        navigate(href, { state: { allowEmpty: true } });
        return;
      }
      navigate(href);
    },
    replace: (href: string) => navigate(href, { replace: true }),
  };
}

export function WorkspaceCreateWizard() {
  const router = useRouter();
  const { refresh } = useWalletSession();
  const [draft, setDraft] = useState<WorkspaceDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const researchAbortRef = useRef<AbortController | null>(null);
  const researchRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<WorkspaceDraft>;
          setDraft(normalizeDraft(parsed));
        }
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  useEffect(() => {
    return () => {
      researchAbortRef.current?.abort();
    };
  }, []);

  const progress = Math.round((draft.currentStep / STEPS.length) * 100);

  function update(patch: Partial<WorkspaceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function goTo(step: WizardStep) {
    update({ currentStep: step });
  }

  function startCompanyResearch(options?: { force?: boolean }) {
    const website = draft.website.trim();
    if (!website) {
      update({
        contextStatus: "idle",
        contextError: "",
        contextSourceUrl: "",
      });
      return;
    }

    const sameSource =
      draft.contextSourceUrl &&
      normalizeWebsiteKey(draft.contextSourceUrl) ===
        normalizeWebsiteKey(website);
    if (
      !options?.force &&
      sameSource &&
      (draft.contextStatus === "loading" ||
        (draft.contextStatus === "ready" && draft.companyContext.trim()))
    ) {
      return;
    }

    researchAbortRef.current?.abort();
    const controller = new AbortController();
    researchAbortRef.current = controller;
    const requestId = researchRequestId.current + 1;
    researchRequestId.current = requestId;

    update({
      contextStatus: "loading",
      contextError: "",
      contextApproved: false,
      contextSourceUrl: website,
    });

    void fetchCompanyContext({
      website,
      name: draft.name.trim() || undefined,
      workspaceType: draft.workspaceType,
      signal: controller.signal,
    }).then((result) => {
      if (researchRequestId.current !== requestId) return;
      if (!result.ok) {
        if (result.error === "Research cancelled.") return;
        setDraft((current) => ({
          ...current,
          contextStatus: "error",
          contextError: result.error,
        }));
        return;
      }
      setDraft((current) => ({
        ...current,
        companyContext: result.context,
        contextStatus: "ready",
        contextError: "",
        contextSourceUrl: result.sourceUrl,
        contextApproved: false,
      }));
    });
  }

  function goNext() {
    const validationError = validateStep(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (draft.currentStep === 2) {
      startCompanyResearch();
    }
    if (draft.currentStep < 4) {
      goTo((draft.currentStep + 1) as WizardStep);
    }
  }

  function goBack() {
    if (draft.currentStep === 1) {
      router.push("/dashboard");
      return;
    }
    goTo((draft.currentStep - 1) as WizardStep);
  }

  async function submit() {
    if (submitting) return;
    const validationError = validateAll(draft);
    if (validationError) {
      setError(validationError.message);
      goTo(validationError.step);
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createWorkspace({
      name: draft.name.trim(),
      workspaceType: draft.workspaceType,
      website: draft.website.trim() || undefined,
      teamSize: draft.teamSize,
      logoDataUrl: draft.logoDataUrl || undefined,
      logoName: draft.logoName || undefined,
      invitedMembers: draft.invitedMembers
        .filter((member) => member.email.trim() || member.nickname.trim())
        .map(({ email, nickname, role, permission }) => ({
          email: email.trim(),
          nickname: nickname.trim(),
          role,
          permission,
        })),
      companyContext: draft.contextApproved
        ? draft.companyContext.trim() || undefined
        : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    try {
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Workspace was created, but the session could not refresh.",
      );
      setSubmitting(false);
      return;
    }

    sessionStorage.removeItem(DRAFT_KEY);
    router.replace("/app");
  }

  return (
    <div className="account-shell relative min-h-svh overflow-hidden bg-[#0F1939] text-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[8%] size-[28rem] rounded-full bg-[#E7B66D]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[18%] -left-24 size-[22rem] rounded-full border border-[#E7B66D]/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] bottom-[-8rem] size-[32rem] rounded-full bg-[#4A63BE]/18 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[18%] top-[12%] size-[18rem] rounded-full border border-white/8"
      />

      <div className="relative z-10 flex min-h-svh gap-3 p-3 md:gap-4 md:p-4">
        <div className="hidden w-[220px] shrink-0 flex-col py-2 pb-10 pl-1 text-white lg:flex">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2.5 self-start px-3 pt-2"
            aria-label="Return to dashboard"
          >
            <HypertronLogoMark size={32} />
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">
              Hypertron
            </span>
          </button>
          <ProgressRail currentStep={draft.currentStep} onSelect={goTo} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between px-1 lg:hidden">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5"
              aria-label="Return to dashboard"
            >
              <HypertronLogoMark size={28} />
              <span className="font-display text-sm font-semibold text-white">
                Hypertron
              </span>
            </button>
            <span className="text-[10px] font-semibold tracking-[0.16em] text-[#E7B66D] uppercase">
              Step {draft.currentStep} of {STEPS.length}
            </span>
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 lg:px-9">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#E7B66D] uppercase">
                {STEPS[draft.currentStep - 1]}{" "}
                <span className="font-medium tracking-normal text-slate-400">
                  Step {draft.currentStep} of {STEPS.length}
                </span>
              </p>
              <div className="flex h-[38px] w-[456px] max-w-[55%] items-center justify-end gap-8">
                <SetupProgress value={progress} />
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  aria-label="Close workspace setup"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition hover:bg-slate-50"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
              <StepContent
                draft={draft}
                setDraft={setDraft}
                onEdit={goTo}
                onResearch={() => startCompanyResearch({ force: true })}
              />
            </div>

            <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-7 lg:px-9">
              {error ? (
                <p
                  role="alert"
                  className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <p className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                  <ShieldCheck className="size-4 text-[#E7B66D]" />
                  You can update these choices later in workspace settings.
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="size-4" />
                    {draft.currentStep === 1 ? "Cancel" : "Back"}
                  </button>
                  <button
                    type="button"
                    onClick={
                      draft.currentStep === 4 ? () => void submit() : goNext
                    }
                    disabled={submitting}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.28)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                    style={{ backgroundImage: BRAND_BUTTON_GRADIENT }}
                  >
                    {draft.currentStep === 4
                      ? submitting
                        ? "Creating…"
                        : "Create Workspace"
                      : "Continue"}
                    {!submitting ? <ArrowRight className="size-4" /> : null}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SetupProgress({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className="relative hidden h-2 min-w-0 flex-1 sm:block"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label="Setup progress"
    >
      <div className="absolute inset-0 rounded-full bg-[#E3DED6]" />
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
        style={{
          width: `${clamped}%`,
          backgroundImage:
            "linear-gradient(90deg, #0F1939 0%, #4A63BE 52%, #F3CB88 100%)",
        }}
      />
      <span
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F3CB88] shadow-[0_0_0_3px_#fff,0_0_10px_rgba(243,203,136,0.45)] transition-[left] duration-300"
        style={{ left: `${clamped}%` }}
      />
    </div>
  );
}

const STEP_HINTS = [
  "Choose your type",
  "Company basics",
  "Invite teammates",
  "Confirm and create",
] as const;

function ProgressRail({
  currentStep,
  onSelect,
}: {
  currentStep: WizardStep;
  onSelect: (step: WizardStep) => void;
}) {
  return (
    <aside className="relative mt-5 flex min-h-0 flex-1 flex-col px-2 text-white">
      <div className="px-1">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-[#E7B66D] uppercase">
          New Workspace
        </p>
        <h1 className="mt-2 text-lg font-semibold leading-6 tracking-tight">
          Let’s get you set up.
        </h1>
        <p className="mt-1.5 text-[11px] leading-4 text-white/50">
          Step {currentStep} of {STEPS.length}. Every choice can be changed later.
        </p>
      </div>

      <ol className="relative mt-5">
        {STEPS.map((label, index) => {
          const step = (index + 1) as WizardStep;
          const active = step === currentStep;
          const complete = step < currentStep;
          return (
            <li
              key={label}
              className="relative grid h-[70px] grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5"
            >
              {step < STEPS.length ? (
                <span
                  aria-hidden
                  className={[
                    "absolute top-[calc(50%+1rem)] left-4 h-[38px] w-0.5 -translate-x-1/2",
                    complete ? "bg-[#E7B66D]" : "bg-white/20",
                  ].join(" ")}
                />
              ) : null}
              <span
                className={[
                  "relative z-10 flex size-8 items-center justify-center rounded-full text-[10px] font-semibold tracking-wide",
                  active
                    ? "bg-[#E7B66D] text-[#0F1939]"
                    : complete
                      ? "border-2 border-[#E7B66D] bg-[#E7B66D]/12 text-[#E7B66D]"
                      : "border-2 border-white/20 bg-transparent text-white/40",
                ].join(" ")}
              >
                {complete ? (
                  <Check className="size-3.5" />
                ) : (
                  String(step).padStart(2, "0")
                )}
              </span>
              <button
                type="button"
                onClick={() => complete && onSelect(step)}
                disabled={!complete}
                className={[
                  "min-w-0 rounded-xl px-2.5 py-1 text-left transition disabled:cursor-default",
                  active ? "bg-white/6 ring-1 ring-white/10" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "block text-sm font-medium",
                    active
                      ? "text-[#E7B66D]"
                      : complete
                        ? "text-white/80"
                        : "text-white/40",
                  ].join(" ")}
                >
                  {label}
                </span>
                <span
                  className={[
                    "mt-0.5 block text-[11px]",
                    active ? "text-[#E7B66D]/80" : "text-white/35",
                  ].join(" ")}
                >
                  {STEP_HINTS[index]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto space-y-3">
        <div className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-white">
          <CircleHelp className="size-4 text-[#E7B66D]" strokeWidth={1.85} />
          Need help?
        </div>
        <p className="px-3 text-[11px] leading-4 text-white/45">
          Configure the essentials now. Every preference can be changed later.
        </p>
      </div>
    </aside>
  );
}

function StepContent({
  draft,
  setDraft,
  onEdit,
  onResearch,
}: {
  draft: WorkspaceDraft;
  setDraft: Dispatch<SetStateAction<WorkspaceDraft>>;
  onEdit: (step: WizardStep) => void;
  onResearch: () => void;
}) {
  function update(patch: Partial<WorkspaceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  switch (draft.currentStep) {
    case 1:
      return (
        <StepFrame
          eyebrow={`Step 1 of ${STEPS.length}`}
          title="What are you building?"
          description="This helps us personalize your workspace experience."
        >
          <OptionGrid
            options={WORKSPACE_TYPES}
            selected={[draft.workspaceType]}
            onToggle={(id) => update({ workspaceType: id })}
            single
          />
        </StepFrame>
      );
    case 2:
      return (
        <StepFrame
          eyebrow={`Step 2 of ${STEPS.length}`}
          title="Let's set up the basics"
          description="You can always change these later."
        >
          <WorkspaceDetailsStep
            draft={draft}
            onUpdate={(patch) => {
              const websiteChanged =
                typeof patch.website === "string" &&
                patch.website.trim() !== draft.website.trim();
              update({
                ...patch,
                ...(websiteChanged
                  ? {
                      contextApproved: false,
                      contextStatus: "idle" as const,
                      contextError: "",
                      companyContext: "",
                      contextSourceUrl: "",
                    }
                  : {}),
              });
            }}
          />
        </StepFrame>
      );
    case 3:
      return (
        <StepFrame
          eyebrow={`Step 3 of ${STEPS.length}`}
          title="Invite your team"
          description="Add team members who will collaborate in this workspace."
        >
          <InviteEditor
            members={draft.invitedMembers}
            onChange={(invitedMembers) => update({ invitedMembers })}
          />
        </StepFrame>
      );
    case 4:
      return (
        <StepFrame
          eyebrow="Review"
          title="Review the workspace before creating it"
          description="Confirm the basics and decide what company context Hypertron may use across the platform."
          badge="Optional · skip anytime"
        >
          <ReviewGrid
            draft={draft}
            onEdit={onEdit}
            onUpdate={update}
            onResearch={onResearch}
          />
        </StepFrame>
      );
  }
}

function WorkspaceDetailsStep({
  draft,
  onUpdate,
}: {
  draft: WorkspaceDraft;
  onUpdate: (patch: Partial<WorkspaceDraft>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");

  function handleLogoFile(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/svg+xml"].includes(file.type)) {
      setLogoError("Upload a JPG, PNG, or SVG file.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError("Logo must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      if (reader.result.length > MAX_LOGO_DATA_URL_LENGTH) {
        setLogoError("Logo is too large after encoding. Use a smaller file.");
        return;
      }
      onUpdate({ logoDataUrl: reader.result, logoName: file.name });
      setLogoError("");
    };
    reader.readAsDataURL(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleLogoFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    handleLogoFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-7">
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">
            Business Name
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            This is how your workspace will appear inside Hypertron.
          </span>
          <span className="relative mt-3 block">
            <input
              autoFocus
              type="text"
              value={draft.name}
              onChange={(event) => onUpdate({ name: event.target.value })}
              placeholder="e.g. Hypertron Labs"
              maxLength={80}
              className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {draft.name.trim() ? (
              <CheckCircle2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-emerald-500" />
            ) : null}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-900">
            Website Link
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            Add the website your team uses for this workspace.
          </span>
          <span className="relative mt-3 block">
            <Globe2 className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              value={draft.website}
              onChange={(event) => onUpdate({ website: event.target.value })}
              placeholder="https://yourcompany.xyz"
              className="h-14 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">
            Team Size
          </legend>
          <p className="mt-1 text-xs text-slate-500">
            Helps us tailor your experience.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["1-5", "5-20", "20-50", "50+"].map((size) => {
              const selected = draft.teamSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdate({ teamSize: size })}
                  aria-pressed={selected}
                  className={[
                    "flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition",
                    selected
                      ? "border-[#E7B66D] bg-[#F8F0E2] text-[#0F1939] ring-1 ring-[#E7B66D]/25"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#E7B66D]/50",
                  ].join(" ")}
                >
                  <Users className="size-4" />
                  {size === "1-5"
                    ? "1 - 5"
                    : size === "5-20"
                      ? "5 - 20"
                      : size === "20-50"
                        ? "20 - 50"
                        : "50+"}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Logo <span className="font-normal text-slate-500">(Optional)</span>
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Upload your logo to personalize your workspace.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="mt-3 flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-white to-blue-50/60 px-6 text-center transition hover:border-blue-400 hover:bg-white"
        >
          {draft.logoDataUrl ? (
            <>
              <span className="flex size-28 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.logoDataUrl}
                  alt={`${draft.name || "Workspace"} logo preview`}
                  className="max-h-full max-w-full object-contain"
                />
              </span>
              <span className="mt-4 max-w-full truncate text-sm font-semibold text-slate-900">
                {draft.logoName || "Uploaded logo"}
              </span>
              <span className="mt-1 text-xs text-[#E7B66D]">
                Click or drop a file to replace
              </span>
            </>
          ) : (
            <>
              <span className="flex size-20 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                <ImageUp className="size-8 text-blue-500" strokeWidth={1.7} />
              </span>
              <span className="mt-5 text-sm font-semibold text-slate-900">
                Upload Logo
              </span>
              <span className="mt-2 text-xs text-slate-500">
                Drag &amp; drop or click to upload
              </span>
              <span className="mt-5 text-xs text-slate-500">
                JPG, PNG or SVG. Max 2 MB
              </span>
            </>
          )}
        </button>
        {logoError ? (
          <p className="mt-2 text-xs text-red-600">{logoError}</p>
        ) : null}
      </div>
    </div>
  );
}

function StepFrame({
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.08em] text-[#E7B66D] uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-[#F8F0E2] px-3 py-1 text-[10px] font-semibold text-[#0F1939]">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  single?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => {
        const active = selected.includes(option.id);
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option.id)}
            className={[
              "relative min-h-32 overflow-hidden rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B66D]/50",
              active
                ? "border-[#E7B66D] bg-white"
                : "border-slate-200 bg-white hover:border-slate-300",
            ].join(" ")}
          >
            {active ? (
              <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[#E7B66D] text-[#0F1939]">
                <Check className="size-3" strokeWidth={2.4} />
              </span>
            ) : null}
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${option.tone}`}
            >
              <Icon className="size-4.5" strokeWidth={1.8} />
            </span>
            <span className="mt-4 block text-sm font-semibold text-slate-900">
              {option.title}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-slate-500">
              {option.description}
            </span>
            {single ? <span className="sr-only">Single selection</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function InviteEditor({
  members,
  onChange,
}: {
  members: TeamInvite[];
  onChange: (members: TeamInvite[]) => void;
}) {
  const rows = members.length > 0 ? members : [emptyInvite()];

  function addMember() {
    onChange([...rows, emptyInvite()]);
  }

  function updateMember(id: string, patch: Partial<TeamInvite>) {
    onChange(
      rows.map((member) =>
        member.id === id ? { ...member, ...patch } : member,
      ),
    );
  }

  function removeMember(id: string) {
    const next = rows.filter((item) => item.id !== id);
    onChange(next.length > 0 ? next : [emptyInvite()]);
  }

  function applySuggestedRole(roleId: string) {
    const permission =
      roleId === "viewer"
        ? "view-only"
        : roleId === "owner" || roleId === "admin"
          ? "full-access"
          : "operations-access";
    const target =
      [...rows].reverse().find((member) => !member.role) ?? rows.at(-1);
    if (!target) {
      onChange([{ ...emptyInvite(), role: roleId, permission }]);
      return;
    }
    updateMember(target.id, { role: roleId, permission });
  }

  const selectedRoles = new Set(rows.map((member) => member.role).filter(Boolean));

  return (
    <div className="border-t border-[#e7e9f1] pt-7">
      <div>
        <h3 className="text-sm font-semibold text-[#151a2b]">
          Invite Members
        </h3>
        <p className="mt-1 text-xs text-[#526080]">
          You can add or invite team members now or do it later.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-[#e1e5ef] bg-white/45 p-4">
        <div className="space-y-4">
          {rows.map((member) => (
            <div
              key={member.id}
              className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(130px,0.72fr)_minmax(150px,0.86fr)_minmax(170px,1fr)_48px] xl:items-end"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#526080]">
                  Email address
                </span>
                <input
                  type="email"
                  value={member.email}
                  onChange={(event) =>
                    updateMember(member.id, { email: event.target.value })
                  }
                  placeholder="name@company.com"
                  className={INVITE_INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#526080]">
                  Nickname
                </span>
                <input
                  type="text"
                  value={member.nickname}
                  onChange={(event) =>
                    updateMember(member.id, { nickname: event.target.value })
                  }
                  placeholder="e.g. Soumik"
                  className={INVITE_INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#526080]">
                  Role
                </span>
                <span className="relative block">
                  <select
                    value={member.role}
                    onChange={(event) =>
                      updateMember(member.id, { role: event.target.value })
                    }
                    className={`${INVITE_INPUT_CLASS} appearance-none pr-10 text-[#526080]`}
                  >
                    <option value="">Select role</option>
                    {SUGGESTED_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#657091]" strokeWidth={1.8} />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#526080]">
                  Permission Level
                </span>
                <span className="relative block">
                  <select
                    value={member.permission}
                    onChange={(event) =>
                      updateMember(member.id, {
                        permission: event.target.value,
                      })
                    }
                    className={`${INVITE_INPUT_CLASS} appearance-none pr-10 text-[#526080]`}
                  >
                    <option value="full-access">Full access</option>
                    <option value="operations-access">Operations access</option>
                    <option value="view-only">View only</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#657091]" strokeWidth={1.8} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                aria-label={`Remove ${member.email || "team member"}`}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#dfe3ef] bg-white/65 text-[#657091] transition hover:border-[#ffcaca] hover:bg-[#fff7f7] hover:text-[#db5555]"
              >
                <Trash2 className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMember}
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-[#E7B66D]/50 bg-white/55 px-4 text-xs font-medium text-[#0F1939] transition hover:bg-[#F8F0E2] hover:text-[#0F1939]"
        >
          <Plus className="mr-2 size-4 text-[#E7B66D]" strokeWidth={1.8} />
          Add another member
        </button>
      </div>

      <div className="mt-7">
        <h3 className="text-sm font-semibold text-[#151a2b]">Suggested Roles</h3>
        <p className="mt-1 text-xs text-[#526080]">
          Choose a role to assign the right permissions.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {SUGGESTED_ROLES.map((role) => {
            const Icon = role.icon;
            const selected = selectedRoles.has(role.id);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => applySuggestedRole(role.id)}
                className={[
                  "relative flex min-h-[172px] flex-col rounded-xl border bg-white p-4 text-left transition",
                  selected
                    ? "border-[#E7B66D]"
                    : "border-[#e1e5ef] hover:border-[#E7B66D]/50",
                ].join(" ")}
              >
                {selected ? (
                  <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[#E7B66D] text-[#0F1939]">
                    <Check className="size-3" strokeWidth={2.4} />
                  </span>
                ) : null}
                <span
                  className={`flex size-10 items-center justify-center rounded-lg ${role.iconBackground}`}
                >
                  <Icon
                    className={`size-5 ${role.iconClassName}`}
                    strokeWidth={2}
                  />
                </span>
                <h4 className="mt-4 text-sm font-semibold text-[#151a2b]">
                  {role.title}
                </h4>
                <p className="mt-2 text-xs leading-5 text-[#526080]">
                  {role.description}
                </p>
                <span
                  className={`mt-auto w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${role.seatsClassName}`}
                >
                  {role.seats}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function emptyInvite(): TeamInvite {
  return {
    id: crypto.randomUUID(),
    email: "",
    nickname: "",
    role: "",
    permission: "full-access",
  };
}

function ReviewGrid({
  draft,
  onEdit,
  onUpdate,
  onResearch,
}: {
  draft: WorkspaceDraft;
  onEdit: (step: WizardStep) => void;
  onUpdate: (patch: Partial<WorkspaceDraft>) => void;
  onResearch: () => void;
}) {
  const type =
    WORKSPACE_TYPES.find((option) => option.id === draft.workspaceType)?.title ??
    draft.workspaceType;
  const initials =
    draft.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "WS";
  const inviteCount = draft.invitedMembers.filter(
    (member) => member.email.trim() || member.nickname.trim(),
  ).length;
  const teamSizeLabel = draft.teamSize ? `${draft.teamSize} people` : "Not set";
  const loading = draft.contextStatus === "loading";
  const website = draft.website.trim() || draft.contextSourceUrl;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onEdit(2)}
          className="flex w-full items-start gap-3 rounded-2xl border border-[#E7B66D]/55 bg-white p-4 text-left transition hover:border-[#E7B66D] hover:bg-[#F8F0E2]/30"
        >
          <ReviewMark initials={initials} logoUrl={draft.logoDataUrl} />
          <span className="min-w-0">
            <span className="block text-[11px] text-slate-400">
              Workspace profile
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-slate-950">
              {draft.name.trim() || "Untitled workspace"}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {type} • {teamSizeLabel}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(3)}
          className="flex w-full items-start gap-3 rounded-2xl border border-[#E7B66D]/55 bg-white p-4 text-left transition hover:border-[#E7B66D] hover:bg-[#F8F0E2]/30"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F8F0E2]">
            <UserRound className="size-5 text-[#E7B66D]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] text-slate-400">
              Team and Roles
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-950">
              {inviteCount === 0
                ? "Just you"
                : `${inviteCount} ${inviteCount === 1 ? "teammate" : "teammates"}`}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              You can invite more people from workspace settings.
            </span>
          </span>
        </button>

        {draft.contextApproved && draft.companyContext.trim() ? (
          <article className="rounded-2xl border border-[#E7B66D]/45 bg-[#F8F0E2]/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[#E7B66D] uppercase">
                Approved context
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E7B66D]/20 px-2 py-0.5 text-[10px] font-semibold text-[#0F1939]">
                <Check className="size-3" />
                Live
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {draft.companyContext.trim()}
            </p>
            {website ? (
              <a
                href={
                  /^https?:\/\//i.test(website) ? website : `https://${website}`
                }
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1939] underline-offset-2 hover:underline"
              >
                <Globe2 className="size-3.5 text-[#E7B66D]" />
                {website}
              </a>
            ) : null}
          </article>
        ) : null}
      </div>

      <section className="rounded-2xl border border-[#E7B66D]/40 bg-[#F8F0E2]/70 p-5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#E7B66D] uppercase">
          Company context
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">
          Build a shared company profile.
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Research the company website or enter the context manually.
        </p>

        {loading ? (
          <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E7B66D]/50 bg-white/70 px-6 text-center">
            <Loader2 className="size-8 animate-spin text-[#E7B66D]" />
            <p className="mt-4 text-sm font-semibold text-slate-900">
              Drafting company context…
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Drafting a profile from the workspace name, type, and website.
              You can edit it before approving.
            </p>
          </div>
        ) : (
          <label className="mt-5 block">
            <span className="text-xs font-semibold text-slate-700">
              Agent-ready workspace context
            </span>
            <textarea
              value={draft.companyContext}
              onChange={(event) =>
                onUpdate({
                  companyContext: event.target.value,
                  contextApproved: false,
                  contextStatus: event.target.value.trim() ? "ready" : "idle",
                })
              }
              rows={8}
              placeholder="Describe the company, its customers, business models and payment needs..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#E7B66D] focus:ring-4 focus:ring-[#E7B66D]/15"
            />
          </label>
        )}

        {draft.contextStatus === "error" && draft.contextError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            {draft.contextError} You can edit context manually or retry research.
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#EFE4D2]/80 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">Public Sources</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {website || "No public sources added"}
            </p>
          </div>
          {!website ? (
            <button
              type="button"
              onClick={() => onEdit(2)}
              className="shrink-0 text-xs font-semibold text-[#0F1939] underline-offset-2 hover:underline"
            >
              Add a website in profile for stronger result
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!draft.website.trim()) {
                onEdit(2);
                return;
              }
              onResearch();
            }}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-white/80 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            {loading ? "Researching…" : "Research Company"}
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ contextApproved: true })}
            disabled={!draft.companyContext.trim() || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundImage: BRAND_BUTTON_GRADIENT }}
          >
            <Check className="size-4" />
            {draft.contextApproved ? "Context approved" : "Approve Context"}
          </button>
        </div>

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-slate-500">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-[#E7B66D]" />
          Only approved context becomes shared workspace knowledge for Hypertron
          and future agents.
        </p>
      </section>
    </div>
  );
}

function ReviewMark({
  initials,
  logoUrl,
}: {
  initials: string;
  logoUrl: string;
}) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8F0E2] text-xs font-semibold text-[#0F1939]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

const INVITE_INPUT_CLASS =
  "h-12 w-full rounded-lg border border-[#dfe3ef] bg-white/65 px-4 text-sm text-[#151a2b] outline-none transition placeholder:text-[#8791aa] focus:border-[#E7B66D] focus:bg-white focus:ring-4 focus:ring-[#E7B66D]/15";

function validateStep(draft: WorkspaceDraft): string | null {
  if (draft.currentStep === 1 && !draft.workspaceType) {
    return "Choose a workspace type.";
  }
  if (draft.currentStep === 2) {
    if (draft.name.trim().length < 2) {
      return "Workspace name must be at least 2 characters.";
    }
    if (draft.website.trim() && !isHttpUrl(draft.website.trim())) {
      return "Website must be a valid http(s) URL.";
    }
  }
  if (
    draft.currentStep === 3 &&
    draft.invitedMembers.some(
      (member) => member.email.trim() && !isEmail(member.email.trim()),
    )
  ) {
    return "Enter a valid email address for each teammate.";
  }
  return null;
}

function validateAll(
  draft: WorkspaceDraft,
): { step: WizardStep; message: string } | null {
  for (let step = 1; step <= 3; step += 1) {
    const message = validateStep({
      ...draft,
      currentStep: step as WizardStep,
    });
    if (message) return { step: step as WizardStep, message };
  }
  return null;
}

function normalizeDraft(value: Partial<WorkspaceDraft>): WorkspaceDraft {
  const currentStep =
    typeof value.currentStep === "number" &&
    value.currentStep >= 1 &&
    value.currentStep <= 4
      ? (value.currentStep as WizardStep)
      : 4;
  return {
    ...DEFAULT_DRAFT,
    ...value,
    currentStep,
    logoDataUrl:
      typeof value.logoDataUrl === "string" ? value.logoDataUrl : "",
    logoName: typeof value.logoName === "string" ? value.logoName : "",
    invitedMembers: Array.isArray(value.invitedMembers)
      ? value.invitedMembers.slice(0, 25)
      : DEFAULT_DRAFT.invitedMembers,
    companyContext:
      typeof value.companyContext === "string" ? value.companyContext : "",
    contextApproved: value.contextApproved === true,
    contextStatus:
      value.contextStatus === "ready" ||
      value.contextStatus === "error" ||
      value.contextStatus === "idle" ||
      value.contextStatus === "loading"
        ? value.contextStatus === "loading"
          ? "idle"
          : value.contextStatus
        : value.companyContext
          ? "ready"
          : "idle",
    contextError: typeof value.contextError === "string" ? value.contextError : "",
    contextSourceUrl:
      typeof value.contextSourceUrl === "string" ? value.contextSourceUrl : "",
  };
}

function normalizeWebsiteKey(value: string) {
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    return `${url.hostname.replace(/^www\./i, "")}${url.pathname}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return value.trim().toLowerCase();
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

