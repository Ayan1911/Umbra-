import { Contract } from "../../contract/build/contract/index.js";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { createWalletAndMidnightProvider } from "../midnight-provider";
import { deployContract, submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { useState } from "react";

export function useDarkPoolContract() {
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [contractInstance, setContractInstance] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [providers, setProviders] = useState<any>(null);

  const initProviders = async (wallet: ConnectedAPI) => {
    if (providers) return providers;
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    
    // We create the zkConfigProvider as it's needed for the proofProvider
    const zkConfigProvider = new FetchZkConfigProvider(window.location.origin + "/zkir");
    
    const unshieldedAddresses = await wallet.getUnshieldedAddress();
    const accountId = unshieldedAddresses.unshieldedAddress;

    const newProviders = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "umbra-private-state",
        accountId,
        privateStoragePasswordProvider: () => "UmbraDarkPoolSecurePassword123!",
      }),
      publicDataProvider: indexerPublicDataProvider("https://indexer.preview.midnight.network/api/v1/graphql", "wss://indexer.preview.midnight.network/api/v1/graphql/ws"),
      zkConfigProvider,
      proofProvider: dappConnectorProofProvider(wallet, zkConfigProvider),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
    
    const compiledContract = CompiledContract.withVacantWitnesses(
      CompiledContract.make("darkPoolContract", Contract)
    );
    
    const providerState = { providers: newProviders, contract: compiledContract };
    setProviders(providerState);
    return providerState;
  };

  const deploy = async (wallet: ConnectedAPI) => {
    setIsDeploying(true);
    try {
      const { providers: p, contract } = await initProviders(wallet);
      console.log("Deploying contract with providers...");
      
      const deployed = await deployContract(p, {
        privateStateId: "darkPoolState",
        contract: contract,
        initialPrivateState: {
          commitmentPool: [],
          nullifiers: []
        }
      });
      
      console.log(`Deployed at: ${deployed.deployTxData.public.contractAddress}`);
      setContractAddress(deployed.deployTxData.public.contractAddress);
      setContractInstance(deployed);
      
      return deployed.deployTxData.public.contractAddress;
    } catch (err) {
      console.error(err);
      alert("Deployment failed: " + err);
    } finally {
      setIsDeploying(false);
    }
  };

  const commitOrder = async (wallet: ConnectedAPI, amount: number, isBuy: boolean) => {
    if (!contractInstance) {
      alert("Contract not deployed yet!");
      return null;
    }
    const { providers: p, contract } = await initProviders(wallet);
    console.log("Generating ZK proof for commitOrder via 1AM WASM...");
    
    try {
      const commitmentNonce = 123456n; 
      
      const tx = await submitCallTx(p, {
        privateStateId: "darkPoolState",
        contract: contract,
        circuit: contractInstance.commitOrder,
        args: [
          isBuy ? 1n : 0n, // side
          BigInt(amount), // amount
          commitmentNonce, // nonce
        ]
      });
      
      console.log("commitOrder tx hash:", tx.public.txHash);
      return tx.public.txHash;
    } catch (err) {
      console.error("commitOrder failed:", err);
      alert("commitOrder failed: " + err);
      return null;
    }
  };

  const revealAndMatch = async (wallet: ConnectedAPI, amount: number, isBuy: boolean) => {
    if (!contractInstance) return null;
    const { providers: p, contract } = await initProviders(wallet);
    console.log("Generating ZK proof for revealAndMatch via 1AM WASM...");
    
    try {
      const commitmentNonce = 123456n; 
      const tx = await submitCallTx(p, {
        privateStateId: "darkPoolState",
        contract: contract,
        circuit: contractInstance.revealAndMatch,
        args: [
          isBuy ? 1n : 0n,
          BigInt(amount),
          commitmentNonce,
        ]
      });
      
      console.log("revealAndMatch tx hash:", tx.public.txHash);
      return tx.public.txHash;
    } catch (err) {
      console.error("revealAndMatch failed:", err);
      return null;
    }
  };

  const settle = async (wallet: ConnectedAPI, amount: number, isBuy: boolean) => {
    if (!contractInstance) return null;
    const { providers: p, contract } = await initProviders(wallet);
    console.log("Generating ZK proof for settle via 1AM WASM...");
    
    try {
      const commitmentNonce = 123456n; 
      const tx = await submitCallTx(p, {
        privateStateId: "darkPoolState",
        contract: contract,
        circuit: contractInstance.settle,
        args: [
          isBuy ? 1n : 0n,
          BigInt(amount),
          commitmentNonce,
        ]
      });
      
      console.log("settle tx hash:", tx.public.txHash);
      return tx.public.txHash;
    } catch (err) {
      console.error("settle failed:", err);
      return null;
    }
  };

  return {
    deploy,
    commitOrder,
    revealAndMatch,
    settle,
    contractAddress,
    isDeploying
  };
}
