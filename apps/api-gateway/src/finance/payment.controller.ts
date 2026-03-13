import { Controller, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('payments')
export class PaymentController {
    constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) { }

    @Post('escrow/fund')
    async fundEscrow(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('create_escrow_payment', data)
        );
    }

    @Post('escrow/release/:milestoneId')
    async releaseEscrow(@Param('milestoneId') milestoneId: string) {
        return await firstValueFrom(
            this.client.send('release_escrow', { milestoneId })
        );
    }
}
