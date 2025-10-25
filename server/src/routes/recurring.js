import express from 'express';
import Joi from 'joi';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const recurringTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').required(),
  recurringType: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).when('recurringType', {
    is: 'weekly',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  dayOfMonth: Joi.number().min(1).max(31).when('recurringType', {
    is: 'monthly',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  isActive: Joi.boolean().default(true)
});

const updateRecurringTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000).allow(''),
  priority: Joi.string().valid('low', 'medium', 'high'),
  recurringType: Joi.string().valid('daily', 'weekly', 'monthly'),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
  dayOfMonth: Joi.number().min(1).max(31),
  isActive: Joi.boolean()
});

// Get all recurring tasks for user
router.get('/', asyncHandler(async (req, res) => {
  const db = getDB();
  const { active, recurringType } = req.query;

  const filter = { userId: req.user._id };
  
  if (active !== undefined) {
    filter.isActive = active === 'true';
  }
  
  if (recurringType) {
    filter.recurringType = recurringType;
  }

  const recurringTasks = await db.collection('recurringTasks')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({
    success: true,
    data: { recurringTasks }
  });
}));

// Get single recurring task
router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid recurring task ID', 400);
  }

  const recurringTask = await db.collection('recurringTasks').findOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (!recurringTask) {
    throw new AppError('Recurring task not found', 404);
  }

  res.json({
    success: true,
    data: { recurringTask }
  });
}));

// Create new recurring task
router.post('/', asyncHandler(async (req, res) => {
  const { error, value } = recurringTaskSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  const newRecurringTask = {
    ...value,
    userId: req.user._id,
    startDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('recurringTasks').insertOne(newRecurringTask);

  const createdTask = await db.collection('recurringTasks').findOne({
    _id: result.insertedId
  });

  res.status(201).json({
    success: true,
    message: 'Recurring task created successfully',
    data: { recurringTask: createdTask }
  });
}));

// Update recurring task
router.patch('/:id', asyncHandler(async (req, res) => {
  const { error, value } = updateRecurringTaskSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid recurring task ID', 400);
  }

  const updateData = {
    ...value,
    updatedAt: new Date()
  };

  const result = await db.collection('recurringTasks').updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user._id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new AppError('Recurring task not found', 404);
  }

  const updatedTask = await db.collection('recurringTasks').findOne({
    _id: new ObjectId(req.params.id)
  });

  res.json({
    success: true,
    message: 'Recurring task updated successfully',
    data: { recurringTask: updatedTask }
  });
}));

// Delete recurring task
router.delete('/:id', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid recurring task ID', 400);
  }

  const result = await db.collection('recurringTasks').deleteOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (result.deletedCount === 0) {
    throw new AppError('Recurring task not found', 404);
  }

  res.json({
    success: true,
    message: 'Recurring task deleted successfully'
  });
}));

// Toggle recurring task active status
router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const db = getDB();
  
  if (!ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid recurring task ID', 400);
  }

  const recurringTask = await db.collection('recurringTasks').findOne({
    _id: new ObjectId(req.params.id),
    userId: req.user._id
  });

  if (!recurringTask) {
    throw new AppError('Recurring task not found', 404);
  }

  const result = await db.collection('recurringTasks').updateOne(
    { _id: new ObjectId(req.params.id) },
    { 
      $set: { 
        isActive: !recurringTask.isActive,
        updatedAt: new Date()
      }
    }
  );

  const updatedTask = await db.collection('recurringTasks').findOne({
    _id: new ObjectId(req.params.id)
  });

  res.json({
    success: true,
    message: `Recurring task ${updatedTask.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { recurringTask: updatedTask }
  });
}));

// Generate tasks from recurring tasks
router.post('/generate', asyncHandler(async (req, res) => {
  const db = getDB();
  const userId = req.user._id;
  const { forceGenerate = false } = req.body;
  
  const activeRecurringTasks = await db.collection('recurringTasks').find({
    userId,
    isActive: true
  }).toArray();

  const generatedTasks = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const recurringTask of activeRecurringTasks) {
    const shouldGenerate = forceGenerate || await shouldGenerateNewTask(recurringTask, now, userId);
    
    if (shouldGenerate) {
      const dueDate = calculateNextDueDate(recurringTask, now);
      
      const newTask = {
        title: recurringTask.title,
        description: recurringTask.description,
        dueDate,
        priority: recurringTask.priority,
        completed: false,
        userId,
        recurringTaskId: recurringTask._id,
        createdAt: now,
        updatedAt: now
      };

      const result = await db.collection('tasks').insertOne(newTask);
      const createdTask = await db.collection('tasks').findOne({ _id: result.insertedId });
      generatedTasks.push(createdTask);

      // Update lastGenerated
      await db.collection('recurringTasks').updateOne(
        { _id: recurringTask._id },
        { 
          $set: { 
            lastGenerated: today,
            updatedAt: now
          }
        }
      );
    }
  }

  res.json({
    success: true,
    message: `Generated ${generatedTasks.length} new tasks from recurring schedules`,
    data: { 
      generatedTasks,
      totalRecurringTasks: activeRecurringTasks.length,
      generatedCount: generatedTasks.length
    }
  });
}));

// Get recurring task statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const db = getDB();
  const userId = req.user._id;

  const [
    totalRecurring,
    activeRecurring,
    typeBreakdown,
    generatedTasksCount,
    recentGenerations
  ] = await Promise.all([
    // Total recurring tasks
    db.collection('recurringTasks').countDocuments({ userId }),
    
    // Active recurring tasks
    db.collection('recurringTasks').countDocuments({ userId, isActive: true }),
    
    // Type breakdown
    db.collection('recurringTasks').aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$recurringType', count: { $sum: 1 } } }
    ]).toArray(),
    
    // Generated tasks count (last 30 days)
    db.collection('tasks').countDocuments({
      userId,
      recurringTaskId: { $exists: true },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }),
    
    // Recent generations
    db.collection('tasks').find({
      userId,
      recurringTaskId: { $exists: true }
    }).sort({ createdAt: -1 }).limit(5).toArray()
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalRecurring,
        activeRecurring,
        inactiveRecurring: totalRecurring - activeRecurring
      },
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      generatedTasksLast30Days: generatedTasksCount,
      recentGenerations
    }
  });
}));

// Helper functions
async function shouldGenerateNewTask(recurringTask, now, userId) {
  const db = getDB();
  const today = now.toISOString().split('T')[0];
  
  // Check if we already generated a task today
  if (recurringTask.lastGenerated === today) {
    return false;
  }

  // Check if there's already a pending task for today from this recurring task
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const existingTask = await db.collection('tasks').findOne({
    userId,
    recurringTaskId: recurringTask._id,
    completed: false,
    dueDate: {
      $gte: todayStart,
      $lte: todayEnd
    }
  });

  if (existingTask) {
    return false;
  }

  switch (recurringTask.recurringType) {
    case 'daily':
      return true;
      
    case 'weekly':
      if (recurringTask.daysOfWeek && recurringTask.daysOfWeek.length > 0) {
        return recurringTask.daysOfWeek.includes(now.getDay());
      }
      return true;
      
    case 'monthly':
      if (recurringTask.dayOfMonth) {
        return now.getDate() === recurringTask.dayOfMonth;
      }
      return now.getDate() === new Date(recurringTask.startDate).getDate();
      
    default:
      return false;
  }
}

function calculateNextDueDate(recurringTask, baseDate) {
  const dueDate = new Date(baseDate);
  
  // Set time if specified
  if (recurringTask.time) {
    const [hours, minutes] = recurringTask.time.split(':').map(Number);
    dueDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to end of day if no time specified
    dueDate.setHours(23, 59, 0, 0);
  }

  return dueDate;
}

export default router;