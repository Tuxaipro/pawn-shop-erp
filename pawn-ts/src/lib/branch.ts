import { AppError } from '../shared/errors.js';

export function assertLoanInBranch(loanBranchId: number, branchId: number) {
  if (loanBranchId !== branchId) {
    throw new AppError(403, 'BRANCH_FORBIDDEN', 'Loan does not belong to the selected branch');
  }
}
