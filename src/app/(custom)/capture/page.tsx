// @polsia:user-owned — mobile Capture experience (Phase 1.3). Reuses the
// EXACT same backend as the desktop /try tool
// (src/components/custom/intake-workspace.tsx): POST /api/intake for
// extraction, POST /api/intake/confirm for the explicit save step. No
// second intake backend, no new contract fields, no new business logic —
// this file is presentation only, purpose-built for a single-column mobile
// flow instead of the desktop workspace's denser layout.
'use client';

import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
  IntakeCreate,
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

export default function CapturePage() {
  const [sourceText, setSourceText] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isUnderstanding, setIsUnderstanding] = useState(false);
  const [draft, setDraft] = useState<IntakeResultType | null>(null);

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
      const result = await apiFetch('/api/intake', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
        schema: IntakeResult,
      });
      setDraft(result);
      setDomain('other');
      setOwnerId(null);
      setProviderName('');
      setSaved(null);
    } catch {
      toast.error("Daylatch couldn't read that yet. Please try again.");
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
    setSourceText('');
    setSourceError(null);
    setDraft(null);
    setSaved(null);
    setDomain('other');
    setOwnerId(null);
    setProviderName('');
  };

  return (
    <main className="container-page mx-auto max-w-lg py-8 pb-28 md:pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
      </Link>

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
      ) : !draft ? (
        // --- Step 1: capture ---
        <form onSubmit={handleUnderstand} className="mt-8">
          <h1 className="font-display text-h4 tracking-tight text-balance">
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
      ) : (
        // --- Step 2: review + confirm ---
        <div className="mt-8">
          <p className="eyebrow">Daylatch understood</p>
          <h1 className="mt-2 font-display text-lg leading-snug font-semibold text-balance">
            {draft.summary}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {CATEGORY_LABEL[draft.category]}
            </Badge>
            {draft.deadline ? (
              <Badge variant="outline" className="rounded-full">
                Due {draft.deadline}
              </Badge>
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
      )}
    </main>
  );
}
