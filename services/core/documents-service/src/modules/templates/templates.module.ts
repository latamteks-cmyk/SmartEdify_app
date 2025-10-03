import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateService } from './services/template.service';
import { TemplateController } from './controllers/template.controller';
import { DocumentTemplate } from './entities/document-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTemplate]),
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplatesModule {}