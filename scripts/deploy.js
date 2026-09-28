import { config } from 'dotenv';
import * as bip39 from 'bip39';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk';
// Assume standard imports for WalletFacade based on recent Midnight SDKs
// Due to complex WalletFacade configuration without a boilerplate, we will
// attempt a simplified initialization just to check balance.
config();
async function main() {
    const mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) {
        throw new Error('DEPLOYER_MNEMONIC missing from .env');
    }
    console.log('Mnemonic loaded successfully. Length:', mnemonic.split(' ').length, 'words');
    console.log('Generating seed...');
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    console.log('Seed generated. Attempting to initialize WalletFacade...');
    try {
        // In SDK v3+, WalletBuilder was replaced with WalletFacade.init and complex providers.
        // If this fails, it indicates we need the full boilerplate or proof server.
        const wallet = await WalletFacade.init({
        // Minimal config stub to see if it throws immediately or requires more
        });
        console.log('Wallet initialized.');
    }
    catch (e) {
        console.error('Wallet initialization failed. Proof server or missing configuration providers:', e.message);
    }
}
main().catch(console.error);
