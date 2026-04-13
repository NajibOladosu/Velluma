import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExpenseService } from './expense.service';

@Controller()
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @MessagePattern('create_expense')
  async createExpense(@Payload() data: any) {
    return this.expenseService.createExpense(data);
  }

  @MessagePattern('list_expenses')
  async listExpenses(@Payload() data: { projectId: string; tenantId: string }) {
    return this.expenseService.listExpenses(data);
  }

  @MessagePattern('update_expense')
  async updateExpense(@Payload() data: { id: string; updates: any }) {
    return this.expenseService.updateExpense(data.id, data.updates);
  }

  @MessagePattern('delete_expense')
  async deleteExpense(@Payload() data: { id: string }) {
    return this.expenseService.deleteExpense(data.id);
  }

  @MessagePattern('get_expense_summary')
  async getExpenseSummary(
    @Payload() data: { projectId: string; tenantId: string },
  ) {
    return this.expenseService.getExpenseSummary(data);
  }
}
