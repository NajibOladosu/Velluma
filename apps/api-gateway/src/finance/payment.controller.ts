import { Controller, Post, Body, Inject, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { FundEscrowDto } from './dto/fund-escrow.dto';

@Controller('payments')
export class PaymentController {
  constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) {}

  // Funding and releasing escrow are financial operations — cap at 10 req/min
  // to limit accidental duplicate submissions and reduce abuse surface.
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('escrow/fund')
  async fundEscrow(@Body() data: FundEscrowDto) {
    return callMicroservice(this.client.send('create_escrow_payment', data));
  }

  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('escrow/release/:milestoneId')
  async releaseEscrow(@Param('milestoneId') milestoneId: string) {
    return callMicroservice(
      this.client.send('release_escrow', { milestoneId }),
    );
  }
}
