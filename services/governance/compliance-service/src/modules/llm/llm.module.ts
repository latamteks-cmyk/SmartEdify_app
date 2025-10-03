import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

// Entities
import { PolicyDraft } from "./entities/policy-draft.entity";
import { DocumentManifest } from "./entities/document-manifest.entity";
import { RagChunk } from "./entities/rag-chunk.entity";
import { LlmAuditLog } from "./entities/llm-audit-log.entity";

// Services
import { LlamaService } from "./services/llama.service";
import { EmbeddingsService } from "./services/embeddings.service";
import { RagService } from "./services/rag.service";
import { PolicyCompilerService } from "./services/policy-compiler.service";

// Controllers
import { LlmController } from "./controllers/llm.controller";

// External modules
import { PoliciesModule } from "../policies/policies.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PolicyDraft,
      DocumentManifest,
      RagChunk,
      LlmAuditLog,
    ]),
    HttpModule.register({
      timeout: 30000, // 30s timeout for LLM calls
      maxRedirects: 0,
    }),
    ConfigModule,
    EventEmitterModule,
    PoliciesModule,
  ],
  controllers: [LlmController],
  providers: [
    LlamaService,
    EmbeddingsService,
    RagService,
    PolicyCompilerService,
  ],
  exports: [LlamaService, EmbeddingsService, RagService, PolicyCompilerService],
})
export class LlmModule {}
