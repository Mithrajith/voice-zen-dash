import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { getDB } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register user
router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { name, email, password } = value;
  const db = getDB();

  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const newUser = {
    name,
    email,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: {
      theme: 'system',
      notifications: true,
      reminderFrequency: 3, // hours
      defaultTaskPriority: 'medium',
      defaultBudgetCategory: 'other'
    }
  };

  const result = await db.collection('users').insertOne(newUser);

  // Generate JWT token
  const token = jwt.sign(
    { userId: result.insertedId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: result.insertedId,
        name,
        email,
        preferences: newUser.preferences
      },
      token
    }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = value;
  const db = getDB();

  // Find user
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Update last login
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date() } }
  );

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences || {}
      },
      token
    }
  });
}));

// Get current user
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const db = getDB();
  
  const user = await db.collection('users').findOne(
    { _id: decoded.userId },
    { projection: { password: 0 } }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences || {},
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }
  });
}));

// Update user preferences
router.patch('/preferences', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const db = getDB();

  const allowedPreferences = [
    'theme', 'notifications', 'reminderFrequency', 
    'defaultTaskPriority', 'defaultBudgetCategory'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedPreferences.includes(key)) {
      updates[`preferences.${key}`] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid preferences provided', 400);
  }

  updates.updatedAt = new Date();

  await db.collection('users').updateOne(
    { _id: decoded.userId },
    { $set: updates }
  );

  const updatedUser = await db.collection('users').findOne(
    { _id: decoded.userId },
    { projection: { password: 0 } }
  );

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: updatedUser.preferences
    }
  });
}));

export default router;