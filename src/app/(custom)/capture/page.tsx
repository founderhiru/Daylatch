// @polsia:user-owned — mobile Capture experience (Phase 1.3, extended for
// the mobile-first intelligence brief's Phase 3/4). Reuses the EXACT same
// backend as the desktop /try tool (src/components/custom/intake-workspace.tsx):
// POST /api/intake for extraction, POST /api/intake/confirm for the explicit
// save step. No second intake backend, no new contract fields beyond what
// src/lib/contracts/intake.ts already declares.
//
// Five capture methods are presented (Scan/Upload/Share/Tell/Type) per the
// product brief, but only three are wired to real behavior in this phase:
//   - Type: unchanged text flow.
//   - Scan / Upload: both resolve to an image file -> POST /api/intake with
//     imageDataUrl -> src/lib/business/intake.ts's extractIntakeFromImage().
//     PDFs are explicitly rejected client-side (see PDF NOTE on that
//     function) rather than silently mishandled.
//   - Share / Tell: intentionally inert "coming soon" tiles. Web Share
//     Target and voice capture are separate, later phases (8 and 9) — see
//     AGENTS.md and the phase brief. They are shown (not hidden) so the
//     product's eventual shape is visible, per "design the IA, don't build
//     everything at once."
'use client';

import { ArrowLeft, Camera, Check, Mic, Share2, Sparkles, Type, Upload } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { StatusChip } from '@/components/custom/daylatch-primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import { HouseholdItem } from '@/lib/contracts/household';
import {
  INTAKE_IMAGE_MAX_LENGTH,
  type IntakeConfidence,
  IntakeCreate,
  type IntakeKind,
  IntakeResult,
  type IntakeResult as IntakeResultType,
} from '@/lib/contracts/intake';
import { IntakeConfirm } from '@/lib/contracts/intake-to-responsibility';
import { type ResponsibilityDomain, ResponsibilityItem } from '@/lib/contracts/responsibility';

const DOMAIN_OPTIONS: { value: ResponsibilityDomain; label: string }[] = [
  { value: 'other', label: 'Other' },
  { value: 'car', label: 'Car' },
  { value: 'school', label: 'School' },
  { value: 'health', label: 'Health' },
  { value: 'home', label: 'Home' },
  { value: 'finance', label: 'Finance' },
  { value: 'travel', label: 'Travel' },
];

const CATEGORY_LABEL: Record<IntakeResultType['category'], string> = {
  email: 'Email',
  bill: 'Bill',
  form: 'Form',
  receipt: 'Receipt',
  appointment: 'Appointment',
  other: 'Other',
};

const KIND_LABEL: Record<IntakeKind, string> = {
  information: 'Information',
  event: 'Event',
  responsibility: 'Responsibility',
  payment: 'Payment',
  waiting_item: 'Waiting on someone',
  renewal: 'Renewal',
  reference: 'Reference',
};

const CONFIDENCE_TONE: Record<IntakeConfidence, 'handled' | 'neutral' | 'attention'> = {
  high: 'handled',
  medium: 'neutral',
  low: 'attention',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Low priority',
  2: 'Medium priority',
  3: 'High priority',
};

type CaptureMode = 'chooser' | 'type' | 'image';

/** Reads a File as a base64 data: URL, for the Scan/Upload paths — kept as
 * one small helper rather than a library dependency for a single call site. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

export default function CapturePage() {
  const [mode, setMode] = useState<CaptureMode>('chooser');

  const [sourceText, setSourceText] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isUnderstanding, setIsUnderstanding] = useState(false);
  const [draft, setDraft] = useState<IntakeResultType | null>(null);
  const [draftSourceType, setDraftSourceType] = useState<'pasted_text' | 'document_upload'>(
    'pasted_text',
  );

  // Image-capture state: the picked file and a preview URL for the review
  // screen. imageDataUrl (the base64 payload actually sent to the API) is
  // held separately so the preview can use a cheap object URL instead.
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [household, setHousehold] = useState<HouseholdItem | null>(null);
  const [domain, setDomain] = useState<ResponsibilityDomain>('other');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<ResponsibilityItem | null>(null);

  useEffect(() => {
    apiFetch('/api/household', { schema: HouseholdItem })
      .then(setHousehold)
      .catch(() => undefined); // Non-fatal — capture still works without owner options.
  }, []);

  // Release the object URL used for the image preview when it's replaced or
  // the component unmounts, so we don't leak blob URLs across captures.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const applyDraft = (result: IntakeResultType) => {
    setDraft(result);
    setDomain('other');
    setOwnerId(result.suggestedOwnerId);
    setProviderName('');
    setSaved(null);
  };

  const handleUnderstand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = IntakeCreate.safeParse({ sourceText });
    if (!parsed.success) {
      setSourceError(parsed.error.issues[0]?.message ?? "Tell Daylatch what's on your plate.");
      return;
    }

    setSourceError(null);
    setIsUnderstanding(true);
    try {
      const result = await apiFetch<IntakeResultType>('/api/intake', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
        schema: IntakeResult,
      });
      setDraftSourceType('pasted_text');
      applyDraft(result);
    } catch {
      toast.error("Daylatch couldn't read that yet. Please try again.");
    } finally {
      setIsUnderstanding(false);
    }
  };

  const handleFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-picking the same file later
    if (!file) return;

    if (file.type === 'application/pdf') {
      toast.error("PDFs aren't supported yet — try a screenshot or photo of the document instead.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a photo, screenshot, or image file.');
      return;
    }
    // Rough pre-check before base64 encoding grows the payload ~33%.
    if (file.size > INTAKE_IMAGE_MAX_LENGTH * 0.7) {
      toast.error('That image is too large. Try a smaller photo or a cropped screenshot.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
      setImagePreviewUrl(URL.createObjectURL(file));
      setImageCaption('');
      setMode('image');
    } catch {
      toast.error('Could not read that file. Please try again.');
    }
  };

  const handleUnderstandImage = async () => {
    if (!imageDataUrl) return;
    const parsed = IntakeCreate.safeParse({ sourceText: imageCaption, imageDataUrl });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Could not process that image.');
      return;
    }

    setIsUnderstanding(true);
    try {
      const result = await apiFetch<IntakeResultType>('/api/intake', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
        schema: IntakeResult,
      });
      setDraftSourceType('document_upload');
      applyDraft(result);
    } catch {
      toast.error("Daylatch couldn't read that image yet. Please try again.");
    } finally {
      setIsUnderstanding(false);
    }
  };

  const handleConfirm = async () => {
    if (!draft) return;
    const parsed = IntakeConfirm.safeParse({
      summary: draft.summary,
      category: draft.category,
      domain,
      deadline: draft.deadline,
      nextStep: draft.nextStep,
      missingInformation: draft.missingInformation,
      ownerId,
      providerName: providerName.trim() || undefined,
      priority: draft.priority,
      amount: draft.amount,
      sourceType: draftSourceType,
    });
    if (!parsed.success) {
      toast.error('Something needs fixing before this can be saved.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await apiFetch<ResponsibilityItem>('/api/intake/confirm', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
        schema: ResponsibilityItem,
      });
      setSaved(created);
      toast.success('Added to your household.');
    } catch {
      toast.error('Could not save that right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const startOver = () => {
    setMode('chooser');
    setSourceText('');
    setSourceError(null);
    setDraft(null);
    setSaved(null);
    setDomain('other');
    setOwnerId(null);
    setProviderName('');
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageDataUrl(null);
    setImagePreviewUrl(null);
    setImageCaption('');
  };

  const suggestedOwnerName = draft?.suggestedOwnerId
    ? (household?.members ?? []).find((m) => m.id === draft.suggestedOwnerId)?.displayName
    : null;

  return (
    <main className="container-page mx-auto max-w-lg py-8 pb-28 md:pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
      </Link>

      {/* Hidden file inputs for Scan (camera-preferring) and Upload — one
          shared handler, since both resolve to the same image path. */}
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilePicked}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFilePicked}
      />

      {saved ? (
        // --- Confirmation state ---
        <div className="mt-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-handled-soft text-handled">
            <Check className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-h4 tracking-tight">Added to your household</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">“{saved.title}”</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={startOver}>
              Add another
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go home</Link>
            </Button>
          </div>
        </div>
      ) : mode === 'chooser' ? (
        // --- Step 0: "Give Daylatch something" chooser ---
        <div className="mt-8">
          <h1 className="font-display text-h4 tracking-tight text-balance">
            Give Daylatch something
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            A photo, a screenshot, or just tell Daylatch what's going on — it'll work out the rest.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ChooserTile icon={Camera} label="Scan" onClick={() => scanInputRef.current?.click()} />
            <ChooserTile
              icon={Upload}
              label="Upload"
              onClick={() => uploadInputRef.current?.click()}
            />
            <ChooserTile icon={Share2} label="Share" disabled comingSoon />
            <ChooserTile icon={Mic} label="Tell" disabled comingSoon />
          </div>
          <button
            type="button"
            onClick={() => setMode('type')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-[13.5px] font-medium transition-colors active:bg-secondary"
          >
            <Type className="size-4" aria-hidden="true" /> Type it out
          </button>
        </div>
      ) : mode === 'type' ? (
        // --- Step 1a: text capture ---
        <form onSubmit={handleUnderstand} className="mt-8">
          <button
            type="button"
            onClick={() => setMode('chooser')}
            className="text-[12.5px] text-muted-foreground"
          >
            ← Choose a different way
          </button>
          <h1 className="mt-3 font-display text-h4 tracking-tight text-balance">
            What's on your plate?
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Paste a bill, message, or note in plain language — Daylatch will work out the rest.
          </p>
          <Textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Electricity bill ₹4,820 due next Friday."
            rows={6}
            className="mt-4 resize-none bg-surface-raised text-[14px]"
            autoFocus
          />
          {sourceError ? (
            <p className="mt-1.5 text-[12.5px] text-destructive">{sourceError}</p>
          ) : null}
          <Button type="submit" disabled={isUnderstanding} className="mt-4 w-full">
            {isUnderstanding ? (
              'Understanding…'
            ) : (
              <>
                <Sparkles aria-hidden="true" /> Understand
              </>
            )}
          </Button>
        </form>
      ) : mode === 'image' && !draft ? (
        // --- Step 1b: image review before sending to Daylatch ---
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setMode('chooser')}
            className="text-[12.5px] text-muted-foreground"
          >
            ← Choose a different way
          </button>
          <h1 className="mt-3 font-display text-h4 tracking-tight text-balance">
            Here's what you picked
          </h1>
          {imagePreviewUrl ? (
            // biome-ignore lint/performance/noImgElement: local blob preview URL, not a remote/optimizable image — next/image doesn't apply here
            <img
              src={imagePreviewUrl}
              alt="Selected capture"
              className="mt-4 max-h-80 w-full rounded-xl border border-border object-contain"
            />
          ) : null}
          <Label htmlFor="capture-caption" className="mt-4 block text-xs text-muted-foreground">
            Add a note (optional)
          </Label>
          <Input
            id="capture-caption"
            value={imageCaption}
            onChange={(event) => setImageCaption(event.target.value)}
            placeholder="e.g. this came from the school app"
            className="mt-1.5 bg-surface-raised"
          />
          <Button
            onClick={handleUnderstandImage}
            disabled={isUnderstanding}
            className="mt-4 w-full"
          >
            {isUnderstanding ? (
              'Understanding…'
            ) : (
              <>
                <Sparkles aria-hidden="true" /> Understand
              </>
            )}
          </Button>
        </div>
      ) : draft ? (
        // --- Step 2: review + confirm (shared by both text and image paths) ---
        <div className="mt-8">
          <p className="eyebrow">Daylatch understood</p>
          <h1 className="mt-2 font-display text-lg leading-snug font-semibold text-balance">
            {draft.summary}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {KIND_LABEL[draft.kind]}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {CATEGORY_LABEL[draft.category]}
            </Badge>
            {draft.deadline ? (
              <Badge variant="outline" className="rounded-full">
                Due {draft.deadline}
              </Badge>
            ) : null}
            {draft.amount !== null ? (
              <Badge variant="outline" className="rounded-full">
                ₹{draft.amount.toLocaleString()}
              </Badge>
            ) : null}
            {draft.priority !== null ? (
              <Badge variant="outline" className="rounded-full">
                {PRIORITY_LABEL[draft.priority]}
              </Badge>
            ) : null}
            {draft.confidence ? (
              <StatusChip tone={CONFIDENCE_TONE[draft.confidence]}>
                {draft.confidence} confidence
              </StatusChip>
            ) : null}
          </div>

          {draft.missingInformation.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-lg border border-dashed border-border p-3 text-[12px] text-muted-foreground">
              {draft.missingInformation.map((item) => (
                <li key={item}>Still needed: {item}</li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-[13px] text-foreground">
            <span className="font-medium">Next step:</span> {draft.nextStep}
          </p>

          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <div>
              <Label htmlFor="capture-domain" className="text-xs text-muted-foreground">
                Household area
              </Label>
              <Select
                value={domain}
                onValueChange={(value) => setDomain(value as ResponsibilityDomain)}
              >
                <SelectTrigger id="capture-domain" className="mt-1.5 w-full bg-surface-raised">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capture-owner" className="text-xs text-muted-foreground">
                Owner
                {suggestedOwnerName ? (
                  <span className="ml-1.5 font-normal text-primary">
                    Suggested: {suggestedOwnerName}
                  </span>
                ) : null}
              </Label>
              <Select
                value={ownerId ?? 'unassigned'}
                onValueChange={(value) => setOwnerId(value === 'unassigned' ? null : value)}
              >
                <SelectTrigger id="capture-owner" className="mt-1.5 w-full bg-surface-raised">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(household?.members ?? []).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capture-provider" className="text-xs text-muted-foreground">
                Provider (optional)
              </Label>
              <Input
                id="capture-provider"
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="e.g. Apex General Insurance"
                className="mt-1.5 bg-surface-raised"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={startOver} className="flex-1">
              Start over
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving…' : 'Confirm & save'}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ChooserTile({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  comingSoon = false,
}: {
  icon: typeof Camera;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={comingSoon ? `${label} (coming soon)` : label}
      className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-6 text-[13px] font-medium transition-colors enabled:active:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
      {comingSoon ? (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          Soon
        </span>
      ) : null}
    </button>
  );
}
