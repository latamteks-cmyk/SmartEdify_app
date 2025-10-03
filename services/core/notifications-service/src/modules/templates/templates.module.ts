import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateService } from './services/template.service';
import { TemplateController } from './controllers/template.controller';
import { NotificationTemplate } from './entities/notification-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate]),
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplatesModule {}