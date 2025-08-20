import { ApiProperty } from '@nestjs/swagger';

export class TopProductStatistic {
  @ApiProperty({ description: 'ID of the product', example: 1 })
  productId: number;
  @ApiProperty({ description: 'Name of the product', example: 'Pizza Margherita' })
  productName: string;
  @ApiProperty({ description: 'Size of the product', example: 'Pizza Margherita' })
  nameSize: string;
  @ApiProperty({ description: 'Quantity sold', example: 50 })
  quantity: number;
}

export class TopCategoryStatistic {
  @ApiProperty({ description: 'ID of the category', example: 10 })
  categoryId: number;
  @ApiProperty({ description: 'Quantity sold in this category', example: 120 })
  quantity: number;
}

export class TopCustomerStatistic {
  @ApiProperty({ description: 'ID of the customer', example: 101 })
  customerId: number;
  @ApiProperty({ description: 'Total revenue from this customer', example: 500000 })
  revenue: number;
}

export class PaymentMethodStatistic {
  @ApiProperty({ description: 'Payment method name', example: 'CREDIT_CARD' })
  paymentMethodName: string;

  @ApiProperty({ description: 'Number of orders paid with this method', example: 60 })
  quantity: number;
}
export class StatisticOrderByMonthResponse {
  @ApiProperty({ description: 'Month', example: '2024-01' })
  month: string;
  @ApiProperty({ description: 'Total orders', example: 10 })
  totalOrders: number;
  @ApiProperty({ description: 'Completed orders', example: 10 })
  completedOrders: number;
  @ApiProperty({ description: 'Cancelled orders', example: 10 })
  cancelledOrders: number;
  @ApiProperty({ description: 'Refuned orders', example: 10 })
  refunedOrders: number;
  @ApiProperty({ description: 'Gross revenue', example: 10 })
  grossRevenue: number;
  @ApiProperty({ description: 'Net revenue', example: 10 })
  netRevenue: number;
  @ApiProperty({ description: 'Average order value', example: 10 })
  averageOrderValue: number;
  @ApiProperty({ description: 'Top products', example: 10 })
  topProducts: TopProductStatistic[];
  @ApiProperty({ description: 'Top categories', example: 10 })
  topCategories: TopCategoryStatistic[];
  @ApiProperty({ description: 'Top customers', example: 10 })
  topCustomers: TopCustomerStatistic[];
  @ApiProperty({ description: 'Payment methods', example: 10 })
  paymentMethods: PaymentMethodStatistic[];
}
