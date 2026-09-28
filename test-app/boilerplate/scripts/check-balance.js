#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Wallet Balance Checker
 * Checks the balance of the wallet configured in .env file
 */
class WalletBalanceChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.envPath = path.join(this.projectRoot, '..', '.env');
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvironment() {
    if (!fs.existsSync(this.envPath)) {
      console.error('❌ .env file not found!');
      console.log('💡 Run "npm run generate-key" to create a wallet first');
      process.exit(1);
    }

    dotenv.config({ path: this.envPath });

    const walletSeed = process.env.WALLET_SEED;
    const walletAddress = process.env.WALLET_ADDRESS;

    if (!walletSeed) {
      console.error('❌ WALLET_SEED not found in .env file!');
      console.log('💡 Run "npm run generate-key" to set up your wallet');
      process.exit(1);
    }

    return { walletSeed, walletAddress };
  }

  /**
   * Create wallet instance and check balance
   */
  async checkBalance(seed) {
    try {
      // Import wallet builder and network configuration
      const { WalletBuilder } = await import('@midnight-ntwrk/wallet');
      const { getZswapNetworkId, setNetworkId, NetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
      const { nativeToken } = await import('@midnight-ntwrk/ledger');
      const { firstValueFrom } = await import('rxjs');
      
      // Set network to testnet
      setNetworkId(NetworkId.TestNet);
      
      // Testnet configuration
      const indexer = 'https://indexer.preprod.midnight.network/api/v4/graphql';
      const indexerWS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
      const node = 'https://rpc.preprod.midnight.network';
      const proofServer = 'http://127.0.0.1:6300';
      
      console.log('🔗 Connecting to Midnight testnet...');
      
      // Build wallet from seed
      const wallet = await WalletBuilder.buildFromSeed(
        indexer,
        indexerWS,
        proofServer,
        node,
        seed,
        getZswapNetworkId(),
        'info'
      );
      
      wallet.start();
      
      // Wait for wallet to initialize and sync
      console.log('⏳ Syncing wallet...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get wallet state
      const state = await firstValueFrom(wallet.state());
      const balance = state.balances[nativeToken()] || 0n;
      const allBalances = Object.entries(state.balances).map(([token, amount]) => `${token.substring(0, 10)}...: ${Number(amount) / 1000000}`);
      
      const address = state.address;
      
      // Close wallet
      await wallet.close();
      
      return {
        address,
        balance,
        formattedBalance: this.formatBalance(balance),
        allBalances
      };
    } catch (error) {
      console.error('❌ Failed to check balance:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('   - Ensure your internet connection is stable');
      console.log('   - Verify your wallet seed is correct');
      console.log('   - Check that testnet services are available');
      process.exit(1);
    }
  }

  /**
   * Format balance for display (microTusdt to Tusdt)
   */
  formatBalance(microBalance) {
    const tusdt = Number(microBalance) / 1_000_000;
    return tusdt.toLocaleString('en-US', { 
      minimumFractionDigits: 6,
      maximumFractionDigits: 6 
    });
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      console.log('🌙 Midnight Wallet Balance Checker\n');
      
      // Load environment
      const { walletSeed, walletAddress } = this.loadEnvironment();
      
      if (walletAddress) {
        console.log(`📍 Wallet Address: ${walletAddress}`);
      }
      
      // Check balance
      const result = await this.checkBalance(walletSeed);
      
      console.log('\n💰 Balance Information:');
      console.log(`📍 Address: ${result.address}`);
      console.log(`💎 All Balances: \n   - ${result.allBalances.join('\n   - ')}`);
      
      // Provide contextual information
      if (result.balance === 0n) {
        console.log('\n💡 Your wallet has no funds!');
        console.log('🚰 Request testnet tokens with: npm run faucet');
        console.log('🌐 Manual faucet: https://midnight.network/testnet-faucet');
      } else if (result.balance < 1_000_000n) {
        console.log('\n⚠️  Low balance! You may need more tokens for contract deployment.');
        console.log('🚰 Request more tokens with: npm run faucet');
      } else {
        console.log('\n✅ Wallet has sufficient balance for contract operations!');
      }
      

      
    } catch (error) {
      console.error('\n❌ Balance check failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🌙 Midnight Wallet Balance Checker

Usage:
  npm run balance              Check current wallet balance
  npm run balance -- --help   Show this help message

What this does:
  1. Reads wallet configuration from your .env file
  2. Connects to Midnight testnet
  3. Retrieves and displays your current wallet balance
  4. Provides helpful context about your balance status

Prerequisites:
  - .env file with WALLET_SEED configured
  - Internet connection to testnet
  - Generated wallet (run 'npm run generate-key' if needed)

Balance Display:
  - Shows both human-readable balance (tUsdt) and raw balance (microTusdt)
  - 1 tUsdt = 1,000,000 microTusdt
  - Typical faucet provides 1000 tUsdt for development

Next Steps:
  - If balance is 0: Request tokens with 'npm run faucet'
  - If balance is sufficient: Deploy contracts with 'npm run deploy'
  - For interactive mode: Use 'npm run wallet'
`);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  const checker = new WalletBalanceChecker();
  checker.showHelp();
  process.exit(0);
}

// Run balance checker
const checker = new WalletBalanceChecker();
checker.run().catch(console.error);
