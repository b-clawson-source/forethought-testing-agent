"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class DatabaseService {
    constructor() {
        this.db = null;
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    static async initialize() {
        const instance = DatabaseService.getInstance();
        await instance.connect();
        await instance.createTables();
    }
    async connect() {
        try {
            const dbPath = process.env.DB_PATH || './data/testing-agent.db';
            const dbDir = path_1.default.dirname(dbPath);
            // Ensure data directory exists
            await promises_1.default.mkdir(dbDir, { recursive: true });
            this.db = await (0, sqlite_1.open)({
                filename: dbPath,
                driver: sqlite3_1.default.Database
            });
            // Enable foreign keys
            await this.db.exec('PRAGMA foreign_keys = ON');
            console.log(`Database connected: ${dbPath}`);
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }
    async createTables() {
        if (!this.db)
            throw new Error('Database not connected');
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
        }
        catch (error) {
            console.error('Failed to create database tables:', error);
            throw error;
        }
    }
    async getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
    static close() {
        const instance = DatabaseService.getInstance();
        if (instance.db) {
            instance.db.close();
            instance.db = null;
            console.log('Database connection closed');
        }
    }
}
exports.DatabaseService = DatabaseService;
