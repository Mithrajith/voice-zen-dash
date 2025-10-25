import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client;
let db;

export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // Increased from 5000 to 30000
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Added connection timeout
    });

    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    
    db = client.db(process.env.MONGODB_DB_NAME || 'voice-zen-dash');
    
    // Create indexes for better performance
    await createIndexes();
    
    console.log('✅ MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Tip: Check your network connection and MongoDB Atlas IP whitelist');
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });

    // Tasks collection indexes
    await db.collection('tasks').createIndex({ userId: 1, dueDate: 1 });
    await db.collection('tasks').createIndex({ userId: 1, completed: 1 });
    await db.collection('tasks').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('tasks').createIndex({ recurringTaskId: 1 });

    // Transactions collection indexes
    await db.collection('transactions').createIndex({ userId: 1, date: -1 });
    await db.collection('transactions').createIndex({ userId: 1, type: 1 });
    await db.collection('transactions').createIndex({ userId: 1, category: 1 });

    // Recurring tasks collection indexes
    await db.collection('recurringTasks').createIndex({ userId: 1, isActive: 1 });
    await db.collection('recurringTasks').createIndex({ userId: 1, recurringType: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return db;
};

export const closeDB = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Handle connection errors
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});