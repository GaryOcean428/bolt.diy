export interface MemoryConfig {
  // Vector Storage (ChromaDB)
  vectorDb: {
    host: string;
    port: number;
    collection: string;
  };

  // Short-term Memory (Redis)
  redis?: {
    host: string;
    port: number;
    password?: string;
    ttl: number; // Time to live in seconds
  };

  // Long-term Memory (SQL)
  sql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
}

export interface MemoryRecord {
  id: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export const defaultConfig: MemoryConfig = {
  vectorDb: {
    host: 'localhost',
    port: 8000,
    collection: 'bolt_memory',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    ttl: 3600, // 1 hour
  },
  sql: {
    host: 'localhost',
    port: 5432,
    database: 'bolt_memory',
    username: 'bolt_user',
    password: process.env.BOLT_DB_PASSWORD || 'default_password',
  },
};
