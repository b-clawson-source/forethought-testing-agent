import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { LoggerService } from './loggerService';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private logger = LoggerService.getInstance();

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = DatabaseService.getInstance();
    await instance.connect();
    await instance.createTables();
  }

  public static close(): void {
    const instance = DatabaseService.getInstance();
    instance.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const dbPath = process.env.DB_PATH || './data/testing-agent.db';
      const dbDir = path.dirname(dbPath);
      
      // Ensure data directory exists
      await fs.mkdir(dbDir, { recursive: true });

      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');
      
      this.logger.info(`Database connected: ${dbPath}`);
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    try {
      // Conversation sessions table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_sessions (
          id TEXT PRIMARY KEY,
          initial_prompt TEXT NOT NULL,
          persona TEXT NOT NULL,
          status TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          configuration TEXT NOT NULL,
          analysis TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Conversation messages table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES conversation_sessions (id) ON DELETE CASCADE
        )
      `);

      // Test scenarios table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS test_scenarios (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          template TEXT NOT NULL,
          expected_outcomes TEXT,
          priority TEXT DEFAULT 'medium',
          tags TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Policy rules table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS policy_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          rule_type TEXT NOT NULL,
          conditions TEXT NOT NULL,
          severity TEXT DEFAULT 'medium',
          enabled BOOLEAN DEFAULT TRUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // LLM metrics table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS llm_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          prompt_tokens INTEGER NOT NULL,
          completion_tokens INTEGER NOT NULL,
          total_tokens INTEGER NOT NULL,
          response_time INTEGER NOT NULL,
          cost_estimate REAL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES conversation_sessions (id) ON DELETE SET NULL
        )
      `);

      // Create indexes for better performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON conversation_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON conversation_messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON conversation_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON conversation_sessions(created_at);
        CREATE INDEX IF NOT EXISTS idx_metrics_session_id ON llm_metrics(session_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON llm_metrics(timestamp);
      `);

      this.logger.info('Database tables created successfully');
    } catch (error) {
      this.logger.error('Failed to create database tables:', error);
      throw error;
    }
  }

  public async getDatabase(): Promise<Database> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('Database connection closed');
    }
  }

  // Utility methods for common operations
  public async transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await this.getDatabase();
    try {
      await db.exec('BEGIN TRANSACTION');
      const result = await fn(db);
      await db.exec('COMMIT');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      await db.get('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }
}