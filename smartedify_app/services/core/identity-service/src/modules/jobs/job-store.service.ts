import { Injectable } from '@nestjs/common';
import { Job, JobStatus } from './job.entity';
import * as crypto from 'crypto';

@Injectable()
export class JobStoreService {
  private jobs = new Map<string, Job>();

  create(userId: string): Job {
    const jobId = crypto.randomUUID();
    const now = new Date();
    const newJob: Job = {
      job_id: jobId,
      user_id: userId,
      status: JobStatus.PENDING,
      created_at: now,
      updated_at: now,
    };
    this.jobs.set(jobId, newJob);
    return newJob;
  }

  get(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateStatus(jobId: string, status: JobStatus): Job | undefined {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.updated_at = new Date();
      return job;
    }
    return undefined;
  }
}
