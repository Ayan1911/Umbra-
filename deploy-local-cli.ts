import "core-js/proposals/iterator-helpers.js";
import "dotenv/config";
import { WalletFacade, NetworkId, ShieldedWallet, UnshieldedWallet, DustWallet, createKeystore, PublicKey, WalletSeeds } from '@midnight-ntwrk/wallet-sdk';
import { WalletTransaction } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { DustParameters } from '@midnightntwrk/ledger-v9';
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { firstValueFrom } from "rxjs";
import { ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } from '@midnightntwrk/wallet-sdk-address-format';
import { createWalletProvider, createMidnightProvider } from "@midnight-ntwrk/midnight-js-types";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { Contract } from "./contract/build/contract/index.js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptForSeed(): Promise<string> {
  return new Promise((resolve) => {
    rl.question('Please enter your wallet seed phrase: ').then((answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  let seedHex = process.env.WALLET_SEED;
  if (!seedHex) {
    seedHex = await promptForSeed();
  }
  rl.close();
  if (!seedHex) throw new Error("Seed phrase cannot be empty!");
  
  const seed = Buffer.from(seedHex, 'hex');

  // 1. Configure for Local
  const networkId = NetworkId.NetworkId.LocalNode;
  setNetworkId("undeclared");
  const keystore = createKeystore({ kind: 'schnorr', secret: seed }, networkId);
  
  const config = {
    networkId,
    indexerClientConnection: {
      indexerWsUrl: 'ws://127.0.0.1:8088/api/v1/graphql/ws',
      indexerHttpUrl: 'http://127.0.0.1:8088/api/v1/graphql',
    },
    nodeClientConnection: {
      rpcUrl: 'http://127.0.0.1:9944'
    },
    relayURL: 'http://127.0.0.1:9944',
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    provingServerUrl: 'http://127.0.0.1:6300',
    costParameters: {
      feeBlocksMargin: 3
    }
  };
  
  const dustParams = new DustParameters(100n, 100n, 100n);

  console.log("🔗 Connecting wallet...");
  const facade = await WalletFacade.init({
    configuration: config,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSeed(seed),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
    dust: (cfg) => DustWallet(cfg).startWithSeed(seed, dustParams)
  });
  
  const seeds = WalletSeeds.fromMasterSeed(seed);
  await facade.start(seeds);
  
  // Log sync progress
  const syncSub = facade.state().subscribe(state => {
    if (state.shielded.progress && 'syncHeight' in state.shielded.progress) {
      process.stdout.write(`\r[Syncing] Shielded Wallet Block Height: ${state.shielded.progress.syncHeight} ... `);
    }
  });

  // 2. Setup Providers
  const zkConfigProvider = new NodeZkConfigProvider(path.join(__dirname, "public", "zkir"));
  
  const state = await facade.waitForSyncedState();
  syncSub.unsubscribe();
  console.log("\n✅ Wallet synced!");
  const pubKeys = state.shielded.state.publicKeys;
  const cpk = ShieldedCoinPublicKey.fromHexString(pubKeys.coinPublicKey);
  const epk = ShieldedEncryptionPublicKey.fromHexString(pubKeys.encryptionPublicKey);
  const cpkStr = ShieldedCoinPublicKey.codec.encode(getNetworkId() as any, cpk).asString();
  const epkStr = ShieldedEncryptionPublicKey.codec.encode(getNetworkId() as any, epk).asString();

  const walletAndMidnightProvider = {
    getCoinPublicKey: () => cpkStr,
    getEncryptionPublicKey: () => epkStr,
    balanceTx(tx: any, ttl?: Date) {
      console.log("Tx to balance:", tx);
      console.log("activeProtocolVersion:", state.activeProtocolVersion);
      const walletTx = WalletTransaction.adopt('Unbound', tx, state.activeProtocolVersion);
      return facade.balanceUnboundTransaction(walletTx, { 
        ttl: ttl || new Date(Date.now() + 1000 * 60 * 60) 
      })
      .then((recipe: any) => facade.finalizeRecipe(recipe));
    },
    submitTx(tx: any) {
      return facade.submitTransaction(tx);
    },
  };

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "umbra-cli-deploy-state",
      accountId: "cli-deployer",
      privateStoragePasswordProvider: () => "UmbraDarkPoolSecurePassword123!",
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexerClientConnection.indexerHttpUrl, config.indexerClientConnection.indexerWsUrl),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.provingServerUrl, zkConfigProvider),
    walletProvider: createWalletProvider(walletAndMidnightProvider),
    midnightProvider: createMidnightProvider((tx) => facade.submitTransaction(tx)),
  };

  const compiledContract = CompiledContract.withVacantWitnesses(
    CompiledContract.make("dark_pool", Contract)
  );

  console.log("🚀 Deploying contract...");
  const deployedContract = await deployContract(providers, {
    privateStateId: "darkPoolDeploy",
    initialPrivateState: {
      balances: {},
    },
    compiledContract: compiledContract,
  });

  console.log(`✅ Contract deployed at address: ${deployedContract.deployTxData.public.contractAddress}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
