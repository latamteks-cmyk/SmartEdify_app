import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const order = await this.prisma.order.create({
        data: {
          ...createOrderDto,
          expiresAt: createOrderDto.expiresAt ? new Date(createOrderDto.expiresAt) : undefined,
        },
        include: {
          payments: true,
        },
      });

      return order;
    } catch (error) {
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async findAll(tenantId?: string, referenceId?: string, referenceType?: string) {
    const where: any = {};
    
    if (tenantId) where.tenantId = tenantId;
    if (referenceId) where.referenceId = referenceId;
    if (referenceType) where.referenceType = referenceType;

    return this.prisma.order.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByReference(referenceId: string, referenceType: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        referenceId,
        referenceType,
      },
      include: {
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: updateOrderDto,
        include: {
          payments: true,
        },
      });

      return order;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      throw new BadRequestException(`Failed to update order: ${error.message}`);
    }
  }

  async cancel(id: string): Promise<Order> {
    return this.update(id, { status: OrderStatus.CANCELLED });
  }

  async confirm(id: string): Promise<Order> {
    return this.update(id, { status: OrderStatus.CONFIRMED });
  }

  async expire(id: string): Promise<Order> {
    return this.update(id, { status: OrderStatus.EXPIRED });
  }

  async refund(id: string): Promise<Order> {
    return this.update(id, { status: OrderStatus.REFUNDED });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      throw new BadRequestException(`Failed to delete order: ${error.message}`);
    }
  }

  // Utility methods
  async getOrdersByCustomer(customerId: string, tenantId?: string) {
    const where: any = { customerId };
    if (tenantId) where.tenantId = tenantId;

    return this.prisma.order.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOrderStats(tenantId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [total, pending, confirmed, cancelled, expired] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.CONFIRMED } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.EXPIRED } }),
    ]);

    return {
      total,
      pending,
      confirmed,
      cancelled,
      expired,
    };
  }

  async cleanupExpiredOrders(): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: OrderStatus.EXPIRED,
      },
    });

    return result.count;
  }
}