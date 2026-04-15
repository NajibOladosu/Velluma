import { Controller, Patch, Param, Body, Inject, Req, ParseUUIDPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';

@Controller('expenses')
export class ExpenseController {
  constructor(@Inject('EXPENSE_SERVICE') private client: ClientProxy) {}

  @Patch(':id/approve')
  async approveExpense(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(
      this.client.send('approve_expense', { id, approverId: req.user.id }),
    );
  }

  @Patch(':id/reject')
  async rejectExpense(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
  ) {
    return callMicroservice(
      this.client.send('reject_expense', {
        id,
        approverId: req.user.id,
        notes: body?.notes,
      }),
    );
  }

  @Patch(':id/reimburse')
  async reimburseExpense(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(
      this.client.send('reimburse_expense', { id }),
    );
  }
}
