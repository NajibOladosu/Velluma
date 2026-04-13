import { Controller, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { FundEscrowDto } from './dto/fund-escrow.dto';

@Controller('payments')
export class PaymentController {
  constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) {}

  @Post('escrow/fund')
  async fundEscrow(@Body() data: FundEscrowDto) {
    return callMicroservice(this.client.send('create_escrow_payment', data));
  }

  @Post('escrow/release/:milestoneId')
  async releaseEscrow(@Param('milestoneId') milestoneId: string) {
    return callMicroservice(
      this.client.send('release_escrow', { milestoneId }),
    );
  }
}
