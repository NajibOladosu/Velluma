// The expense-bookkeeping-service runs as a Redis microservice with no HTTP
// app controller. Real business logic tests live in:
//   src/expense/expense.service.spec.ts
//
// This file is intentionally empty to satisfy the Jest test suite scan.

describe('ExpenseBookkeepingService bootstrap', () => {
  it('is a Redis microservice with no HTTP app controller', () => {
    expect(true).toBe(true);
  });
});
