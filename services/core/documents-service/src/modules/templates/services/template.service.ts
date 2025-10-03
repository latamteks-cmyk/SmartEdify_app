import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTemplate, TemplateFormat } from '../entities/document-template.entity';
import { DocumentType, DocumentCategory } from '../../documents/entities/document.entity';

export interface CreateTemplateDto {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  type: DocumentType;
  category: DocumentCategory;
  format?: TemplateFormat;
  countryCode?: string;
  language?: string;
  templateContent: string;
  cssStyles?: string;
  templateVariables?: string[];
  defaultValues?: Record<string, any>;
  validationRules?: Record<string, any>;
  aiPrompts?: Record<string, string>;
  requiresSignature?: boolean;
  signatureConfig?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
  ) {}

  async createTemplate(createDto: CreateTemplateDto): Promise<DocumentTemplate> {
    // Check if code already exists
    const existingTemplate = await this.templateRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingTemplate) {
      throw new BadRequestException('Template code already exists');
    }

    // Extract variables from template content
    const extractedVariables = this.extractTemplateVariables(createDto.templateContent);

    const template = this.templateRepository.create({
      ...createDto,
      templateVariables: createDto.templateVariables || extractedVariables,
      language: createDto.language || 'es',
      format: createDto.format || TemplateFormat.HTML,
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(
    templateId: string,
    tenantId: string,
    updateDto: Partial<CreateTemplateDto>,
  ): Promise<DocumentTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be modified');
    }

    // Update template variables if content changed
    if (updateDto.templateContent) {
      const extractedVariables = this.extractTemplateVariables(updateDto.templateContent);
      updateDto.templateVariables = extractedVariables;
    }

    Object.assign(template, updateDto);
    return this.templateRepository.save(template);
  }

  async findById(templateId: string, tenantId: string): Promise<DocumentTemplate | null> {
    return this.templateRepository.findOne({
      where: { id: templateId, tenantId, isActive: true },
    });
  }

  async findByCode(code: string, tenantId: string): Promise<DocumentTemplate | null> {
    return this.templateRepository.findOne({
      where: { code, tenantId, isActive: true },
    });
  }

  async findTemplates(
    tenantId: string,
    filters?: {
      type?: DocumentType;
      category?: DocumentCategory;
      countryCode?: string;
      language?: string;
      isActive?: boolean;
    },
  ): Promise<DocumentTemplate[]> {
    const whereCondition: any = { tenantId };

    if (filters) {
      if (filters.type) whereCondition.type = filters.type;
      if (filters.category) whereCondition.category = filters.category;
      if (filters.countryCode) whereCondition.countryCode = filters.countryCode;
      if (filters.language) whereCondition.language = filters.language;
      if (filters.isActive !== undefined) whereCondition.isActive = filters.isActive;
    }

    return this.templateRepository.find({
      where: whereCondition,
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async deactivateTemplate(templateId: string, tenantId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be deactivated');
    }

    template.isActive = false;
    await this.templateRepository.save(template);
  }

  processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;

    // Replace variables in format {{variable}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    processed = processed.replace(variableRegex, (match, variableName) => {
      const trimmedName = variableName.trim();
      
      // Support nested properties with dot notation
      const value = this.getNestedProperty(data, trimmedName);
      
      if (value !== undefined && value !== null) {
        return String(value);
      }
      
      // Return original placeholder if no value found
      return match;
    });

    return processed;
  }

  validateTemplateData(template: DocumentTemplate, data: Record<string, any>): {
    isValid: boolean;
    missingVariables: string[];
    errors: string[];
  } {
    const missingVariables: string[] = [];
    const errors: string[] = [];

    // Check required variables
    for (const variable of template.templateVariables) {
      if (!this.hasNestedProperty(data, variable)) {
        missingVariables.push(variable);
      }
    }

    // Apply validation rules
    if (template.validationRules) {
      for (const [field, rules] of Object.entries(template.validationRules)) {
        const value = this.getNestedProperty(data, field);
        const fieldRules = rules as any;

        if (fieldRules.required && (value === undefined || value === null || value === '')) {
          errors.push(`Field '${field}' is required`);
        }

        if (value && fieldRules.minLength && String(value).length < fieldRules.minLength) {
          errors.push(`Field '${field}' must be at least ${fieldRules.minLength} characters`);
        }

        if (value && fieldRules.maxLength && String(value).length > fieldRules.maxLength) {
          errors.push(`Field '${field}' must not exceed ${fieldRules.maxLength} characters`);
        }

        if (value && fieldRules.pattern && !new RegExp(fieldRules.pattern).test(String(value))) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
      }
    }

    return {
      isValid: missingVariables.length === 0 && errors.length === 0,
      missingVariables,
      errors,
    };
  }

  async previewTemplate(
    templateId: string,
    tenantId: string,
    data: Record<string, any>,
  ): Promise<{
    content: string;
    validation: {
      isValid: boolean;
      missingVariables: string[];
      errors: string[];
    };
  }> {
    const template = await this.findById(templateId, tenantId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Merge with default values
    const mergedData = { ...template.defaultValues, ...data };

    // Validate data
    const validation = this.validateTemplateData(template, mergedData);

    // Process template
    const content = this.processTemplate(template.templateContent, mergedData);

    return {
      content,
      validation,
    };
  }

  private extractTemplateVariables(template: string): string[] {
    const variables = new Set<string>();
    const variableRegex = /\{\{([^}]+)\}\}/g;

    let match;
    while ((match = variableRegex.exec(template)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  private getNestedProperty(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private hasNestedProperty(obj: Record<string, any>, path: string): boolean {
    return this.getNestedProperty(obj, path) !== undefined;
  }
}