// @polsia:user-owned — interactive Daylatch Paste-to-Next-Step workspace.
'use client';

import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Clock3,
  ListChecks,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import {
  IntakeCreate,
  IntakeResult,
  type IntakeResult as IntakeResultType,
} from '@/lib/contracts/intake';

const CATEGORY_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'bill', label: 'Bill' },
  { value: 'form', label: 'Form' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'other', label: 'Other' },
] as const;

type MissingEntry = { id: string; value: string };

function createEntry(value: string): MissingEntry {
  return { id: crypto.randomUUID(), value };
}

export function IntakeWorkspace() {
  const [sourceText, setSourceText] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [draft, setDraft] = useState<IntakeResultType | null>(null);
  const [missingEntries, setMissingEntries] = useState<MissingEntry[]>([]);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const updateMissingEntries = (nextEntries: MissingEntry[]) => {
    setMissingEntries(nextEntries);
    setDraft((current) =>
      current
        ? { ...current, missingInformation: nextEntries.map((entry) => entry.value) }
        : current,
    );
  };

  const setDraftField = <K extends keyof IntakeResultType>(
    field: K,
    value: IntakeResultType[K],
  ) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setDraftErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setIsCompleted(false);
  };

  const validateDraft = () => {
    if (!draft) {
      return false;
    }

    const result = IntakeResult.safeParse({
      ...draft,
      missingInformation: missingEntries.map((entry) => entry.value),
    });
    if (result.success) {
      setDraft(result.data);
      setDraftErrors({});
      return true;
    }

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      const key = typeof field === 'string' ? field : 'result';
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
    setDraftErrors(errors);
    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = IntakeCreate.safeParse({ sourceText });
    if (!parsed.success) {
      setSourceError(parsed.error.issues[0]?.message ?? 'Paste something to get started.');
      return;
    }

    setSourceError(null);
    setIsSubmitting(true);
    try {
      const result = await apiFetch('/api/intake', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
        schema: IntakeResult,
      });
      setDraft(result);
      setMissingEntries(result.missingInformation.map(createEntry));
      setDraftErrors({});
      setIsCompleted(false);
      toast.success('Your next step is ready.');
    } catch {
      toast.error('Daylatch could not read that yet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    if (!validateDraft()) {
      return;
    }
    setIsCompleted((current) => !current);
    toast.success(isCompleted ? 'Marked as active again.' : 'Marked complete for now.');
  };

  const resetWorkspace = () => {
    setSourceText('');
    setSourceError(null);
    setDraft(null);
    setMissingEntries([]);
    setDraftErrors({});
    setIsCompleted(false);
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-20 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-12rem] top-[-8rem] size-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/5 to-transparent" />
      </div>

      <div className="container-page section-lg mx-auto">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="gap-2 border-primary/30 bg-primary/10 px-3 py-1.5 text-primary"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Paste it. Know what to do next.
          </Badge>
          <h1 className="mt-7 font-display text-5xl leading-[0.96] tracking-[-0.05em] sm:text-6xl lg:text-display">
            Life admin, <span className="text-primary">unstuck.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-muted-foreground">
            Drop in the message you have been avoiding. Daylatch finds the signal, names the next
            move, and leaves you with something you can actually finish.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,0.78fr)] lg:items-start lg:gap-8">
          <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/70 bg-muted/20 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-display text-2xl tracking-[-0.03em]">
                    What needs your attention?
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Paste an email, bill, form, receipt, or appointment message.
                  </CardDescription>
                </div>
                <div className="hidden size-11 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
                  <ClipboardPaste className="size-5" aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="source-text">Your pasted message</Label>
                  <Textarea
                    id="source-text"
                    value={sourceText}
                    onChange={(event) => {
                      setSourceText(event.target.value);
                      if (sourceError) setSourceError(null);
                    }}
                    placeholder="Paste the full message here…"
                    className="min-h-72 resize-y border-primary/20 bg-background/70 p-4 leading-7 shadow-inner shadow-primary/5 placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
                    aria-invalid={sourceError ? true : undefined}
                    aria-describedby={sourceError ? 'source-error' : 'source-help'}
                  />
                  <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                    <p id="source-help">
                      Keep the useful context—Daylatch will ignore unrelated noise.
                    </p>
                    <span className="shrink-0 tabular-nums">
                      {sourceText.length.toLocaleString()} / 12,000
                    </span>
                  </div>
                  {sourceError ? (
                    <p id="source-error" className="text-sm text-destructive">
                      {sourceError}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="group h-12 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Finding the next step…' : 'Find my next step'}
                  <ArrowRight
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
              </form>

              <Separator className="my-7" />
              <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="flex gap-3">
                  <span className="mt-0.5 text-primary">01</span>
                  <span>Emails and forms</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 text-primary">02</span>
                  <span>Bills and receipts</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 text-primary">03</span>
                  <span>Appointments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {draft ? (
            <Card className="border-primary/25 bg-background/80 shadow-lg shadow-primary/5 lg:sticky lg:top-24">
              <CardHeader className="pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-2xl tracking-[-0.03em]">
                      Your next step
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Edit anything that needs your human judgment.
                    </CardDescription>
                  </div>
                  <Badge variant={isCompleted ? 'default' : 'secondary'} className="gap-1.5">
                    {isCompleted ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Sparkles className="size-3.5" aria-hidden="true" />
                    )}
                    {isCompleted ? 'Done for now' : 'Ready to review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={draft.summary}
                    onChange={(event) => setDraftField('summary', event.target.value)}
                    className="min-h-24 bg-card/70 leading-6"
                    aria-invalid={draftErrors.summary ? true : undefined}
                  />
                  {draftErrors.summary ? (
                    <p className="text-sm text-destructive">{draftErrors.summary}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={draft.category}
                      onValueChange={(value) =>
                        setDraftField('category', value as IntakeResultType['category'])
                      }
                    >
                      <SelectTrigger id="category" className="bg-card/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draftErrors.category ? (
                      <p className="text-sm text-destructive">{draftErrors.category}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      value={draft.deadline ?? ''}
                      onChange={(event) => setDraftField('deadline', event.target.value || null)}
                      placeholder="Not specified"
                      className="bg-card/70"
                      aria-invalid={draftErrors.deadline ? true : undefined}
                    />
                    {draftErrors.deadline ? (
                      <p className="text-sm text-destructive">{draftErrors.deadline}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor="next-step" className="text-primary">
                        The next move
                      </Label>
                      <Textarea
                        id="next-step"
                        value={draft.nextStep}
                        onChange={(event) => setDraftField('nextStep', event.target.value)}
                        className="min-h-24 border-primary/20 bg-background/80 leading-6"
                        aria-invalid={draftErrors.nextStep ? true : undefined}
                      />
                      {draftErrors.nextStep ? (
                        <p className="text-sm text-destructive">{draftErrors.nextStep}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <ListChecks className="size-4 text-primary" aria-hidden="true" />
                        Missing information
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add context before you act, if needed.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateMissingEntries([...missingEntries, createEntry('')])}
                    >
                      <Plus aria-hidden="true" /> Add item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {missingEntries.length > 0 ? (
                      missingEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-2">
                          <Input
                            value={entry.value}
                            onChange={(event) =>
                              updateMissingEntries(
                                missingEntries.map((item) =>
                                  item.id === entry.id
                                    ? { ...item, value: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Something to confirm"
                            className="bg-card/70"
                            aria-label="Missing information item"
                            aria-invalid={draftErrors.missingInformation ? true : undefined}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateMissingEntries(
                                missingEntries.filter((item) => item.id !== entry.id),
                              )
                            }
                            aria-label="Remove missing information item"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                        Nothing else is needed to get started.
                      </p>
                    )}
                  </div>
                  {draftErrors.missingInformation ? (
                    <p className="text-sm text-destructive">{draftErrors.missingInformation}</p>
                  ) : null}
                </div>

                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant={isCompleted ? 'secondary' : 'default'}
                    onClick={handleComplete}
                  >
                    <Check aria-hidden="true" />
                    {isCompleted ? 'Reopen next step' : 'Mark complete'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetWorkspace}>
                    <RotateCcw aria-hidden="true" /> Start over
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/20 shadow-none lg:sticky lg:top-24">
              <CardContent className="flex min-h-[30rem] flex-col items-center justify-center px-8 py-12 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ListChecks className="size-7" aria-hidden="true" />
                </div>
                <h2 className="mt-6 font-display text-3xl tracking-[-0.03em]">
                  A clearer finish line is waiting.
                </h2>
                <p className="mt-3 max-w-sm text-body text-muted-foreground">
                  Your extracted summary, deadline, and next move will land here after you paste
                  something on the left.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-5 text-muted-foreground">
          Daylatch helps organize what you pasted. Review important dates, amounts, and commitments
          before acting.
        </p>
      </div>
    </main>
  );
}
