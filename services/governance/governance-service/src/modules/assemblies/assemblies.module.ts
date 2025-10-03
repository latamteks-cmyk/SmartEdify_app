import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssembliesService } from './assemblies.service';
import { AssembliesController } from './assemblies.controller';
import { Assembly } from './entities/assembly.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assembly])],
  controllers: [AssembliesController],
  providers: [AssembliesService],
  exports: [AssembliesService],
})
export class AssembliesModule {}