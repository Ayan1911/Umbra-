# Umbra — Confidential AMM on Midnight

## The Problem
On transparent DEXs, large orders are visible pre-confirmation. This enables MEV bots and competitors to front-run or slip the price against the trader.

## The Solution: Umbra Dark Pool AMM
A Dark Pool AMM where:
- Order **existence, size, and side** live in **private state**, proven via witnesses.
- Matching/settlement is verified by a **ZK circuit**.
- Only the **minimum required facts** are disclosed on-chain: a valid match occurred and the final settlement amounts.
- Price reference remains legible via a public on-chain reserve/oracle state.

## Architecture

This project is structured into four distinct, decoupled layers:

1. **Layer 1: Contract (Compact) + Witnesses (TypeScript)**
   - `contract/` contains the `dark_pool.compact` circuit and the TypeScript witness logic.
2. **Layer 2: API Layer**
   - `api/` interfaces with the Midnight network via `midnight-js-contracts`.
3. **Layer 3: Hooks / View-Model**
   - `hooks/` provides the React hooks (e.g. `useDarkPool`, `useWallet`) that wrap Layer 2.
4. **Layer 4: UI**
   - `ui/` contains pure presentation React components. It only imports from Layer 3.

## Loop 1 Implementation details
- Scaffolding of the 4-tier architecture.
- Base Compact contract stub with `commitOrder` circuit.
- Standalone visual UI component `index.html` as the Landing Page.

## Running
(Instructions for running via Docker and Midnight standalone node will be added as loops are completed).
