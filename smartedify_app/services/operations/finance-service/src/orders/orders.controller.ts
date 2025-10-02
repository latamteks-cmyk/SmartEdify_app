import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('referenceId') referenceId?: string,
    @Query('referenceType') referenceType?: string,
  ) {
    return this.ordersService.findAll(tenantId, referenceId, referenceType);
  }

  @Get('reference/:referenceId')
  @ApiOperation({ summary: 'Get orders by reference' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findByReference(
    @Param('referenceId') referenceId: string,
    @Query('referenceType') referenceType: string,
  ) {
    return this.ordersService.findByReference(referenceId, referenceType);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get orders by customer' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findByCustomer(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.ordersService.getOrdersByCustomer(customerId, tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Query('tenantId') tenantId?: string) {
    return this.ordersService.getOrderStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm order' })
  @ApiResponse({ status: 200, description: 'Order confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  confirm(@Param('id') id: string) {
    return this.ordersService.confirm(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }

  @Patch(':id/refund')
  @ApiOperation({ summary: 'Refund order' })
  @ApiResponse({ status: 200, description: 'Order refunded successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  refund(@Param('id') id: string) {
    return this.ordersService.refund(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Post('cleanup-expired')
  @ApiOperation({ summary: 'Cleanup expired orders' })
  @ApiResponse({ status: 200, description: 'Expired orders cleaned up' })
  cleanupExpired() {
    return this.ordersService.cleanupExpiredOrders();
  }
}