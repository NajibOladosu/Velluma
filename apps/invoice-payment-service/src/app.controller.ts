import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'invoice-payment-service',
      timestamp: new Date().toISOString(),
    };
  }
}
