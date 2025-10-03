import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureService } from './services/signature.service';
import { SignatureController } from './controllers/signature.controller';
import { DocumentSignature } from './entities/document-signature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSignature]),
  ],
  controllers: [SignatureController],
  providers: [SignatureService],
  exports: [SignatureService],
})
export class SignaturesModule {}