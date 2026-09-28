import * as bip39 from 'bip39';
import { WalletBuilder } from '@midnight-ntwrk/wallet-sdk';
import { config } from 'dotenv';
config();
async function main() {
    const mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic)
        throw new Error("No mnemonic found in .env");
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    console.log("Initializing wallet...");
    try {
        const wallet = await WalletBuilder.build('https://indexer.preprod.midnight.network/api/v4/graphql', 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws', 'http://127.0.0.1:6300', 'https://rpc.preprod.midnight.network', seed.toString('hex'), 'preprod', 'info');
        // We only need the address to fund it. We don't start the wallet sync yet to avoid errors.
        const state = await wallet.state();
        console.log("Address:", state.address);
    }
    catch (e) {
        console.error("Failed to build wallet:", e);
    }
}
main().catch(console.error);
