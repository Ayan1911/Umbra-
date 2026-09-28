import { WalletFacade, NetworkId, ShieldedWallet, UnshieldedWallet, DustWallet, createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { DustParameters } from '@midnight-ntwrk/ledger-v8';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function main() {
  const seedHex = process.env.WALLET_SEED;
  if (!seedHex) throw new Error('WALLET_SEED missing in .env');
  const seed = Buffer.from(seedHex, 'hex');
  const networkId = NetworkId.NetworkId.PreProd;
  const keystore = createKeystore(seed, networkId);
  
  // Set global network ID for ledger WASM
  const { setNetworkId, NetworkId: netId } = await import('@midnight-ntwrk/midnight-js-network-id');
  setNetworkId(netId.TestNet);
  
  const config = {
    networkId,
    indexerClientConnection: {
      indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
      indexerHttpUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    },
    nodeClientConnection: {
      rpcUrl: 'https://rpc.preprod.midnight.network'
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    provingServerUrl: 'http://127.0.0.1:6300'
  };
  
  const dustParams = new DustParameters(100n, 100n, 100n, 100n); // Dummy parameters for local init

  console.log('Initializing WalletFacade...');
  const facade = await WalletFacade.init({
    configuration: config,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(seed),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
    dust: (cfg) => DustWallet(cfg).startWithSeed(seed, dustParams)
  });
  
  console.log('Starting Facade...');
  await facade.start(keystore.shieldedSecretKeys, keystore.dustSecretKey);
  
  console.log('Waiting for state sync...');
  
  facade.state().subscribe({
    next: state => {
      const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
      console.log(`[SYNC STATE] isSynced: ${state.isSynced} | Shielded: ${JSON.stringify(state.shielded.progress, replacer)} | Unshielded: ${JSON.stringify(state.unshielded.progress, replacer)} | Dust: ${JSON.stringify(state.dust.progress, replacer)}`);
      if (state.isSynced) {
        console.log('Unshielded Balances:', state.unshielded.balances);
        console.log('Dust Balances:', state.dust.balances);
        process.exit(0);
      }
    },
    error: err => {
      console.error('State Subscription Error:', err);
    }
  });
}

main().catch(console.error);
