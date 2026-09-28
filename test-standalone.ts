import { WalletFacade, NetworkId, ShieldedWallet, UnshieldedWallet, DustWallet, createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { DustParameters } from '@midnight-ntwrk/ledger-v8';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const seedHex = process.env.WALLET_SEED || '1dec0dd58fbe4d3206ef960aebff95a77e09dffbd19f3e9439d23fe6de4fcdd1'; // Dummy seed for standalone
  const seed = Buffer.from(seedHex, 'hex');
  // Standalone uses Undeployed
  const networkId = NetworkId.NetworkId.Undeployed;
  const keystore = createKeystore(seed, networkId);
  
  const config = {
    networkId,
    indexerClientConnection: {
      indexerWsUrl: 'ws://127.0.0.1:8088/api/v1/graphql/ws',
      indexerHttpUrl: 'http://127.0.0.1:8088/api/v1/graphql',
    },
    nodeClientConnection: {
      rpcUrl: 'http://127.0.0.1:9944'
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    provingServerUrl: 'http://127.0.0.1:6300'
  };
  
  const dustParams = new DustParameters(100n, 100n, 100n, 100n);

  console.log('Initializing WalletFacade on standalone...');
  const facade = await WalletFacade.init({
    configuration: config,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(seed),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
    dust: (cfg) => DustWallet(cfg).startWithSeed(seed, dustParams)
  });
  
  console.log('Starting Facade...');
  await facade.start(keystore.shieldedSecretKeys, keystore.dustSecretKey);
  
  facade.state().subscribe({
    next: state => {
      const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
      console.log(`[SYNC STATE] isSynced: ${state.isSynced} | Shielded: ${JSON.stringify(state.shielded.progress, replacer)}`);
      if (state.isSynced) {
        console.log('✅ Synced to local standalone network!');
        process.exit(0);
      }
    },
    error: err => {
      console.error('State Subscription Error:', err);
    }
  });
}

main().catch(console.error);
