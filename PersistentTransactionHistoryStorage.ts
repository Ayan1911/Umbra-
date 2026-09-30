import { InMemoryTransactionHistoryStorage, TransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { WalletEntrySchema } from '@midnight-ntwrk/wallet-sdk-facade';
import * as fs from 'fs';
import * as path from 'path';

export class PersistentTransactionHistoryStorage {
  static async create(filePath: string): Promise<TransactionHistoryStorage<any>> {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const serialized = JSON.parse(data);
        console.log(`[Storage] Restored wallet state from ${filePath}`);
        
        const storage = InMemoryTransactionHistoryStorage.restore(serialized, WalletEntrySchema);
        
        // Setup an interval to save state periodically, or we could wrap the writers
        setInterval(async () => {
          const newState = await storage.serialize();
          fs.writeFileSync(filePath, JSON.stringify(newState, null, 2));
        }, 5000);
        
        return storage;
      }
    } catch (err) {
      console.warn(`[Storage] Failed to restore from ${filePath}, starting fresh:`, err);
    }
    
    console.log(`[Storage] Starting fresh wallet state.`);
    const storage = new InMemoryTransactionHistoryStorage(WalletEntrySchema);
    
    setInterval(async () => {
      const newState = await storage.serialize();
      fs.writeFileSync(filePath, JSON.stringify(newState, null, 2));
    }, 5000);
    
    return storage;
  }
}
