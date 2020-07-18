// import AppError from '../errors/AppError';

import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';

interface ResponseDTO {
  transaction_id: string;
}
class DeleteTransactionService {
  public async execute({ transaction_id }: ResponseDTO): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const transaction = await transactionRepository.findOne(transaction_id);
    console.log(transaction);
    if (!transaction) {
      throw new AppError('transaction not found');
    }

    await transactionRepository.remove(transaction);
  }
}
export default DeleteTransactionService;
