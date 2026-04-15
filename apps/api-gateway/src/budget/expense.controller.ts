import { Controller, Patch, Param, Body, Inject, Req, ParseUUIDPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';

@ApiTags('Expenses')
@ApiBearerAuth('supabase-jwt')
@Controller('expenses')
export class ExpenseController {
  constructor(@Inject('EXPENSE_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Approve a pending expense', description: 'Moves the expense from pending → approved. The approver\'s identity is taken from the authenticated session.' })
  @ApiParam({ name: 'id', description: 'Expense UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Approved expense record' })
  @ApiResponse({ status: 404, description: 'Expense not found or not in pending state' })
  @Patch(':id/approve')
  async approveExpense(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(
      this.client.send('approve_expense', { id, approverId: req.user.id }),
    );
  }

  @ApiOperation({ summary: 'Reject a pending expense' })
  @ApiParam({ name: 'id', description: 'Expense UUID', format: 'uuid' })
  @ApiBody({ schema: { properties: { notes: { type: 'string', description: 'Rejection reason' } } } })
  @ApiResponse({ status: 200, description: 'Rejected expense record' })
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

  @ApiOperation({ summary: 'Mark an approved expense as reimbursed', description: 'Moves the expense from approved → reimbursed.' })
  @ApiParam({ name: 'id', description: 'Expense UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Reimbursed expense record' })
  @Patch(':id/reimburse')
  async reimburseExpense(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(
      this.client.send('reimburse_expense', { id }),
    );
  }
}
