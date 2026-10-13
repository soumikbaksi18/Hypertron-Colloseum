import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe2,
  ImageUp,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { setAccountKind } from '../lib/account-kind';
import { subscribeToWorkspace } from '../lib/workspace-subscription';
import { sessionApi } from '../lib/session';
import { saveWorkspace } from '../lib/workspaces';
import { AccountKindSetup } from './account-kind-setup';
import { DashboardChrome } from './chrome';
import { cn } from './cn';
import { PrivacyOnboardingGate } from './privacy-onboarding-gate';
import { HUB_NAV } from './setup-nav';
import {
  ACCOUNT_KINDS,
  BUSINESS_STEPS,
  DEFAULT_DRAFT,
  INDIVIDUAL_STEPS,
  SUGGESTED_ROLES,
  WORKSPACE_TYPES,
  type Option,
  type TeamInvite,
  type WizardStep,
  type WorkspaceDraft,
} from './workspace-create-options';

const DRAFT_KEY = 'hypertron:create-workspace:draft:v6';
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_DATA_URL_LENGTH = 600_000;
const INVITE_INPUT_CLASS =
  'h-12 w-full rounded-lg border border-[#C3D0E8]/35 bg-transparent px-4 text-sm text-[#EEF4FF] outline-none transition placeholder:text-[#C3D0E8]/35 focus:border-[#C3D0E8]/70';

function stepsFor(draft: WorkspaceDraft): readonly string[] {
  if (draft.accountKind === 'individual') return INDIVIDUAL_STEPS;
  if (draft.accountKind === 'business') return BUSINESS_STEPS;
  return ['Account type'];
}

function lastStep(draft: WorkspaceDraft): WizardStep {
  return draft.accountKind === 'individual' ? 2 : 5;
}

export function WorkspaceCreateWizard() {
  const navigate = useNavigate();
  const { session, refresh } = useWalletSession();
  const [draft, setDraft] = useState<WorkspaceDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const steps = stepsFor(draft);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<WorkspaceDraft>;
          setDraft({
            ...DEFAULT_DRAFT,
            ...parsed,
            currentStep:
              parsed.currentStep === 1 ||
              parsed.currentStep === 2 ||
              parsed.currentStep === 3 ||
              parsed.currentStep === 4 ||
              parsed.currentStep === 5
                ? parsed.currentStep
                : 1,
          });
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

  function update(patch: Partial<WorkspaceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function goTo(step: WizardStep) {
    update({ currentStep: step });
  }

  function goNext() {
    const validationError = validateStep(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (draft.currentStep < lastStep(draft)) {
      goTo((draft.currentStep + 1) as WizardStep);
    }
  }

  function goBack() {
    if (draft.currentStep === 1) {
      navigate('/app');
      return;
    }
    goTo((draft.currentStep - 1) as WizardStep);
  }

  async function submit() {
    if (!session || submitting) return;
    const validationError = validateStep({
      ...draft,
      currentStep: lastStep(draft),
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const invitedCount = draft.invitedMembers.filter(
        (member) => member.email.trim() || member.nickname.trim(),
      ).length;
      const accountKind =
        draft.accountKind === 'individual' ? 'individual' : 'business';
      setAccountKind(session.wallet_address, accountKind);
      if (accountKind === 'business') subscribeToWorkspace(session.wallet_address);
      const created = saveWorkspace(session, {
        accountKind,
        name: draft.name.trim(),
        workspaceType:
          accountKind === 'individual' ? 'individual' : draft.workspaceType,
        website: draft.website,
        teamSize: accountKind === 'individual' ? '1-5' : draft.teamSize,
        logoDataUrl: draft.logoDataUrl,
        invitedCount: accountKind === 'individual' ? 0 : invitedCount,
      });
      await sessionApi.updateMe({ name: created.name }).catch(() => undefined);
      await refresh().catch(() => undefined);
      sessionStorage.removeItem(DRAFT_KEY);
      navigate(
        accountKind === 'individual' ? '/app?space=personal' : `/app/w/${created.id}`,
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this workspace.');
      setSubmitting(false);
    }
  }

  const onPrimary =
    draft.currentStep === lastStep(draft) ? () => void submit() : goNext;

  const identityTitle =
    (session?.name ?? '').trim() ||
    session?.handle?.trim() ||
    'Personal';

  if (hydrated && draft.currentStep === 1 && session) {
    return (
      <PrivacyOnboardingGate>
        <DashboardChrome
          variant="canvas"
          navItems={HUB_NAV}
          activeId=""
          onSelect={(id) => {
            if (id === 'billing' || id === 'settings') navigate(`/app?tab=${id}`);
          }}
          breadcrumb={[
            { label: 'App', onSelect: () => navigate('/app') },
            { label: 'Setup' },
          ]}
          searchPlaceholder="Search setup..."
          identity={{
            title: identityTitle,
            subtitle: session.handle ?? session.wallet_address,
          }}
        >
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
            >
              {error}
            </p>
          ) : null}
          <AccountKindSetup
            selected={
              draft.accountKind === 'individual' || draft.accountKind === 'business'
                ? draft.accountKind
                : null
            }
            onSelect={(kind) => update({ accountKind: kind, currentStep: 1 })}
            onContinue={goNext}
            continueDisabled={
              draft.accountKind !== 'individual' && draft.accountKind !== 'business'
            }
            continueLabel="Continue"
          />
        </DashboardChrome>
      </PrivacyOnboardingGate>
    );
  }

  return (
    <PrivacyOnboardingGate>
      <DashboardChrome
        variant="canvas"
        navItems={HUB_NAV}
        activeId=""
        onSelect={(id) => {
          if (id === 'billing' || id === 'settings') navigate(`/app?tab=${id}`);
        }}
        breadcrumb={[
          { label: 'App', onSelect: () => navigate('/app') },
          { label: 'Setup' },
        ]}
        searchPlaceholder="Search setup..."
        identity={{
          title: identityTitle,
          subtitle: session?.handle ?? session?.wallet_address ?? '',
        }}
      >
        <div className="flex w-full flex-col pb-6">
          <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
            {steps[draft.currentStep - 1] ?? 'Setup'}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h1 className="dash-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
              Let’s get you set up.
            </h1>
            <p className="text-sm text-[#C3D0E8]/70">
              Step {draft.currentStep} of {steps.length}
            </p>
          </div>

          <div className="mt-8 flex flex-col lg:flex-row">
            <ProgressRail steps={steps} currentStep={draft.currentStep} onSelect={goTo} />
            <div className="ov-card z-10 -mt-px flex min-w-0 flex-[1.4] flex-col lg:mt-0 lg:-ml-px">
              <StepContent draft={draft} setDraft={setDraft} onEdit={goTo} />
              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                >
                  {error}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#C3D0E8]/25 pt-5">
                <p className="hidden items-center gap-2 text-xs text-[#C3D0E8]/55 sm:flex">
                  <ShieldCheck className="size-4 text-[#c9b56a]" />
                  You can update these choices later in workspace settings.
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#C3D0E8]/35 px-4 text-sm text-[#C3D0E8] transition hover:border-[#C3D0E8]/70 hover:text-[#EEF4FF]"
                  >
                    <ArrowLeft className="size-4" />
                    {draft.currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  <button
                    type="button"
                    onClick={onPrimary}
                    disabled={submitting}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#ffe500] px-5 text-sm font-medium text-[#14110e] transition hover:bg-[#fff36a] disabled:cursor-wait disabled:opacity-60"
                  >
                    {draft.currentStep === lastStep(draft)
                      ? submitting
                        ? 'Creating…'
                        : 'Create workspace'
                      : 'Continue'}
                    {!submitting ? <ArrowRight className="size-4" /> : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardChrome>
    </PrivacyOnboardingGate>
  );
}

function ProgressRail({
  steps,
  currentStep,
  onSelect,
}: {
  steps: readonly string[];
  currentStep: WizardStep;
  onSelect: (step: WizardStep) => void;
}) {
  return (
    <aside className="ov-card flex min-w-0 flex-col lg:w-[240px] lg:shrink-0">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-[#c9b56a] uppercase">
        New workspace
      </p>
      <p className="mt-2 text-sm leading-5 text-[#C3D0E8]/70">
        Step {currentStep} of {steps.length}. Every choice can be changed later.
      </p>

      <ol className="relative mt-5">
        {steps.map((label, index) => {
          const step = (index + 1) as WizardStep;
          const active = step === currentStep;
          const complete = step < currentStep;
          return (
            <li
              key={label}
              className="relative grid h-[70px] grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[calc(50%+1rem)] left-4 h-[38px] w-0.5 -translate-x-1/2',
                    complete ? 'bg-[#c9b56a]' : 'bg-[#C3D0E8]/25',
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full text-[10px] font-semibold tracking-wide',
                  active
                    ? 'bg-[#ffe500] text-[#14110e]'
                    : complete
                      ? 'border border-[#c9b56a] bg-[#c9b56a]/12 text-[#c9b56a]'
                      : 'border border-[#C3D0E8]/35 bg-transparent text-[#C3D0E8]/45',
                )}
              >
                {complete ? <Check className="size-3.5" /> : String(step).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => complete && onSelect(step)}
                disabled={!complete}
                className={cn(
                  'min-w-0 rounded-md px-2.5 py-1 text-left transition disabled:cursor-default',
                  active ? 'bg-transparent/[0.04]' : '',
                )}
              >
                <span
                  className={cn(
                    'block text-sm font-medium',
                    active ? 'text-[#c9b56a]' : complete ? 'text-[#EEF4FF]' : 'text-[#C3D0E8]/45',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

    </aside>
  );
}

function StepContent({
  draft,
  setDraft,
  onEdit,
}: {
  draft: WorkspaceDraft;
  setDraft: Dispatch<SetStateAction<WorkspaceDraft>>;
  onEdit: (step: WizardStep) => void;
}) {
  function update(patch: Partial<WorkspaceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  if (draft.currentStep === 1) {
    return (
      <StepFrame
        eyebrow="Step 1"
        title="Are you a business or an individual?"
        description="This chooses the setup path. Businesses get the full workspace wizard."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT_KINDS.map((option) => {
            const active = draft.accountKind === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  update({
                    accountKind: option.id as 'business' | 'individual',
                    currentStep: 1,
                  })
                }
                className={cn(
                  'relative min-h-40 overflow-hidden rounded-2xl border p-5 text-left transition',
                  active
                    ? 'border-[#c9b56a] bg-transparent ring-1 ring-[#c9b56a]/40'
                    : 'border-[#C3D0E8]/35 bg-transparent hover:border-[#C3D0E8]/45',
                )}
              >
                {active ? (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[#ffe500] text-[#14110e]">
                    <Check className="size-3" strokeWidth={2.4} />
                  </span>
                ) : null}
                <span className={cn('flex size-11 items-center justify-center rounded-xl', option.tone)}>
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="mt-5 block text-lg font-semibold text-[#EEF4FF]">
                  {option.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-[#C3D0E8]/55">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </StepFrame>
    );
  }

  if (draft.accountKind === 'individual') {
    return (
      <StepFrame
        eyebrow="Your profile"
        title="What should we call this workspace?"
        description="Use your name or a personal handle. You can change it later."
      >
        <label className="block max-w-xl">
          <span className="text-sm font-semibold text-[#EEF4FF]">Display name</span>
          <span className="relative mt-3 block">
            <input
              autoFocus
              type="text"
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="e.g. Alex"
              maxLength={80}
              className="h-14 w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 pr-12 text-sm text-[#EEF4FF] outline-none transition focus:border-[#C3D0E8]"
            />
            {draft.name.trim() ? (
              <CheckCircle2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-emerald-500" />
            ) : null}
          </span>
        </label>
      </StepFrame>
    );
  }

  switch (draft.currentStep) {
    case 2:
      return (
        <StepFrame
          eyebrow="Workspace type"
          title="What are you building?"
          description="This helps us personalize your workspace experience."
        >
          <OptionGrid
            options={WORKSPACE_TYPES}
            selected={[draft.workspaceType]}
            onToggle={(id) => update({ workspaceType: id })}
          />
        </StepFrame>
      );
    case 3:
      return (
        <StepFrame
          eyebrow="Workspace details"
          title="Let's set up the basics"
          description="You can always change these later."
        >
          <WorkspaceDetailsStep draft={draft} onUpdate={update} />
        </StepFrame>
      );
    case 4:
      return (
        <StepFrame
          eyebrow="Invite team"
          title="Invite your team"
          description="Add team members who will collaborate in this workspace."
        >
          <InviteEditor
            members={draft.invitedMembers}
            onChange={(invitedMembers) => update({ invitedMembers })}
          />
        </StepFrame>
      );
    case 5:
      return (
        <StepFrame
          eyebrow="Review"
          title="Review the workspace before creating it"
          description="Confirm the basics. You can invite more people from settings later."
        >
          <ReviewGrid draft={draft} onEdit={onEdit} />
        </StepFrame>
      );
    default:
      return null;
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
  const [logoError, setLogoError] = useState('');

  function handleLogoFile(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Upload a JPG, PNG, or SVG file.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError('Logo must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      if (reader.result.length > MAX_LOGO_DATA_URL_LENGTH) {
        setLogoError('Logo is too large after encoding. Use a smaller file.');
        return;
      }
      onUpdate({ logoDataUrl: reader.result, logoName: file.name });
      setLogoError('');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-7">
        <label className="block">
          <span className="text-sm font-semibold text-[#EEF4FF]">Business Name</span>
          <span className="mt-1 block text-xs text-[#C3D0E8]/55">
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
              className="h-14 w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 pr-12 text-sm text-[#EEF4FF] outline-none transition focus:border-[#C3D0E8]"
            />
            {draft.name.trim() ? (
              <CheckCircle2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-emerald-500" />
            ) : null}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#EEF4FF]">Website Link</span>
          <span className="mt-1 block text-xs text-[#C3D0E8]/55">
            Optional. Add the website your team uses for this workspace.
          </span>
          <span className="relative mt-3 block">
            <Globe2 className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#C3D0E8]/45" />
            <input
              type="url"
              value={draft.website}
              onChange={(event) => onUpdate({ website: event.target.value })}
              placeholder="https://yourcompany.xyz"
              className="h-14 w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent pr-4 pl-11 text-sm text-[#EEF4FF] outline-none transition focus:border-[#C3D0E8]"
            />
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-[#EEF4FF]">Team Size</legend>
          <p className="mt-1 text-xs text-[#C3D0E8]/55">Helps us tailor your experience.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['1-5', '5-20', '20-50', '50+'].map((size) => {
              const selected = draft.teamSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdate({ teamSize: size })}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition',
                    selected
                      ? 'border-[#c9b56a] bg-[#c9b56a]/12 text-[#EEF4FF] ring-1 ring-[#c9b56a]/40'
                      : 'border-[#C3D0E8]/35 bg-transparent text-[#C3D0E8]/70 hover:border-[#C3D0E8]/45',
                  )}
                >
                  <Users className="size-4" />
                  {size === '1-5' ? '1 - 5' : size === '5-20' ? '5 - 20' : size === '20-50' ? '20 - 50' : '50+'}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#EEF4FF]">
          Logo <span className="font-normal text-[#C3D0E8]/55">(Optional)</span>
        </h3>
        <p className="mt-1 text-xs text-[#C3D0E8]/55">Upload your logo to personalize your workspace.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            handleLogoFile(event.target.files?.[0]);
            event.target.value = '';
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event: DragEvent<HTMLButtonElement>) => {
            event.preventDefault();
            handleLogoFile(event.dataTransfer.files?.[0]);
          }}
          className="mt-3 flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#C3D0E8]/45 bg-transparent px-6 text-center transition hover:border-[#C3D0E8]/70"
        >
          {draft.logoDataUrl ? (
            <>
              <span className="flex size-28 items-center justify-center overflow-hidden rounded-2xl border border-[#C3D0E8]/35 bg-transparent p-3">
                <img
                  src={draft.logoDataUrl}
                  alt={`${draft.name || 'Workspace'} logo preview`}
                  className="max-h-full max-w-full object-contain"
                />
              </span>
              <span className="mt-4 max-w-full truncate text-sm font-semibold text-[#EEF4FF]">
                {draft.logoName || 'Uploaded logo'}
              </span>
            </>
          ) : (
            <>
              <span className="flex size-20 items-center justify-center rounded-2xl border border-[#C3D0E8]/35">
                <ImageUp className="size-8 text-[#c9b56a]" strokeWidth={1.7} />
              </span>
              <span className="mt-5 text-sm font-semibold text-[#EEF4FF]">Upload Logo</span>
              <span className="mt-2 text-xs text-[#C3D0E8]/55">Drag & drop or click to upload</span>
              <span className="mt-5 text-xs text-[#C3D0E8]/55">JPG, PNG or SVG. Max 2 MB</span>
            </>
          )}
        </button>
        {logoError ? <p className="mt-2 text-xs text-red-600">{logoError}</p> : null}
      </div>
    </div>
  );
}

function StepFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
        {eyebrow}
      </p>
      <h2 className="dash-display mt-3 text-[clamp(1.6rem,2vw,2rem)] leading-[1.05] text-[#EEF4FF]">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">{description}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
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
            className={cn(
              'relative min-h-32 overflow-hidden rounded-xl border p-4 text-left transition',
              active ? 'border-[#c9b56a] bg-transparent' : 'border-[#C3D0E8]/35 bg-transparent hover:border-[#C3D0E8]/45',
            )}
          >
            {active ? (
              <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-[#ffe500] text-[#14110e]">
                <Check className="size-3" strokeWidth={2.4} />
              </span>
            ) : null}
            <span className={`flex size-9 items-center justify-center rounded-lg ${option.tone}`}>
              <Icon className="size-4" strokeWidth={1.8} />
            </span>
            <span className="mt-4 block text-sm font-semibold text-[#EEF4FF]">{option.title}</span>
            <span className="mt-1 block text-[11px] leading-4 text-[#C3D0E8]/55">
              {option.description}
            </span>
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

  function updateMember(id: string, patch: Partial<TeamInvite>) {
    onChange(rows.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  }

  function removeMember(id: string) {
    const next = rows.filter((item) => item.id !== id);
    onChange(next.length > 0 ? next : [emptyInvite()]);
  }

  function applySuggestedRole(roleId: string) {
    const permission =
      roleId === 'viewer'
        ? 'view-only'
        : roleId === 'owner' || roleId === 'admin'
          ? 'full-access'
          : 'operations-access';
    const target = [...rows].reverse().find((member) => !member.role) ?? rows.at(-1);
    if (!target) {
      onChange([{ ...emptyInvite(), role: roleId, permission }]);
      return;
    }
    updateMember(target.id, { role: roleId, permission });
  }

  const selectedRoles = new Set(rows.map((member) => member.role).filter(Boolean));

  return (
    <div className="border-t border-[#C3D0E8]/25 pt-7">
      <h3 className="text-sm font-semibold text-[#EEF4FF]">Invite Members</h3>
      <p className="mt-1 text-xs text-[#C3D0E8]/70">You can add teammates now or do it later.</p>

      <div className="mt-5 rounded-xl border border-[#C3D0E8]/35 bg-transparent p-4">
        <div className="space-y-4">
          {rows.map((member) => (
            <div
              key={member.id}
              className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(130px,0.72fr)_minmax(150px,0.86fr)_minmax(170px,1fr)_48px] xl:items-end"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#C3D0E8]/70">Email address</span>
                <input
                  type="email"
                  value={member.email}
                  onChange={(event) => updateMember(member.id, { email: event.target.value })}
                  placeholder="name@company.com"
                  className={INVITE_INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#C3D0E8]/70">Nickname</span>
                <input
                  type="text"
                  value={member.nickname}
                  onChange={(event) => updateMember(member.id, { nickname: event.target.value })}
                  placeholder="e.g. Soumik"
                  className={INVITE_INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#C3D0E8]/70">Role</span>
                <span className="relative block">
                  <select
                    value={member.role}
                    onChange={(event) => updateMember(member.id, { role: event.target.value })}
                    className={`${INVITE_INPUT_CLASS} appearance-none pr-10 text-[#C3D0E8]/70`}
                  >
                    <option value="">Select role</option>
                    {SUGGESTED_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#C3D0E8]/55" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#C3D0E8]/70">
                  Permission Level
                </span>
                <span className="relative block">
                  <select
                    value={member.permission}
                    onChange={(event) =>
                      updateMember(member.id, { permission: event.target.value })
                    }
                    className={`${INVITE_INPUT_CLASS} appearance-none pr-10 text-[#C3D0E8]/70`}
                  >
                    <option value="full-access">Full access</option>
                    <option value="operations-access">Operations access</option>
                    <option value="view-only">View only</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#C3D0E8]/55" />
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#C3D0E8]/35 bg-transparent text-[#C3D0E8]/55 transition hover:border-[#ffcaca] hover:text-[#db5555]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange([...rows, emptyInvite()])}
          className="mt-4 inline-flex h-10 items-center rounded-full border border-[#C3D0E8]/45 bg-transparent px-4 text-xs font-medium text-[#EEF4FF] transition hover:border-[#c9b56a]/50"
        >
          <Plus className="mr-2 size-4 text-[#c9b56a]" />
          Add another member
        </button>
      </div>

      <div className="mt-7">
        <h3 className="text-sm font-semibold text-[#EEF4FF]">Suggested Roles</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {SUGGESTED_ROLES.map((role) => {
            const Icon = role.icon;
            const selected = selectedRoles.has(role.id);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => applySuggestedRole(role.id)}
                className={cn(
                  'relative flex min-h-[172px] flex-col rounded-xl border bg-transparent p-4 text-left transition',
                  selected ? 'border-[#c9b56a]' : 'border-[#C3D0E8]/35 hover:border-[#C3D0E8]/45',
                )}
              >
                <span className={`flex size-10 items-center justify-center rounded-lg ${role.iconBackground}`}>
                  <Icon className={`size-5 ${role.iconClassName}`} strokeWidth={2} />
                </span>
                <h4 className="mt-4 text-sm font-semibold text-[#EEF4FF]">{role.title}</h4>
                <p className="mt-2 text-xs leading-5 text-[#C3D0E8]/70">{role.description}</p>
                <span className={`mt-auto w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${role.seatsClassName}`}>
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
    email: '',
    nickname: '',
    role: '',
    permission: 'full-access',
  };
}

function ReviewGrid({
  draft,
  onEdit,
}: {
  draft: WorkspaceDraft;
  onEdit: (step: WizardStep) => void;
}) {
  const type =
    WORKSPACE_TYPES.find((option) => option.id === draft.workspaceType)?.title ??
    draft.workspaceType;
  const initials =
    draft.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'WS';
  const inviteCount = draft.invitedMembers.filter(
    (member) => member.email.trim() || member.nickname.trim(),
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onEdit(3)}
        className="flex w-full items-start gap-3 rounded-2xl border border-[#C3D0E8]/45 bg-transparent p-4 text-left transition hover:bg-[#c9b56a]/10"
      >
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#C3D0E8]/35 text-xs font-semibold text-[#EEF4FF]">
          {draft.logoDataUrl ? (
            <img src={draft.logoDataUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] text-[#C3D0E8]/45">Workspace profile</span>
          <span className="mt-1 block truncate text-sm font-semibold text-[#EEF4FF]">
            {draft.name.trim() || 'Untitled workspace'}
          </span>
          <span className="mt-1 block text-xs text-[#C3D0E8]/55">
            {type} • {draft.teamSize ? `${draft.teamSize} people` : 'Not set'}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEdit(4)}
        className="flex w-full items-start gap-3 rounded-2xl border border-[#C3D0E8]/45 bg-transparent p-4 text-left transition hover:bg-[#c9b56a]/10"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#c9b56a]/12">
          <UserRound className="size-5 text-[#c9b56a]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] text-[#C3D0E8]/45">Team and Roles</span>
          <span className="mt-1 block text-sm font-semibold text-[#EEF4FF]">
            {inviteCount === 0
              ? 'Just you'
              : `${inviteCount} ${inviteCount === 1 ? 'teammate' : 'teammates'}`}
          </span>
          <span className="mt-1 block text-xs text-[#C3D0E8]/55">
            You can invite more people from workspace settings.
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEdit(1)}
        className="flex w-full items-start gap-3 rounded-2xl border border-[#C3D0E8]/45 bg-transparent p-4 text-left md:col-span-2"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#c9b56a]/12">
          <BriefcaseBusiness className="size-5 text-[#c9b56a]" />
        </span>
        <span>
          <span className="block text-[11px] text-[#C3D0E8]/45">Account type</span>
          <span className="mt-1 block text-sm font-semibold text-[#EEF4FF]">Business</span>
        </span>
      </button>
    </div>
  );
}

function validateStep(draft: WorkspaceDraft): string | null {
  if (draft.currentStep === 1 && !draft.accountKind) {
    return 'Choose business or individual to continue.';
  }
  if (draft.accountKind === 'individual' && draft.currentStep === 2) {
    if (draft.name.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }
  }
  if (draft.accountKind === 'business') {
    if (draft.currentStep === 2 && !draft.workspaceType) {
      return 'Choose a workspace type.';
    }
    if (draft.currentStep === 3 || draft.currentStep === 5) {
      if (draft.name.trim().length < 2) {
        return 'Workspace name must be at least 2 characters.';
      }
      if (draft.website.trim() && !isHttpUrl(draft.website.trim())) {
        return 'Website must be a valid http(s) URL.';
      }
    }
    if (
      draft.currentStep === 4 &&
      draft.invitedMembers.some(
        (member) => member.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim()),
      )
    ) {
      return 'Enter a valid email address for each teammate.';
    }
  }
  return null;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
