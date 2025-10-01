import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ChannelType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
  WEBHOOK = "WEBHOOK",
}

export enum ChannelStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  ERROR = "ERROR",
}

export enum ChannelProvider {
  // Email providers
  SENDGRID = "SENDGRID",
  MAILGUN = "MAILGUN",
  SES = "SES",
  SMTP = "SMTP",

  // SMS providers
  TWILIO = "TWILIO",
  NEXMO = "NEXMO",
  AWS_SNS = "AWS_SNS",

  // Push providers
  FCM = "FCM",
  APNS = "APNS",

  // Webhook
  HTTP = "HTTP",
}

@Entity("notification_channels")
@Index(["tenantId", "type"])
@Index(["tenantId", "status"])
@Index(["tenantId", "isDefault"])
export class NotificationChannel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId: string;

  @Column()
  name: string;

  @Column("text", { nullable: true })
  description?: string;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  type: ChannelType;

  @Column({
    type: "enum",
    enum: ChannelProvider,
  })
  provider: ChannelProvider;

  @Column({
    type: "enum",
    enum: ChannelStatus,
    default: ChannelStatus.ACTIVE,
  })
  status: ChannelStatus;

  @Column("jsonb", { name: "provider_config" })
  providerConfig: Record<string, any>;

  @Column("jsonb", { name: "rate_limits", default: {} })
  rateLimits: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @Column({ name: "is_fallback", default: false })
  isFallback: boolean;

  @Column({ priority: 1 })
  priority: number;

  @Column("jsonb", { name: "retry_config", default: {} })
  retryConfig: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };

  @Column("jsonb", { default: {} })
  metadata: Record<string, any>;

  @Column({ name: "last_used_at", type: "timestamptz", nullable: true })
  lastUsedAt?: Date;

  @Column({ name: "last_error_at", type: "timestamptz", nullable: true })
  lastErrorAt?: Date;

  @Column({ name: "last_error_message", nullable: true })
  lastErrorMessage?: string;

  @Column({ name: "success_count", default: 0 })
  successCount: number;

  @Column({ name: "error_count", default: 0 })
  errorCount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Virtual properties
  get isHealthy(): boolean {
    const errorRate =
      this.errorCount / (this.successCount + this.errorCount || 1);
    return this.status === ChannelStatus.ACTIVE && errorRate < 0.1;
  }

  get successRate(): number {
    const total = this.successCount + this.errorCount;
    return total > 0 ? (this.successCount / total) * 100 : 0;
  }
}
