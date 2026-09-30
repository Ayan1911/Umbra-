# 📝 Umbra Protocol: Technical Architecture & Implementation Log

This document records the architectural decisions, cryptographic models, dual-era compatibility resolutions, and deployment proofs for the **Umbra Confidential Dark Pool AMM** built on the **Midnight Network**.

---

## 1. Technical Decisions & Cryptographic Architecture

### A. Intent Blinding & Zero-Knowledge Circuits (`Compact 0.31.1`)
- **Language & Runtime Versioning:** The smart contract is authored in **Compact 0.31.1** with `pragma language_version >= 0.23.0;`, targeting runtime `0.16.0` (`ledger-8.0.2`). This ensures that the generated circuit bytecodes produce transaction envelopes matching the protocol `1000300` wire format (`midnight:transaction[v9]`).
- **Cryptographic Intent Formulation:** Orders are committed into a public on-chain set using blinded commitments:
  $$\mathcal{C} = \text{persistentHash}(\text{Order})$$
  $$\text{where } \text{Order} = \{\text{side}: \text{Uint}<8>, \text{amount}: \text{Uint}<64>, \text{nonce}: \text{Bytes}<32>\}$$
- **Nullifier-Based Double-Spend Prevention:** When an order is settled or cancelled, the secret blinding nonce is disclosed inside the ZK witness to derive the nullifier:
  $$\mathcal{N} = \text{persistentHash}(\text{nonce})$$
  The contract checks `!nullifiers.member(disclose(nullifier))` and commits $\mathcal{N}$ to prevent replay attacks.

### B. Dual-Era Protocol Alignment (`v8` vs `v9` Ledger)
- **The Issue:** Midnight Preview and Preprod testnets run on protocol `1000300` (Node 1.x / `ledger-8.0.2`), which requires `v9` wire format headers. The Midnight Lace browser extension (Chrome Web Store ID `gafhhkghbfjjkeiendhlofajokpaflmk`) specifically deserializes `v9` transactions. Compact 0.34+ produces runtime 0.19 (`ledger-v9` / `v12` wire format), which causes Lace to fail with:
  `Unable to deserialize Transaction. Error: expected header tag 'midnight:transaction[v9]' got 'midnight:transaction[v12]'`.
- **The Resolution:** 
  1. Recompiled circuits using Compact `0.31.1`, creating synchronous `initialState` constructors.
  2. Implemented dual-era providers via `createWalletProviderFromArms` and `createMidnightProviderFromArms` with native `retainedEras: { v8: ... }` handlers.
  3. Overrode `getArtifactRuntimeVersion()` in `ResilientZkConfigProvider` to reliably return `"0.16.0"`, guaranteeing dispatch to `RETAINED_PIPELINE_ERA` (`ledger8`).
  4. Delegated fee balancing to Lace with `{ payFees: true }`, ensuring `tDUST` balances are correctly deducted without truncation.

### C. Unredacted Error Diagnostic Pipeline
- **Problem:** The Midnight JS SDK redacts transaction failure details during `balanceTx` (replacing them with generic warnings to prevent private state leakage), masking whether failures are caused by insufficient `tDUST`, user cancellation, or RPC desynchronization.
- **Solution:** Designed `getDeepErrorMessage` in `src/hooks/useDarkPoolContract.ts`, which traverses `error.cause` recursively to extract and display the root error message in the UI modal and DevTools console.

---

## 2. Verifiable Deployment Proofs

### A. Preprod Contract Deployment
- **Network:** Midnight Preprod / Preview Testnet
- **Protocol Version:** `1000300`
- **Contract Address:** `58b73ad6c18f3a388b3941eb058728b9d883aa36e1c441c098fa55db6c24f605`
- **Verification Query (GraphQL):**
  ```bash
  curl -X POST https://indexer.preview.midnight.network/api/v4/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "query { contractAction(address: \"58b73ad6c18f3a388b3941eb058728b9d883aa36e1c441c098fa55db6c24f605\") { address state } }"}'
  ```

### B. Prover & Verifier Cryptographic Keys
All circuit intermediate representations (`.zkir`), bytecode (`.bzkir`), prover keys (`.prover`), and verifier keys (`.verifier`) are compiled in `contract/build/` and mirrored in `public/zkir/`:
- `commitOrder`: 32-byte commitment insertion with private blinding nonce.
- `settleOrder`: Witness evaluation, nullifier derivation, constant-product AMM state update.
- `cancelOrder`: Revocation circuit with nullifier registration.

### C. Automated Test Audit Proof (22/22 Tests Passing)
Run verification suite:
```bash
npm test
```
Result:
```text
📋 [Suite 1] Verifying Compact 0.31 Smart Contract Artifacts... (14 passed)
🔒 [Suite 2] Verifying Intent Blinding & Nullifier Mathematics... (4 passed)
⚖️ [Suite 3] Verifying AMM Constant-Product Reserve Invariant... (2 passed)
🌐 [Suite 4] Verifying Midnight Lace Wire Header Specifications... (2 passed)
========================================================
📊 TEST RESULTS: 22 passed, 0 failed
✨ ALL VERIFICATION AUDIT TESTS PASSED SUCCESSFULLY!
```

---

## 3. Cross-Chain Settlement Vaults
- **Cardano Preprod Vault:** `addr_test1wps8f9k73m94c2598v6q6xnd457q8g0995z30d29`
- **Arbitrum Sepolia Bridge Escrow:** `0x71C27B8820B88081691a56F281f621115F8C7b8A`
- **Receipt Abstraction:** Implemented in `src/services/crossChainService.ts` to bridge cryptographic settlement receipts into external multi-chain token mints and transfers.
