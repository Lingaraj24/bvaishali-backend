import { Controller, Get, Param } from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';

@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get('active')
  findActive() {
    return this.flashSalesService.findActive();
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.flashSalesService.findByProductId(productId);
  }
}
