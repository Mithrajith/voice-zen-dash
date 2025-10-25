import express from 'express';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const taskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).allow(''),
  dueDate: Joi.date().iso().required(),
  priority: Joi.string().valid('low', 'medium', 'high').required(),
  completed: Joi.boolean().default(false),
  recurringTaskId: Joi.string().optional()
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000).allow(''),
  dueDate: Joi.date().iso(),
  priority: Joi.string().valid('low', 'medium', 'high'),
  completed: Joi.boolean()
});

// Get all tasks for user
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const { page = 1, limit = 50, completed, priority, search, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;

  const filter = { userId: req.user._id };
  
  // Add filters
  if (completed !== undefined) {
    filter.completed = completed === 'true';
  }
  
  if (priority) {
    filter.priority = priority;
  }
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [tasks, totalTasks] = await Promise.all([
    db.collection('tasks')
      .find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray(),
    db.collection('tasks').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTasks / parseInt(limit)),
        totalTasks,
        hasNext: skip + tasks.length < totalTasks,
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// Get single task
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid task ID', 400);
  }

  const task = await db.collection('tasks').findOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    success: true,
    data: { task }
  });
}));

// Create new task
router.post('/', asyncHandler(async (req, res) => {
  const { error, value } = taskSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  const newTask = {
    ...value,
    userId: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('tasks').insertOne(newTask);

  const createdTask = await db.collection('tasks').findOne({
    _id: result.insertedId
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task: createdTask }
  });
}));

// Update task
router.patch('/:id', asyncHandler(async (req, res) => {
  const { error, value } = updateTaskSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid task ID', 400);
  }

  const updateData = {
    ...value,
    updatedAt: new Date()
  };

  const result = await db.collection('tasks').updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user._id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new AppError('Task not found', 404);
  }

  const updatedTask = await db.collection('tasks').findOne({
    _id: new ObjectId(req.params.id)
  });

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: { task: updatedTask }
  });
}));

// Delete task
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid task ID', 400);
  }

  const result = await db.collection('tasks').deleteOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (result.deletedCount === 0) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

// Bulk operations
router.post('/bulk', asyncHandler(async (req, res) => {
  const { action, taskIds } = req.body;
  
  if (!action || !taskIds || !Array.isArray(taskIds)) {
    throw new AppError('Invalid bulk operation parameters', 400);
  }

  const db = getDB();
  const objectIds = taskIds.map(id => {
    if (!ObjectId.isValid(id)) {
      throw new AppError(`Invalid task ID: ${id}`, 400);
    }
    return new ObjectId(id);
  });

  const filter = {
    _id: { $in: objectIds },
    userId: req.user._id
  };

  let result;
  
  switch (action) {
    case 'complete':
      result = await db.collection('tasks').updateMany(
        filter,
        { $set: { completed: true, updatedAt: new Date() } }
      );
      break;
      
    case 'incomplete':
      result = await db.collection('tasks').updateMany(
        filter,
        { $set: { completed: false, updatedAt: new Date() } }
      );
      break;
      
    case 'delete':
      result = await db.collection('tasks').deleteMany(filter);
      break;
      
    default:
      throw new AppError('Invalid bulk action', 400);
  }

  res.json({
    success: true,
    message: `Bulk ${action} completed successfully`,
    data: {
      modifiedCount: result.modifiedCount || result.deletedCount,
      requestedCount: taskIds.length
    }
  });
}));

// Get task statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const db = getDB();
  const userId = req.user._id;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalTasks,
    completedTasks,
    todayTasks,
    overdueTasks,
    upcomingTasks,
    priorityStats,
    completionStats
  ] = await Promise.all([
    // Total tasks
    db.collection('tasks').countDocuments({ userId }),
    
    // Completed tasks
    db.collection('tasks').countDocuments({ userId, completed: true }),
    
    // Today's tasks
    db.collection('tasks').countDocuments({
      userId,
      dueDate: {
        $gte: today,
        $lt: tomorrow
      }
    }),
    
    // Overdue tasks
    db.collection('tasks').countDocuments({
      userId,
      completed: false,
      dueDate: { $lt: today }
    }),
    
    // Upcoming tasks (next 7 days)
    db.collection('tasks').countDocuments({
      userId,
      completed: false,
      dueDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }),
    
    // Priority breakdown
    db.collection('tasks').aggregate([
      { $match: { userId, completed: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]).toArray(),
    
    // Completion rate over time
    db.collection('tasks').aggregate([
      { $match: { userId, createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]).toArray()
  ]);

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  res.json({
    success: true,
    data: {
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        completionRate: Math.round(completionRate * 100) / 100
      },
      today: {
        totalTasks: todayTasks,
        overdueTasks,
        upcomingTasks
      },
      priorityBreakdown: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      completionTrend: completionStats
    }
  });
}));

export default router;