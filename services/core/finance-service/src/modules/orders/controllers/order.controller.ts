import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService, CreateOrderRequest } from '../services/order.service';
import { Order, OrderStatus, OrderType } from '../entities/order.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { DPoPGuard } from '../../../common/guards/dpop.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order created successfully' })
  async createOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: {
      condominiumId: string;
      type: OrderType;
      amount: number;
      currency: string;
      description?: string;
      referenceId?: string;
      referenceType?: string;
      expirationMinutes?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<Order> {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    const request: CreateOrderRequest = {
      tenantId,
      condominiumId: body.condominiumId,
      userId: user.sub,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      referenceId: body.referenceId,
      referenceType: body.referenceType,
      expirationMinutes: body.expirationMinutes,
      metadata: {
        ...body.metadata,
        idempotencyKey,
        createdBy: user.sub,
      },
    };

    return this.orderService.createOrder(request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order retrieved successfully' })
  async getOrder(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.getOrder(tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orders retrieved successfully' })
  async getUserOrders(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Query('status') status?: OrderStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ orders: Order[]; total: number }> {
    return this.orderService.getUserOrders(
      tenantId,
      user.sub,
      status,
      limit ? parseInt(limit.toString()) : undefined,
      offset ? parseInt(offset.toString()) : undefined,
    );
  }

  @Put(':id/confirm')
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Confirm order' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order confirmed successfully' })
  async confirmOrder(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orderService.confirmOrder(tenantId, id);
  }

  @Put(':id/cancel')
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order cancelled successfully' })
  async cancelOrder(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<Order> {
    return this.orderService.cancelOrder(tenantId, id, body.reason);
  }

  @Get('reference/:referenceId')
  @ApiOperation({ summary: 'Get orders by reference' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Orders retrieved successfully' })
  async getOrdersByReference(
    @CurrentTenant() tenantId: string,
    @Param('referenceId') referenceId: string,
    @Query('referenceType') referenceType: string,
  ): Promise<Order[]> {
    return this.orderService.getOrdersByReference(tenantId, referenceId, referenceType);
  }
}