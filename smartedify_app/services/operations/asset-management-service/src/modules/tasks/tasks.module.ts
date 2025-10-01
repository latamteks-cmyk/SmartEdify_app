import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Space } from '../spaces/entities/space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Incident, Asset, Space])],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}