import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { Order, OrderStatus, OrderType } from '../entities/order.entity';

export interface CreateOrderRequest {
  tenantId: string;
  condominiumId: string;
  userId: string;
  type: OrderType;
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  expirationMinutes?: number;
  metadata?: Record<string, any>;
}

export interface OrderCreatedEvent {
  orderId: string;
  tenantId: string;
  userId: string;
  type: OrderType;
  amount: number;
  currency: string;
  referenceId?: string;
  referenceType?: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    // Validate amount
    if (request.amount <= 0) {
      throw new BadRequestException('Order amount must be greater than zero');
    }

    // Calculate expiration time
    const expirationMinutes = request.expirationMinutes || 
      this.configService.get<number>('orders.defaultExpirationMinutes', 30);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    // Check for duplicate orders (same reference within 5 minutes)
    if (request.referenceId && request.referenceType) {
      const recentOrder = await this.orderRepository.findOne({
        where: {
          tenantId: request.tenantId,
          userId: request.userId,
          referenceId: request.referenceId,
          referenceType: request.referenceType,
          status: OrderStatus.PENDING,
        },
      });

      if (recentOrder) {
        const timeDiff = Date.now() - recentOrder.createdAt.getTime();
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          this.logger.warn(`Duplicate order attempt for reference ${request.referenceId}`);
          return recentOrder;
        }
      }
    }

    const order = this.orderRepository.create({
      tenantId: request.tenantId,
      condominiumId: request.condominiumId,
      userId: request.userId,
      type: request.type,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      referenceId: request.referenceId,
      referenceType: request.referenceType,
      expiresAt,
      metadata: request.metadata || {},
    });

    const savedOrder = await this.orderRepository.save(order);

    // Emit event
    this.eventEmitter.emit('order.created', {
      orderId: savedOrder.id,
      tenantId: savedOrder.tenantId,
      userId: savedOrder.userId,
      type: savedOrder.type,
      amount: savedOrder.amount,
      currency: savedOrder.currency,
      referenceId: savedOrder.referenceId,
      referenceType: savedOrder.referenceType,
    } as OrderCreatedEvent);

    this.logger.log(`Order created: ${savedOrder.id} for user ${request.userId}, amount ${request.amount} ${request.currency}`);
    return savedOrder;
  }

  async getOrder(tenantId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, tenantId },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(
    tenantId: string,
    userId: string,
    status?: OrderStatus,
    limit = 50,
    offset = 0,
  ): Promise<{ orders: Order[]; total: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.user_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('o.status = :status', { status });
    }

    queryBuilder
      .orderBy('o.created_at', 'DESC')
      .limit(limit)
      .offset(offset);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }

  async confirmOrder(tenantId: string, orderId: string): Promise<Order> {
    const order = await this.getOrder(tenantId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be confirmed');
    }

    order.status = OrderStatus.CONFIRMED;
    const updatedOrder = await this.orderRepository.save(order);

    // Emit event
    this.eventEmitter.emit('order.confirmed', {
      orderId: updatedOrder.id,
      tenantId: updatedOrder.tenantId,
      userId: updatedOrder.userId,
    });

    this.logger.log(`Order confirmed: ${orderId}`);
    return updatedOrder;
  }

  async markOrderAsPaid(tenantId: string, orderId: string, paymentId: string): Promise<Order> {
    const order = await this.getOrder(tenantId, orderId);

    if (order.status === OrderStatus.PAID) {
      return order; // Already paid
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order cannot be marked as paid');
    }

    order.status = OrderStatus.PAID;
    order.metadata = {
      ...order.metadata,
      paidAt: new Date().toISOString(),
      paymentId,
    };

    const updatedOrder = await this.orderRepository.save(order);

    // Emit event
    this.eventEmitter.emit('order.paid', {
      orderId: updatedOrder.id,
      tenantId: updatedOrder.tenantId,
      userId: updatedOrder.userId,
      amount: updatedOrder.amount,
      currency: updatedOrder.currency,
      paymentId,
      referenceId: updatedOrder.referenceId,
      referenceType: updatedOrder.referenceType,
    });

    this.logger.log(`Order paid: ${orderId} with payment ${paymentId}`);
    return updatedOrder;
  }

  async cancelOrder(tenantId: string, orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrder(tenantId, orderId);

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Paid orders cannot be cancelled');
    }

    if (order.status === OrderStatus.CANCELLED) {
      return order; // Already cancelled
    }

    order.status = OrderStatus.CANCELLED;
    order.metadata = {
      ...order.metadata,
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    };

    const updatedOrder = await this.orderRepository.save(order);

    // Emit event
    this.eventEmitter.emit('order.cancelled', {
      orderId: updatedOrder.id,
      tenantId: updatedOrder.tenantId,
      userId: updatedOrder.userId,
      reason,
    });

    this.logger.log(`Order cancelled: ${orderId}, reason: ${reason}`);
    return updatedOrder;
  }

  async expireOrders(): Promise<number> {
    const now = new Date();
    
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({ status: OrderStatus.EXPIRED })
      .where('status = :status', { status: OrderStatus.PENDING })
      .andWhere('expires_at < :now', { now })
      .execute();

    const expiredCount = result.affected || 0;
    
    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} orders`);
    }

    return expiredCount;
  }

  async getOrdersByReference(
    tenantId: string,
    referenceId: string,
    referenceType: string,
  ): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        tenantId,
        referenceId,
        referenceType,
      },
      order: { createdAt: 'DESC' },
    });
  }
}