import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;

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
      
      console.log(`Database connected: ${dbPath}`);
    } catch (error) {
      console.error('Database connection failed:', error);
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

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create database tables:', error);
      throw error;
    }
  }

  public async getDatabase(): Promise<Database> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  public static close(): void {
    const instance = DatabaseService.getInstance();
    if (instance.db) {
      instance.db.close();
      instance.db = null;
      console.log('Database connection closed');
    }
  }
}