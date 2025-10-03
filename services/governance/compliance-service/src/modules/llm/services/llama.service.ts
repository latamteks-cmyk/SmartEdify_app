import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface LlamaCompletionRequest {
  prompt: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  seed?: number;
}

export interface LlamaCompletionResponse {
  content: string;
  tokens_predicted: number;
  tokens_evaluated: number;
  generation_settings: {
    temperature: number;
    top_p: number;
    seed: number;
  };
}

@Injectable()
export class LlamaService {
  private readonly logger = new Logger(LlamaService.name);
  private readonly llamaBaseUrl: string;
  private readonly defaultSettings = {
    temperature: 0.1, // Low for deterministic policy generation
    top_p: 0.9,
    max_tokens: 2048,
    stop: ['</s>', 'Human:', 'Usuario:'],
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.llamaBaseUrl = this.configService.get<string>('LLM_BASE_URL', 'http://llama:8080');
  }

  async generateCompletion(request: LlamaCompletionRequest): Promise<LlamaCompletionResponse> {
    const startTime = Date.now();
    
    try {
      const payload = {
        prompt: request.prompt,
        temperature: request.temperature ?? this.defaultSettings.temperature,
        top_p: request.top_p ?? this.defaultSettings.top_p,
        n_predict: request.max_tokens ?? this.defaultSettings.max_tokens,
        stop: request.stop ?? this.defaultSettings.stop,
        seed: request.seed ?? this.generateDeterministicSeed(request.prompt),
        stream: false,
      };

      this.logger.debug(`Sending request to Llama.cpp: ${JSON.stringify({ ...payload, prompt: '[REDACTED]' })}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.llamaBaseUrl}/completion`, payload, {
          timeout: 30000, // 30s timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`Llama completion successful in ${processingTime}ms, tokens: ${response.data.tokens_predicted}`);

      return {
        content: response.data.content.trim(),
        tokens_predicted: response.data.tokens_predicted,
        tokens_evaluated: response.data.tokens_evaluated,
        generation_settings: {
          temperature: payload.temperature,
          top_p: payload.top_p,
          seed: payload.seed,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Llama completion failed after ${processingTime}ms: ${error.message}`, error.stack);
      throw new Error(`LLM completion failed: ${error.message}`);
    }
  }

  async compilePolicy(
    tenantId: string,
    condominiumId: string,
    scope: string,
    documentChunks: Array<{ content: string; sectionId: string; docId: string }>,
  ): Promise<{
    policyJson: any;
    promptHash: string;
    completionHash: string;
    groundingScore: number;
  }> {
    const prompt = this.buildCompilationPrompt(scope, documentChunks);
    const promptHash = this.hashContent(prompt);

    const completion = await this.generateCompletion({
      prompt,
      temperature: 0.05, // Very low for policy compilation
      seed: this.generateDeterministicSeed(`${tenantId}:${condominiumId}:${scope}`),
    });

    const completionHash = this.hashContent(completion.content);

    // Parse and validate JSON
    let policyJson: any;
    try {
      policyJson = JSON.parse(completion.content);
    } catch (error) {
      this.logger.error(`Failed to parse LLM output as JSON: ${error.message}`);
      throw new Error('LLM output is not valid JSON');
    }

    // Validate schema
    this.validatePolicyDraftSchema(policyJson);

    // Calculate grounding score
    const groundingScore = this.calculateGroundingScore(policyJson, documentChunks);

    // Add metadata
    policyJson.tenantId = tenantId;
    policyJson.condominiumId = condominiumId;
    policyJson.scope = scope;

    return {
      policyJson,
      promptHash,
      completionHash,
      groundingScore,
    };
  }

  async explainDecision(
    decisionContext: {
      action: string;
      resource: string;
      subject: string;
      decision: string;
      reason?: string;
    },
    relevantChunks: Array<{ content: string; sectionId: string }>,
  ): Promise<string> {
    const prompt = this.buildExplanationPrompt(decisionContext, relevantChunks);

    const completion = await this.generateCompletion({
      prompt,
      temperature: 0.2,
      max_tokens: 512,
    });

    return completion.content;
  }

  private buildCompilationPrompt(
    scope: string,
    chunks: Array<{ content: string; sectionId: string; docId: string }>,
  ): string {
    const chunksText = chunks
      .map(chunk => `[${chunk.docId}#${chunk.sectionId}]\n${chunk.content}`)
      .join('\n\n');

    return `Sistema: Eres un compilador de políticas. Devuelves JSON válido que cumpla el esquema PolicyDraft v1.

Usuario: A partir de los fragmentos con citas, extrae reglas operativas para ${scope}.
- Si hay ambigüedad marca "requiresHumanReview": true
- Referencia cada regla con doc.section_id
- No inventes valores
- Solo extrae reglas explícitas del texto

Fragmentos del documento:
${chunksText}

Salida JSON (solo JSON, sin explicaciones):
{
  "scope": "${scope}",
  "rules": [{
    "action": "string",
    "condition": "string",
    "obligations": [{"type": "string", "when": "string"}],
    "refs": ["doc:id#section"]
  }],
  "requiresHumanReview": false
}`;
  }

  private buildExplanationPrompt(
    context: any,
    chunks: Array<{ content: string; sectionId: string }>,
  ): string {
    const chunksText = chunks
      .map(chunk => `[${chunk.sectionId}]\n${chunk.content}`)
      .join('\n\n');

    return `Sistema: Responde con explicación concisa y citas [doc#section]. Sin PII.

Usuario: ¿Por qué la acción "${context.action}" fue ${context.decision} para el recurso "${context.resource}"?

Contexto relevante:
${chunksText}

Razón del sistema: ${context.reason || 'No especificada'}

Explica en máximo 3 oraciones con citas específicas:`;
  }

  private validatePolicyDraftSchema(policy: any): void {
    if (!policy.scope || !policy.rules || !Array.isArray(policy.rules)) {
      throw new Error('Invalid policy schema: missing scope or rules');
    }

    for (const rule of policy.rules) {
      if (!rule.action || !rule.condition || !rule.refs || !Array.isArray(rule.refs)) {
        throw new Error('Invalid rule schema: missing action, condition, or refs');
      }
    }
  }

  private calculateGroundingScore(policy: any, chunks: Array<{ sectionId: string }>): number {
    const allRefs = policy.rules.flatMap(rule => rule.refs || []);
    const availableSections = new Set(chunks.map(chunk => `${chunk.sectionId}`));
    
    const groundedRefs = allRefs.filter(ref => {
      const sectionId = ref.split('#')[1];
      return availableSections.has(sectionId);
    });

    return allRefs.length > 0 ? groundedRefs.length / allRefs.length : 0;
  }

  private generateDeterministicSeed(input: string): number {
    const hash = crypto.createHash('sha256').update(input).digest();
    return hash.readUInt32BE(0);
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async healthCheck(): Promise<{ status: string; model?: string; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.llamaBaseUrl}/health`, { timeout: 5000 }),
      );
      
      return {
        status: 'healthy',
        model: response.data?.model || 'unknown',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}