import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly embeddingsBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.embeddingsBaseUrl = this.configService.get<string>('EMBEDDINGS_URL', 'http://embeddings:80');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.embeddingsBaseUrl}/embed`, {
          inputs: text,
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data[0]; // First (and only) embedding
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`, error.stack);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.embeddingsBaseUrl}/embed`, {
          inputs: texts,
        }, {
          timeout: 30000, // Longer timeout for batch
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Batch embedding generation failed: ${error.message}`, error.stack);
      
      // Fallback: generate one by one
      this.logger.warn('Falling back to individual embedding generation');
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        try {
          const embedding = await this.generateEmbedding(text);
          embeddings.push(embedding);
        } catch (individualError) {
          this.logger.error(`Individual embedding failed for text: ${text.substring(0, 100)}...`);
          // Use zero vector as fallback
          embeddings.push(new Array(768).fill(0));
        }
      }
      
      return embeddings;
    }
  }

  async healthCheck(): Promise<{ status: string; model?: string; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.embeddingsBaseUrl}/health`, { timeout: 5000 }),
      );
      
      return {
        status: 'healthy',
        model: response.data?.model_id || 'unknown',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}