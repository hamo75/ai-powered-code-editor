/**
 * LLMGateway (Engineering-grade)
 * - Strict JSON mode helpers (chatJSON)
 * - Robust JSON extraction (balanced brackets, fenced blocks)
 * - One retry for "JSON repair"
 * - Safe logging (no apiKey leakage)
 * - Timeout via AbortController
 *
 * Important Security Note:
 * Calling OpenAI/Anthropic directly from browser exposes API keys.
 * Use a backend proxy (baseUrl) for 'openai'/'anthropic'/'local'.
 */

import { UnifiedLoggerClass, LogContext } from '../logger/UnifiedLogger';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'mock';
  apiKey?: string;
  model?: string;
  baseUrl?: string; // proxy endpoint e.g. "/api/llm/openai"
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // ms
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface CodeAnalysisRequest {
  code: string;
  error?: string;
  context?: string;
  language?: string;
}

export interface FixSuggestion {
  description: string;
  code: string;
  confidence: number; // 0..1
  strategy: string;
}

type JSONValue = null | boolean | number | string | JSONValue[] | { [k: string]: JSONValue };

export class LLMGateway {
  private logger: UnifiedLoggerClass;
  private config: LLMConfig;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: LLMConfig) {
    this.logger = UnifiedLoggerClass.getInstance();
    this.config = {
      provider: 'mock',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.2, // أقل = أقل هلوسة
      timeout: 30000,
      ...config,
    };

    this.logger.info('LLMGateway initialized', {
      context: LogContext.SYSTEM,
      data: this.redactConfig(this.config),
    });
  }

  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('LLM config updated', {
      context: LogContext.SYSTEM,
      data: this.redactConfig(config),
    });
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      provider: this.config.provider,
      model: this.config.model || 'unknown',
    };
  }

  /**
   * Basic chat
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const startTime = Date.now();
    this.requestCount++;
    this.lastRequestTime = startTime;

    this.logger.debug('Chat request sent', {
      context: LogContext.AI,
      data: {
        messageCount: messages.length,
        provider: this.config.provider,
        model: this.config.model,
      },
    });

    try {
      let response: LLMResponse;

      switch (this.config.provider) {
        case 'openai':
          response = await this.callOpenAI(messages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(messages);
          break;
        case 'local':
          response = await this.callLocal(messages);
          break;
        case 'mock':
        default:
          response = await this.mockResponse(messages);
          break;
      }

      const duration = Date.now() - startTime;
      this.logger.info('Chat response received', {
        context: LogContext.AI,
        data: {
          duration,
          tokenUsage: response.usage,
          model: response.model,
          finishReason: response.finishReason,
        },
      });

      return response;
    } catch (error) {
      this.logger.error('Chat request failed', {
        context: LogContext.AI,
        error: error as Error,
        data: { provider: this.config.provider, duration: Date.now() - startTime },
      });
      throw error;
    }
  }

  /**
   * Strict JSON chat:
   * - calls chat()
   * - extracts JSON (balanced brackets)
   * - validates via provided validator
   * - one retry to repair JSON if parse fails
   */
  async chatJSON<T>(
    messages: LLMMessage[],
    options: {
      validator: (v: unknown) => v is T;
      repairHint?: string;
    }
  ): Promise<{ value: T; raw: string }> {
    const res1 = await this.chat(messages);
    const parsed1 = this.tryParseFirstJSON(res1.content);

    if (parsed1.ok && options.validator(parsed1.value)) {
      return { value: parsed1.value, raw: res1.content };
    }

    // Retry once with a repair prompt
    const repairSystem = `You MUST output ONLY valid JSON. No markdown. No explanations.`;
    const repairUser =
      (options.repairHint ?? 'Return only valid JSON that matches the required schema.') +
      `\n\nHere is your previous invalid output:\n${res1.content}`;

    const res2 = await this.chat([
      { role: 'system', content: repairSystem },
      ...messages.filter(m => m.role !== 'system'),
      { role: 'user', content: repairUser },
    ]);

    const parsed2 = this.tryParseFirstJSON(res2.content);
    if (parsed2.ok && options.validator(parsed2.value)) {
      return { value: parsed2.value, raw: res2.content };
    }

    throw new Error(
      `LLM did not return valid JSON after retry. parse1=${parsed1.ok} parse2=${parsed2.ok}`
    );
  }

  // -------------------- High-level features --------------------

  async analyzeCode(request: CodeAnalysisRequest): Promise<FixSuggestion[]> {
    this.logger.info('Code analysis requested', {
      context: LogContext.AI,
      data: {
        language: request.language,
        hasError: !!request.error,
        codeLength: request.code.length,
      },
    });

    const systemPrompt = [
      `You are an expert code analyst and repair specialist.`,
      `Return ONLY valid JSON array of suggestions.`,
      `Schema: [{ "description": string, "code": string, "confidence": number(0..1), "strategy": string }]`,
      `No markdown. No extra text.`,
    ].join('\n');

    const userPrompt = [
      `Language: ${request.language || 'typescript'}`,
      request.error ? `Error: ${request.error}` : '',
      request.context ? `Context: ${request.context}` : '',
      `Code:\n${request.code}`,
    ]
      .filter(Boolean)
      .join('\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const { value } = await this.chatJSON<FixSuggestion[]>(messages, {
        validator: this.isFixSuggestionArray,
        repairHint:
          'Return ONLY JSON array. Ensure confidence is a number between 0 and 1. Do not wrap in markdown.',
      });

      this.logger.info('Code analysis completed', {
        context: LogContext.AI,
        data: { suggestionCount: value.length },
      });

      return value;
    } catch (error) {
      this.logger.error('Code analysis failed', {
        context: LogContext.AI,
        error: error as Error,
      });
      return this.getDefaultSuggestions(request);
    }
  }

  async generatePlan(description: string, context?: string): Promise<string[]> {
    this.logger.info('Plan generation requested', {
      context: LogContext.AI,
      data: { descriptionLength: description.length },
    });

    const systemPrompt = [
      `You are a strategic planner for code modifications.`,
      `Return ONLY valid JSON array of steps (strings).`,
      `No markdown. No extra text.`,
    ].join('\n');

    const userPrompt = [
      `Task: ${description}`,
      context ? `Context: ${context}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const { value } = await this.chatJSON<string[]>(messages, {
        validator: this.isStringArray,
        repairHint: 'Return ONLY a JSON array of strings. Example: ["step1","step2"].',
      });

      this.logger.info('Plan generated', {
        context: LogContext.AI,
        data: { stepCount: value.length },
      });

      return value;
    } catch (error) {
      this.logger.error('Plan generation failed', {
        context: LogContext.AI,
        error: error as Error,
      });

      return ['تحليل المشكلة', 'تحديد نطاق التعديل', 'تطبيق التعديل', 'Typecheck', 'Build', 'Tests'];
    }
  }

  // -------------------- Provider calls (safe) --------------------

  private async callOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.baseUrl) {
      throw new Error(
        'OpenAI provider requires baseUrl (a backend proxy). Refusing to call OpenAI from browser.'
      );
    }
    return this.callProxy(messages, `${this.config.baseUrl}`);
  }

  private async callAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.baseUrl) {
      throw new Error(
        'Anthropic provider requires baseUrl (a backend proxy). Refusing to call Anthropic from browser.'
      );
    }
    return this.callProxy(messages, `${this.config.baseUrl}`);
  }

  private async callLocal(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.baseUrl) {
      throw new Error('Local provider requires baseUrl.');
    }
    return this.callProxy(messages, `${this.config.baseUrl}`);
  }

  /**
   * Generic proxy call:
   * Expects your backend to accept { messages, model, maxTokens, temperature } and return { content, usage, model }
   */
  private async callProxy(messages: LLMMessage[], url: string): Promise<LLMResponse> {
    const timeoutMs = this.config.timeout ?? 30000;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // IMPORTANT: do not send apiKey from browser unless your backend expects it safely
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`LLM proxy failed: ${res.status} ${res.statusText} ${text}`);
      }

      const data = (await res.json()) as any;
      if (!data || typeof data.content !== 'string') {
        throw new Error('LLM proxy returned invalid response shape.');
      }

      return {
        content: data.content,
        usage: data.usage,
        model: data.model,
        finishReason: data.finishReason,
      };
    } finally {
      clearTimeout(t);
    }
  }

  // -------------------- Mock --------------------

  private async mockResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';

    let responseContent = '';

    // Keep mock simple and valid JSON when asked
    if (content.toLowerCase().includes('return only valid json') || content.includes('Schema')) {
      responseContent = JSON.stringify(
        [
          {
            description: 'Mock suggestion',
            code: '// mock fix',
            confidence: 0.7,
            strategy: 'mock',
          },
        ],
        null,
        2
      );
    } else {
      responseContent = `I am a mock model. Provide a JSON-only request for structured output.`;
    }

    return {
      content: responseContent,
      usage: {
        promptTokens: Math.floor(content.length / 4),
        completionTokens: Math.floor(responseContent.length / 4),
        totalTokens: Math.floor((content.length + responseContent.length) / 4),
      },
      model: this.config.model || 'mock-model',
      finishReason: 'stop',
    };
  }

  // -------------------- Parsing & Validation --------------------

  private stripCodeFences(text: string): string {
    // remove ```json ... ``` or ``` ... ```
    return text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();
  }

  /**
   * Extract first JSON object/array using balanced brackets scan.
   * More reliable than regex.
   */
  private tryParseFirstJSON(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
    const cleaned = this.stripCodeFences(text);

    const start = cleaned.search(/[\[{]/);
    if (start === -1) return { ok: false, error: 'No JSON start found' };

    const openChar = cleaned[start];
    const closeChar = openChar === '[' ? ']' : '}';

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      } else {
        if (ch === '"') {
          inString = true;
          continue;
        }
      }

      if (ch === openChar) depth++;
      if (ch === closeChar) depth--;

      if (depth === 0) {
        const jsonSlice = cleaned.slice(start, i + 1);
        try {
          const value = JSON.parse(jsonSlice) as JSONValue;
          return { ok: true, value };
        } catch (e) {
          return { ok: false, error: `JSON.parse failed: ${(e as Error).message}` };
        }
      }
    }

    return { ok: false, error: 'Unbalanced JSON brackets' };
  }

  private isStringArray(v: unknown): v is string[] {
    return Array.isArray(v) && v.every(x => typeof x === 'string');
  }

  private isFixSuggestionArray(v: unknown): v is FixSuggestion[] {
    if (!Array.isArray(v)) return false;

    return v.every(item => {
      if (!item || typeof item !== 'object') return false;
      const it = item as any;
      return (
        typeof it.description === 'string' &&
        typeof it.code === 'string' &&
        typeof it.strategy === 'string' &&
        typeof it.confidence === 'number' &&
        it.confidence >= 0 &&
        it.confidence <= 1
      );
    });
  }

  private getDefaultSuggestions(request: CodeAnalysisRequest): FixSuggestion[] {
    return [
      {
        description: 'مراجعة البنية العامة للكود',
        code: request.code,
        confidence: 0.5,
        strategy: 'review',
      },
      {
        description: 'تشغيل typecheck/build/tests لتحديد المشكلة بدقة',
        code: '',
        confidence: 0.6,
        strategy: 'verification',
      },
    ];
  }

  private redactConfig(config: Partial<LLMConfig>): Partial<LLMConfig> {
    const { apiKey, ...rest } = config;
    return { ...rest, ...(apiKey ? { apiKey: '***' } : {}) };
  }
}