import { LongTermMemory } from './long-term-memory';
import { ShortTermMemory } from './short-term-memory';
import { VectorStore, type VectorDocument } from './vector-store';

export interface MemoryRecord {
  id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export class MemoryManager {
  private readonly _shortTerm: ShortTermMemory;
  private readonly _longTerm: LongTermMemory;
  private readonly _vectorStore: VectorStore;

  constructor() {
    this._shortTerm = new ShortTermMemory();
    this._longTerm = new LongTermMemory({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/bolt',
    });
    this._vectorStore = new VectorStore();
  }

  async initialize(): Promise<void> {
    await Promise.all([this._shortTerm.initialize(), this._longTerm.initialize(), this._vectorStore.initialize()]);
  }

  async store(record: MemoryRecord): Promise<void> {
    await this._shortTerm.set(record.id, JSON.stringify(record));

    const vectorDoc: VectorDocument = {
      id: record.id,
      content: record.content,
      metadata: record.metadata || {},
    };

    await this._vectorStore.store(vectorDoc);
  }

  async query(query: string): Promise<MemoryRecord[]> {
    const results = await this._vectorStore.query(query);
    return results.map((result) => ({
      id: result.id,
      type: typeof result.metadata.type === 'string' ? result.metadata.type : 'unknown',
      content: result.content,
      metadata: result.metadata,
      timestamp: new Date(
        typeof result.metadata.timestamp === 'string' || typeof result.metadata.timestamp === 'number'
          ? result.metadata.timestamp
          : Date.now(),
      ),
    }));
  }

  async disconnect(): Promise<void> {
    await Promise.all([this._shortTerm.disconnect(), this._longTerm.disconnect(), this._vectorStore.disconnect()]);
  }
}
