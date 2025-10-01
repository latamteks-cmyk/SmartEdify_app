export enum AssemblyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AssemblyType {
  GENERAL = 'general',
  EXTRAORDINARY = 'extraordinary',
  BOARD = 'board',
  COMMITTEE = 'committee',
}

export enum VotingType {
  SIMPLE_MAJORITY = 'simple_majority',
  QUALIFIED_MAJORITY = 'qualified_majority',
  UNANIMOUS = 'unanimous',
  WEIGHTED = 'weighted',
}