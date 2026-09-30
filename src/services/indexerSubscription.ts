/**
 * Umbra Protocol - Resilient Midnight GraphQL Indexer Service
 * Provides queries, health checks, and exponential-backoff polling for contract state.
 */

export interface ContractStateQueryResponse {
  address: string;
  state?: string;
  height?: number;
}

export class IndexerService {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || 'https://indexer.preview.midnight.network/api/v4/graphql';
  }

  /**
   * Health check to verify indexer connectivity
   */
  async checkHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { block { height } }'
        })
      });
      const latencyMs = Date.now() - start;
      return { healthy: response.ok, latencyMs };
    } catch {
      return { healthy: false, latencyMs: -1 };
    }
  }

  /**
   * Query contract state with resilient retry logic
   */
  async queryContractState(address: string, maxRetries = 3): Promise<ContractStateQueryResponse | null> {
    const query = `
      query GetContractState($addr: String!) {
        contractAction(address: $addr) {
          address
          state
        }
      }
    `;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { addr: address } })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.data?.contractAction || null;
      } catch (err) {
        if (attempt === maxRetries) {
          console.warn(`[IndexerService] Failed to query contract ${address} after ${maxRetries} attempts`);
          return null;
        }
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 5000)));
      }
    }
    return null;
  }
}

export const indexerService = new IndexerService();
