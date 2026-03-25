import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern('create_escrow_payment')
  async createEscrowPayment(@Payload() data: any) {
    return await this.paymentService.createEscrowPayment(data);
  }

  @MessagePattern('release_escrow')
  async releaseEscrow(@Payload() data: { milestoneId: string }) {
    return await this.paymentService.releaseEscrow(data.milestoneId);
  }
}
