import express from 'express';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const transactionSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  reason: Joi.string().min(1).max(200).required(),
  category: Joi.string().min(1).max(50).required(),
  date: Joi.date().iso().required()
});

const updateTransactionSchema = Joi.object({
  amount: Joi.number().positive(),
  type: Joi.string().valid('income', 'expense'),
  reason: Joi.string().min(1).max(200),
  category: Joi.string().min(1).max(50),
  date: Joi.date().iso()
});

const budgetLimitSchema = Joi.object({
  category: Joi.string().min(1).max(50).required(),
  monthlyLimit: Joi.number().positive().required(),
  alertThreshold: Joi.number().min(0).max(100).default(80) // Percentage
});

// Get all transactions for user
router.get('/transactions', asyncHandler(async (req, res) => {
  const db = getDB();
  const { 
    page = 1, 
    limit = 50, 
    type, 
    category, 
    startDate, 
    endDate, 
    search,
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  const filter = { userId: req.user._id };
  
  // Add filters
  if (type) {
    filter.type = type;
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  if (search) {
    filter.reason = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [transactions, totalTransactions] = await Promise.all([
    db.collection('transactions')
      .find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray(),
    db.collection('transactions').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTransactions / parseInt(limit)),
        totalTransactions,
        hasNext: skip + transactions.length < totalTransactions,
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// Get single transaction
router.get('/transactions/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid transaction ID', 400);
  }

  const transaction = await db.collection('transactions').findOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  res.json({
    success: true,
    data: { transaction }
  });
}));

// Create new transaction
router.post('/transactions', asyncHandler(async (req, res) => {
  const { error, value } = transactionSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  const newTransaction = {
    ...value,
    userId: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('transactions').insertOne(newTransaction);

  const createdTransaction = await db.collection('transactions').findOne({
    _id: result.insertedId
  });

  // Check budget limits if it's an expense
  if (value.type === 'expense') {
    await checkBudgetLimits(req.user._id, value.category, value.amount);
  }

  res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    data: { transaction: createdTransaction }
  });
}));

// Update transaction
router.patch('/transactions/:id', asyncHandler(async (req, res) => {
  const { error, value } = updateTransactionSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid transaction ID', 400);
  }

  const updateData = {
    ...value,
    updatedAt: new Date()
  };

  const result = await db.collection('transactions').updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user._id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new AppError('Transaction not found', 404);
  }

  const updatedTransaction = await db.collection('transactions').findOne({
    _id: new ObjectId(req.params.id)
  });

  res.json({
    success: true,
    message: 'Transaction updated successfully',
    data: { transaction: updatedTransaction }
  });
}));

// Delete transaction
router.delete('/transactions/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid transaction ID', 400);
  }

  const result = await db.collection('transactions').deleteOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (result.deletedCount === 0) {
    throw new AppError('Transaction not found', 404);
  }

  res.json({
    success: true,
    message: 'Transaction deleted successfully'
  });
}));

// Get budget statistics (overview)
router.get('/overview', asyncHandler(async (req, res) => {
  const db = getDB();
  const userId = req.user._id;
  const { startDate: queryStartDate, endDate: queryEndDate } = req.query;
  
  let startDate;
  let endDate = new Date();
  
  // Use provided dates or default to current month
  if (queryStartDate && queryEndDate) {
    startDate = new Date(queryStartDate);
    endDate = new Date(queryEndDate);
  } else {
    startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  }

  const [
    incomeStats,
    expenseStats,
    categoryStats,
    budgetLimits
  ] = await Promise.all([
    // Income statistics
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'income',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]).toArray(),

    // Expense statistics
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]).toArray(),

    // Category breakdown
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray(),

    // Get budget limits
    db.collection('budgetLimits').find({ userId }).toArray()
  ]);

  const income = incomeStats[0] || { total: 0, count: 0, average: 0 };
  const expenses = expenseStats[0] || { total: 0, count: 0, average: 0 };
  const netBalance = income.total - expenses.total;

  res.json({
    success: true,
    data: {
      totalIncome: income.total,
      totalExpenses: expenses.total,
      balance: netBalance,
      savingsRate: income.total > 0 ? ((netBalance / income.total) * 100) : 0,
      incomeCount: income.count,
      expenseCount: expenses.count,
      categoryBreakdown: categoryStats.map(cat => ({
        category: cat._id,
        amount: cat.total,
        count: cat.count
      })),
      budgetLimits
    }
  });
}));

// Get budget statistics (detailed stats)
router.get('/stats', asyncHandler(async (req, res) => {
  const db = getDB();
  const userId = req.user._id;
  const { period = 'month' } = req.query;
  
  let startDate;
  const endDate = new Date();
  
  switch (period) {
    case 'week':
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(endDate.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  }

  const [
    incomeStats,
    expenseStats,
    categoryStats,
    trendData,
    budgetLimits
  ] = await Promise.all([
    // Income statistics
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'income',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]).toArray(),

    // Expense statistics
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]).toArray(),

    // Category breakdown
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray(),

    // Daily/Monthly trend data
    db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: period === 'year' 
              ? { $dateToString: { format: '%Y-%m', date: '$date' } }
              : { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]).toArray(),

    // Get budget limits
    db.collection('budgetLimits').find({ userId }).toArray()
  ]);

  const income = incomeStats[0] || { total: 0, count: 0, average: 0 };
  const expenses = expenseStats[0] || { total: 0, count: 0, average: 0 };
  const netBalance = income.total - expenses.total;

  // Check budget alerts
  const budgetAlerts = await checkAllBudgetLimits(userId, categoryStats, budgetLimits);

  res.json({
    success: true,
    data: {
      period,
      summary: {
        income: income.total,
        expenses: expenses.total,
        netBalance,
        savingsRate: income.total > 0 ? ((netBalance / income.total) * 100) : 0
      },
      categoryBreakdown: categoryStats,
      trend: trendData,
      budgetLimits,
      budgetAlerts
    }
  });
}));

// Budget limits management
router.get('/limits', asyncHandler(async (req, res) => {
  const db = getDB();
  const budgetLimits = await db.collection('budgetLimits').find({
    userId: req.user._id
  }).toArray();

  res.json({
    success: true,
    data: { budgetLimits }
  });
}));

router.post('/limits', asyncHandler(async (req, res) => {
  const { error, value } = budgetLimitSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  
  // Check if limit already exists for this category
  const existingLimit = await db.collection('budgetLimits').findOne({
    userId: req.user._id,
    category: value.category
  });

  if (existingLimit) {
    throw new AppError('Budget limit already exists for this category', 400);
  }

  const newLimit = {
    ...value,
    userId: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('budgetLimits').insertOne(newLimit);
  const createdLimit = await db.collection('budgetLimits').findOne({
    _id: result.insertedId
  });

  res.status(201).json({
    success: true,
    message: 'Budget limit created successfully',
    data: { budgetLimit: createdLimit }
  });
}));

router.patch('/limits/:id', asyncHandler(async (req, res) => {
  const { error, value } = budgetLimitSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid budget limit ID', 400);
  }

  const updateData = {
    ...value,
    updatedAt: new Date()
  };

  const result = await db.collection('budgetLimits').updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user._id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new AppError('Budget limit not found', 404);
  }

  const updatedLimit = await db.collection('budgetLimits').findOne({
    _id: new ObjectId(req.params.id)
  });

  res.json({
    success: true,
    message: 'Budget limit updated successfully',
    data: { budgetLimit: updatedLimit }
  });
}));

router.delete('/limits/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid budget limit ID', 400);
  }

  const result = await db.collection('budgetLimits').deleteOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (result.deletedCount === 0) {
    throw new AppError('Budget limit not found', 404);
  }

  res.json({
    success: true,
    message: 'Budget limit deleted successfully'
  });
}));

// Helper functions
async function checkBudgetLimits(userId, category, amount) {
  const db = getDB();
  
  const budgetLimit = await db.collection('budgetLimits').findOne({
    userId,
    category
  });

  if (!budgetLimit) return null;

  // Get current month spending for this category
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlySpending = await db.collection('transactions').aggregate([
    {
      $match: {
        userId,
        category,
        type: 'expense',
        date: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]).toArray();

  const currentSpending = monthlySpending[0]?.total || 0;
  const spendingPercentage = (currentSpending / budgetLimit.monthlyLimit) * 100;

  if (spendingPercentage >= budgetLimit.alertThreshold) {
    // Could trigger notification here
    console.log(`Budget alert: ${category} spending at ${spendingPercentage.toFixed(1)}%`);
  }

  return {
    category,
    currentSpending,
    limit: budgetLimit.monthlyLimit,
    percentage: spendingPercentage,
    isOverBudget: spendingPercentage >= 100
  };
}

async function checkAllBudgetLimits(userId, categoryStats, budgetLimits) {
  const alerts = [];
  
  for (const limit of budgetLimits) {
    const categoryStat = categoryStats.find(stat => stat._id === limit.category);
    if (categoryStat) {
      const percentage = (categoryStat.total / limit.monthlyLimit) * 100;
      
      if (percentage >= limit.alertThreshold) {
        alerts.push({
          category: limit.category,
          currentSpending: categoryStat.total,
          limit: limit.monthlyLimit,
          percentage,
          isOverBudget: percentage >= 100,
          alertThreshold: limit.alertThreshold
        });
      }
    }
  }
  
  return alerts;
}

export default router;