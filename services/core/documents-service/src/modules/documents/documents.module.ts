import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DocumentService } from './services/document.service';
import { AiService } from './services/ai.service';
import { DocumentController } from './controllers/document.controller';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { StorageModule } from '../storage/storage.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion]),
    HttpModule,
    StorageModule,
    TemplatesModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, AiService],
  exports: [DocumentService, AiService],
})
export class DocumentsModule {}