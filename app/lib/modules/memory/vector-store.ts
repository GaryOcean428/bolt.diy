import { ChromaClient } from 'chromadb';

/**
 * Represents a document to be stored in the vector database
 * @interface VectorDocument
 */

export interface VectorDocument {
  /** Unique identifier for the document */
  id: string;

  /** Main content of the document */
  content: string;

  /** Additional metadata associated with the document */
  metadata: Record<string, unknown>;

  /** Optional embedding vector */
  embedding?: number[];
}

/**
 * Manages vector storage operations using ChromaDB
 * @class VectorStore
 */

export class VectorStore {
  private _client!: ChromaClient;

  // TODO: Replace any with proper Collection type once chromadb exports it
  private _collection!: any;

  constructor() {
    // Initialization deferred to initialize() method
  }

  /**
   * Initializes the vector store connection and collection
   * @throws {Error} If connection to ChromaDB fails
   */

  async initialize(): Promise<void> {
    try {
      this._client = new ChromaClient({
        path: 'http://localhost:8000',
      });

      this._collection = await this._client.getOrCreateCollection({
        name: 'bolt_memory',
        metadata: {
          description: 'Bolt project memory store',
          created: new Date().toISOString(),
        },
      });
    } catch (error) {
      throw new Error(`Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stores a document in the vector database
   * @param {VectorDocument} document - Document to store
   * @throws {Error} If document storage fails
   */

  async store(document: VectorDocument): Promise<void> {
    try {
      const { id, content, metadata, embedding } = document;

      await this._collection.add({
        ids: [id],
        embeddings: embedding ? [embedding] : undefined,
        metadatas: [metadata],
        documents: [content],
      });
    } catch (error) {
      throw new Error(`Failed to store document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Queries the vector database for similar documents
   * @param {string} queryText - Text to search for
   * @param {number} numResults - Maximum number of results to return
   * @returns {Promise<VectorDocument[]>} Array of matching documents
   * @throws {Error} If query operation fails
   */

  async query(queryText: string, numResults = 5): Promise<VectorDocument[]> {
    try {
      const results = await this._collection.query({
        queryTexts: [queryText],
        nResults: numResults,
      });

      // Return empty array if no results found
      if (!results.documents?.[0]) {
        return [];
      }

      // Map ChromaDB results to VectorDocument format
      return results.documents[0].map((content: string, i: number) => ({
        id: results.ids[0][i],
        content,
        metadata: results.metadatas?.[0]?.[i] || {},
      }));
    } catch (error) {
      throw new Error(`Failed to query documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnects from the vector store
   * Note: ChromaDB client doesn't require explicit disconnection
   */

  async disconnect(): Promise<void> {
    // Method kept for interface consistency and future implementation
  }
}
