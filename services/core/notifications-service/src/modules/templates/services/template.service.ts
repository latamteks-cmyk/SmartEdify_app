import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate, TemplateType, TemplateCategory } from '../entities/notification-template.entity';

export interface CreateTemplateDto {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  type: TemplateType;
  category: TemplateCategory;
  countryCode?: string;
  language?: string;
  subjectTemplate: string;
  contentTemplate: string;
  htmlTemplate?: string;
  templateVariables?: string[];
  defaultValues?: Record<string, any>;
  validationRules?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  async createTemplate(createDto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Check if code already exists
    const existingTemplate = await this.templateRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingTemplate) {
      throw new BadRequestException('Template code already exists');
    }

    // Extract variables from templates
    const extractedVariables = this.extractTemplateVariables([
      createDto.subjectTemplate,
      createDto.contentTemplate,
      createDto.htmlTemplate || '',
    ]);

    const template = this.templateRepository.create({
      ...createDto,
      templateVariables: createDto.templateVariables || extractedVariables,
      language: createDto.language || 'es',
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(
    templateId: string,
    tenantId: string,
    updateDto: Partial<CreateTemplateDto>,
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be modified');
    }

    // Update template variables if templates changed
    if (updateDto.subjectTemplate || updateDto.contentTemplate || updateDto.htmlTemplate) {
      const extractedVariables = this.extractTemplateVariables([
        updateDto.subjectTemplate || template.subjectTemplate,
        updateDto.contentTemplate || template.contentTemplate,
        updateDto.htmlTemplate || template.htmlTemplate || '',
      ]);
      updateDto.templateVariables = extractedVariables;
    }

    Object.assign(template, updateDto);
    return this.templateRepository.save(template);
  }

  async findById(templateId: string, tenantId: string): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { id: templateId, tenantId, isActive: true },
    });
  }

  async findByCode(code: string, tenantId: string): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { code, tenantId, isActive: true },
    });
  }

  async findTemplates(
    tenantId: string,
    filters?: {
      type?: TemplateType;
      category?: TemplateCategory;
      countryCode?: string;
      language?: string;
      isActive?: boolean;
    },
  ): Promise<NotificationTemplate[]> {
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

  validateTemplateData(template: NotificationTemplate, data: Record<string, any>): {
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
    subject: string;
    content: string;
    htmlContent?: string;
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

    // Process templates
    const subject = this.processTemplate(template.subjectTemplate, mergedData);
    const content = this.processTemplate(template.contentTemplate, mergedData);
    const htmlContent = template.htmlTemplate 
      ? this.processTemplate(template.htmlTemplate, mergedData)
      : undefined;

    return {
      subject,
      content,
      htmlContent,
      validation,
    };
  }

  private extractTemplateVariables(templates: string[]): string[] {
    const variables = new Set<string>();
    const variableRegex = /\{\{([^}]+)\}\}/g;

    for (const template of templates) {
      if (!template) continue;
      
      let match;
      while ((match = variableRegex.exec(template)) !== null) {
        variables.add(match[1].trim());
      }
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