import { Controller, Post, Body, Inject, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { FundEscrowDto } from './dto/fund-escrow.dto';

@ApiTags('Payments')
@ApiBearerAuth('supabase-jwt')
@Controller('payments')
export class PaymentController {
  constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Fund escrow for a milestone', description: 'Charges the client via Stripe and holds funds in escrow until the milestone is approved.' })
  @ApiResponse({ status: 201, description: 'Escrow funded, PaymentIntent created' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('escrow/fund')
  async fundEscrow(@Body() data: FundEscrowDto) {
    return callMicroservice(this.client.send('create_escrow_payment', data));
  }

  @ApiOperation({ summary: 'Release escrow for a milestone', description: 'Releases held funds to the freelancer via Stripe Connect payout.' })
  @ApiParam({ name: 'milestoneId', description: 'UUID of the milestone to release', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Escrow released, payout initiated' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('escrow/release/:milestoneId')
  async releaseEscrow(@Param('milestoneId') milestoneId: string) {
    return callMicroservice(
      this.client.send('release_escrow', { milestoneId }),
    );
  }
}
