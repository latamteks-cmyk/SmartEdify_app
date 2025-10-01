export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Job {
  job_id: string;
  user_id: string;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
}
