import { Pool } from 'pg';
import type { MemoryRecord } from './memory-manager';

export class LongTermMemory {
  private _pool: Pool;

  constructor(config: { connectionString: string }) {
    this._pool = new Pool({
      connectionString: config.connectionString,
    });
  }

  async initialize(): Promise<void> {
    // Verify connection
    const client = await this._pool.connect();

    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }
  }

  async store(record: MemoryRecord): Promise<void> {
    const client = await this._pool.connect();

    try {
      await client.query('INSERT INTO memories (id, type, content, metadata, timestamp) VALUES ($1, $2, $3, $4, $5)', [
        record.id,
        record.type,
        record.content,
        record.metadata,
        record.timestamp,
      ]);
    } finally {
      client.release();
    }
  }

  async query(type: string): Promise<MemoryRecord[]> {
    const client = await this._pool.connect();

    try {
      const result = await client.query('SELECT * FROM memories WHERE type = $1', [type]);
      return result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        content: row.content,
        metadata: row.metadata,
        timestamp: row.timestamp,
      }));
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this._pool.end();
  }
}
