// Server-only helpers for Claude (Anthropic) API calls.
//
// Migrated off Polsia's AI proxy (an OpenAI-compatible relay) to call the
// official Anthropic API directly. The public interface below — chat(),
// streamChat(), generateObject(), analyzeImage(), and the ChatOptions/
// LlmMessage shapes — is UNCHANGED from the Polsia-era version on purpose:
// every consumer (src/lib/business/intake.ts, src/lib/ai/use-chat.ts,
// src/app/api/ai/chat/route.ts) calls this abstraction, never a provider
// SDK directly, so swapping the provider required editing only this file.
// This is also why the abstraction stays easy to swap again later (e.g. to
// a different model provider): only the internals below would need to
// change again, not any business logic.
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { stripMarkdownFences, toAnthropicMediaBlock } from '@/lib/ai/media';
import type { ChatMessage } from '@/lib/ai/schema';
import { env } from '@/lib/env';

export { stripMarkdownFences } from '@/lib/ai/media';

export class AiConfigurationError extends Error {
  constructor(message = 'AI is not configured for this app.') {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

// claude-sonnet-5: a strong, well-rounded default for both the structured
// JSON extraction Daylatch's intake feature relies on (src/lib/business/
// intake.ts) and general chat. If cost becomes a concern at higher volume,
// claude-haiku-4-5 is a drop-in cheaper alternative — pass
// `{ model: 'claude-haiku-4-5' }` in a call's ChatOptions, no client.ts
// change needed.
const DEFAULT_MODEL = 'claude-sonnet-5';
const DEFAULT_VISION_MODEL = 'claude-sonnet-5';
// Anthropic's Messages API requires max_tokens (unlike the OpenAI-shaped
// proxy this replaces, where it was optional). 4096 comfortably covers the
// structured JSON intake.ts extracts and ordinary chat replies.
const DEFAULT_MAX_TOKENS = 4096;

// Vision messages carry an array content part; the public chat contract
// (ChatMessage) is text-only. This broader type is used internally only.
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
export type LlmMessage = ChatMessage | { role: ChatMessage['role']; content: ContentPart[] };

export interface ChatOptions {
  messages: LlmMessage[];
  model?: string;
  /** Kept for interface parity with the old metered-proxy shape; unused by
   * the direct Anthropic API (no per-app metering to route by). */
  task?: string;
  temperature?: number;
  responseFormat?: 'text' | 'json_object';
  signal?: AbortSignal;
}

function anthropicApiKey(): string {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new AiConfigurationError(
      'ANTHROPIC_API_KEY is missing. Set it in your deploy environment (never NEXT_PUBLIC_*) and, for local dev, in .env.local.',
    );
  }
  return key;
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: anthropicApiKey() });
}

/**
 * Anthropic's Messages API takes `system` as a separate top-level string,
 * not a `system`-role message in the array (unlike the OpenAI shape this
 * replaces). Leading system-role messages are pulled out and concatenated;
 * everything else is converted role-for-role.
 */
function toAnthropicRequest(messages: LlmMessage[]): {
  system?: string;
  messages: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const rest: Anthropic.MessageParam[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(typeof message.content === 'string' ? message.content : '');
      continue;
    }
    const role = message.role; // 'user' | 'assistant'
    if (typeof message.content === 'string') {
      rest.push({ role, content: message.content });
    } else {
      rest.push({
        role,
        content: message.content.map((part) =>
          part.type === 'text'
            ? { type: 'text' as const, text: part.text }
            : toAnthropicMediaBlock(part.image_url.url),
        ),
      });
    }
  }

  return { system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined, messages: rest };
}

function withJsonInstruction(system: string | undefined, strict: boolean): string | undefined {
  const instruction = strict
    ? 'Respond with valid JSON only. No prose, no markdown fences.'
    : 'Respond with valid JSON only (no markdown code fences).';
  return system ? `${system}\n\n${instruction}` : instruction;
}

/** Non-streaming chat completion. Returns the assistant message text. */
export async function chat(opts: ChatOptions): Promise<string> {
  const { system, messages } = toAnthropicRequest(opts.messages);
  try {
    const response = await getClient().messages.create({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: opts.responseFormat === 'json_object' ? withJsonInstruction(system, false) : system,
      messages,
      ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
    });
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    return textBlock?.text ?? '';
  } catch (err) {
    if (err instanceof AiConfigurationError) throw err;
    throw new Error(
      `Anthropic AI request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Streaming chat completion. Returns a Response whose body is an
 * OpenAI-compatible SSE stream (`data: {"choices":[{"delta":{"content":
 * "..."}}]}\n\n`, terminated by `data: [DONE]\n\n`) — the EXACT wire shape
 * src/lib/ai/use-chat.ts already parses, so that file needed no changes.
 * `client.messages.create({ stream: true })` performs the request and
 * throws on a non-2xx response before returning the stream, so
 * configuration/auth errors surface here (mapped to 502/503 by
 * src/app/api/ai/chat/route.ts) rather than mid-stream in the browser —
 * matching the old proxy client's `if (!res.ok) throw` behavior.
 */
export async function streamChat(opts: ChatOptions): Promise<Response> {
  const { system, messages } = toAnthropicRequest(opts.messages);

  let anthropicStream: AsyncIterable<Anthropic.MessageStreamEvent>;
  try {
    anthropicStream = await getClient().messages.create({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      system,
      messages,
      stream: true,
      ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
    });
  } catch (err) {
    if (err instanceof AiConfigurationError) throw err;
    throw new Error(
      `Anthropic AI stream failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const openAiShapedChunk = { choices: [{ delta: { content: event.delta.text } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiShapedChunk)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(body);
}

/**
 * Structured JSON output. Instructs the model (via the system prompt) to
 * respond with JSON only, strips any markdown fence Claude adds despite
 * that instruction (see src/lib/ai/media.ts's stripMarkdownFences), parses
 * the result, and retries once with a stricter instruction on a parse
 * failure — the same resilience pattern the Polsia-proxy version used,
 * preserved as-is since it's provider-agnostic.
 */
export async function generateObject<T = unknown>(opts: ChatOptions): Promise<T> {
  const raw = await chat({ ...opts, responseFormat: 'json_object' });
  try {
    return JSON.parse(stripMarkdownFences(raw)) as T;
  } catch {
    const retry = await chat({
      ...opts,
      responseFormat: 'json_object',
      messages: [
        ...opts.messages,
        { role: 'system', content: 'Respond with valid JSON only. No prose, no markdown fences.' },
      ],
    });
    return JSON.parse(stripMarkdownFences(retry)) as T;
  }
}

export interface AnalyzeImageOptions {
  imageUrl: string;
  prompt: string;
  model?: string;
  task?: string;
  json?: boolean;
}

/** Vision: analyze an image URL against a prompt. */
export async function analyzeImage(opts: AnalyzeImageOptions): Promise<string> {
  return chat({
    model: opts.model ?? DEFAULT_VISION_MODEL,
    task: opts.task,
    responseFormat: opts.json ? 'json_object' : 'text',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: opts.prompt },
          { type: 'image_url', image_url: { url: opts.imageUrl, detail: 'high' } },
        ],
      },
    ],
  });
}
