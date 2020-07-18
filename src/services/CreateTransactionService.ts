import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);
    const balance = await transactionRepository.getBalance();
    if (type !== 'outcome' && type !== 'income') {
      throw new AppError(
        'Transaction with incorrect type. Accepted income or outcome',
        400,
      );
    }
    if (type === 'outcome' && balance.total < value) {
      throw new AppError('Insufficient limit!', 400);
    }
    let categoryTransaction = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryTransaction) {
      categoryTransaction = categoryRepository.create({
        title: category,
      });
    }
    await categoryRepository.save(categoryTransaction);

    const newTransaction = transactionRepository.create({
      title,
      type,
      value,
      category_id: categoryTransaction.id,
    });
    await transactionRepository.save(newTransaction);

    return newTransaction;
  }
}

export default CreateTransactionService;
