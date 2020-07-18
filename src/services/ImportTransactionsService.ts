import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class ImportTransactionsService {
  async execute(filepath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const categoryRepository = getRepository(Category);

    const concatsReadStream = fs.createReadStream(filepath);
    const parsers = csvParse({ from_line: 2 });
    const parseCSV = concatsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;
      categories.push(category);

      transactions.push({ title, value, type, category });
    });
    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesExist = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });
    const categoryTitlesExist = categoriesExist.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !categoryTitlesExist.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);
    const finalCategories = [...newCategories, ...categoriesExist];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filepath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
