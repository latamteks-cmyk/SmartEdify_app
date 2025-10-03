import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DocumentTemplate } from '../../templates/entities/document-template.entity';
import * as puppeteer from 'puppeteer';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly mcpEnabled: boolean;
  private readonly mcpServerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.mcpEnabled = this.configService.get<boolean>('app.mcpEnabled', false);
    this.mcpServerUrl = this.configService.get<string>('app.mcpServerUrl');
  }

  async generateDocumentContent(
    template: DocumentTemplate,
    data: Record<string, any>,
  ): Promise<string> {
    if (!this.mcpEnabled) {
      this.logger.warn('MCP is disabled, falling back to template processing');
      return this.processTemplateWithoutAi(template.templateContent, data);
    }

    try {
      const prompt = this.buildGenerationPrompt(template, data);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.mcpServerUrl}/generate`, {
          prompt,
          template: template.templateContent,
          data,
          context: {
            type: template.type,
            category: template.category,
            language: template.language,
            countryCode: template.countryCode,
          },
        }),
      );

      const generatedContent = response.data.content;
      
      this.logger.log(`AI-generated content for template ${template.code}`);
      return generatedContent;
    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`, error.stack);
      // Fallback to template processing
      return this.processTemplateWithoutAi(template.templateContent, data);
    }
  }

  async reviewDocument(
    template: DocumentTemplate,
    content: string,
    context?: Record<string, any>,
  ): Promise<{
    isValid: boolean;
    suggestions: string[];
    compliance: {
      legal: boolean;
      format: boolean;
      completeness: boolean;
    };
  }> {
    if (!this.mcpEnabled || !template.aiPrompts.review) {
      return {
        isValid: true,
        suggestions: [],
        compliance: { legal: true, format: true, completeness: true },
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.mcpServerUrl}/review`, {
          prompt: template.aiPrompts.review,
          content,
          template: template.templateContent,
          context: {
            type: template.type,
            category: template.category,
            language: template.language,
            countryCode: template.countryCode,
            ...context,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`AI review failed: ${error.message}`, error.stack);
      return {
        isValid: true,
        suggestions: ['AI review unavailable'],
        compliance: { legal: true, format: true, completeness: true },
      };
    }
  }

  async summarizeDocument(
    template: DocumentTemplate,
    content: string,
  ): Promise<string> {
    if (!this.mcpEnabled || !template.aiPrompts.summary) {
      return 'Summary not available';
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.mcpServerUrl}/summarize`, {
          prompt: template.aiPrompts.summary,
          content,
          context: {
            type: template.type,
            category: template.category,
            language: template.language,
          },
        }),
      );

      return response.data.summary;
    } catch (error) {
      this.logger.error(`AI summarization failed: ${error.message}`, error.stack);
      return 'Summary generation failed';
    }
  }

  async convertToPdf(htmlContent: string, cssStyles?: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Combine HTML with CSS
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            ${cssStyles || ''}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`PDF conversion failed: ${error.message}`, error.stack);
      throw new Error(`Failed to convert to PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    // This would integrate with a PDF text extraction library
    // For now, return a placeholder
    this.logger.warn('PDF text extraction not implemented');
    return 'Text extraction from PDF not available';
  }

  private buildGenerationPrompt(template: DocumentTemplate, data: Record<string, any>): string {
    const basePrompt = template.aiPrompts.generation || 'Generate document content based on the provided template and data.';
    
    const contextPrompt = `
Context:
- Document Type: ${template.type}
- Category: ${template.category}
- Language: ${template.language}
- Country: ${template.countryCode || 'Generic'}

Data provided:
${JSON.stringify(data, null, 2)}

Template structure:
${template.templateContent}

Instructions:
${basePrompt}

Please generate complete, professional content that follows legal requirements and best practices for ${template.countryCode || 'international'} jurisdiction.
    `;

    return contextPrompt;
  }

  private processTemplateWithoutAi(template: string, data: Record<string, any>): string {
    let processed = template;

    // Simple template variable replacement
    const variableRegex = /\{\{([^}]+)\}\}/g;
    processed = processed.replace(variableRegex, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = this.getNestedProperty(data, trimmedName);
      
      if (value !== undefined && value !== null) {
        return String(value);
      }
      
      return match; // Keep placeholder if no value found
    });

    return processed;
  }

  private getNestedProperty(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}