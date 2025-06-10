import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

export class ShortTermMemory {
  private _client: RedisClientType;

  constructor() {
    this._client = createClient();
  }

  async initialize(): Promise<void> {
    if (!this._client.isOpen) {
      await this._client.connect();
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.initialize();

    if (ttl) {
      await this._client.set(key, value, { EX: ttl });
    } else {
      await this._client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    await this.initialize();
    return this._client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.initialize();
    await this._client.del(key);
  }

  async clear(): Promise<void> {
    await this.initialize();
    await this._client.flushDb();
  }

  async disconnect(): Promise<void> {
    if (this._client.isOpen) {
      await this._client.quit();
    }
  }
}
