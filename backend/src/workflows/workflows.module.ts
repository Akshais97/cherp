import { Module } from '@nestjs/common'
import { TasksModule } from '../tasks/tasks.module'
import { ClientWorkflowsController } from './client-workflows.controller'
import { WorkflowTasksController } from './workflow-tasks.controller'
import { WorkflowsController } from './workflows.controller'
import { WorkflowsRepository } from './workflows.repository'
import { WorkflowsService } from './workflows.service'

@Module({
  imports: [TasksModule],
  controllers: [
    WorkflowsController,
    ClientWorkflowsController,
    WorkflowTasksController,
  ],
  providers: [WorkflowsService, WorkflowsRepository],
  exports: [WorkflowsService, WorkflowsRepository],
})
export class WorkflowsModule {}
