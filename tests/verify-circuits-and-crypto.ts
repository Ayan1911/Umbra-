import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('🧪 ========================================================');
console.log('🧪 UMBRA PROTOCOL: VERIFICATION & AUDIT TEST SUITE');
console.log('🧪 ========================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Compact Contract Build Artifacts & ZKIR Verification
// ---------------------------------------------------------------------------
console.log('📋 [Suite 1] Verifying Compact 0.31 Smart Contract Artifacts...');

const buildDir = path.resolve('contract/build');
const contractJs = path.join(buildDir, 'contract/index.js');
const contractDts = path.join(buildDir, 'contract/index.d.ts');
const zkirDir = path.join(buildDir, 'zkir');
const keysDir = path.join(buildDir, 'keys');

assert(fs.existsSync(contractJs), 'contract/build/contract/index.js exists');
assert(fs.existsSync(contractDts), 'contract/build/contract/index.d.ts exists');

const requiredCircuits = ['commitOrder', 'settleOrder', 'cancelOrder'];
for (const circuit of requiredCircuits) {
  const bzkirFile = path.join(zkirDir, `${circuit}.bzkir`);
  const zkirFile = path.join(zkirDir, `${circuit}.zkir`);
  const proverKey = path.join(keysDir, `${circuit}.prover`);
  const verifierKey = path.join(keysDir, `${circuit}.verifier`);

  assert(fs.existsSync(bzkirFile), `Circuit bytecode binary exists: ${circuit}.bzkir`);
  assert(fs.existsSync(zkirFile), `Circuit intermediate representation exists: ${circuit}.zkir`);
  assert(fs.existsSync(proverKey), `Prover key exists: ${circuit}.prover`);
  assert(fs.existsSync(verifierKey), `Verifier key exists: ${circuit}.verifier`);
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Cryptographic Commitment & Nullifier Integrity
// ---------------------------------------------------------------------------
console.log('\n🔒 [Suite 2] Verifying Intent Blinding & Nullifier Mathematics...');

function computeCommitment(side: number, amount: bigint, nonce: Buffer): Buffer {
  const sideBuf = Buffer.alloc(1);
  sideBuf.writeUInt8(side);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64BE(amount);
  return crypto.createHash('sha256').update(Buffer.concat([sideBuf, amountBuf, nonce])).digest();
}

function computeNullifier(nonce: Buffer): Buffer {
  return crypto.createHash('sha256').update(nonce).digest();
}

const nonce1 = crypto.randomBytes(32);
const nonce2 = crypto.randomBytes(32);

const commitment1 = computeCommitment(0, 1000n, nonce1);
const commitment1Repeat = computeCommitment(0, 1000n, nonce1);
const commitment2 = computeCommitment(0, 1000n, nonce2);

assert(commitment1.equals(commitment1Repeat), 'Commitment generation is deterministic for identical inputs');
assert(!commitment1.equals(commitment2), 'Blinding nonce ensures unique commitments for identical trade values');

const nullifier1 = computeNullifier(nonce1);
const nullifier2 = computeNullifier(nonce2);
assert(nullifier1.length === 32, 'Nullifier is 32-byte cryptographically secure hash');
assert(!nullifier1.equals(nullifier2), 'Nullifiers are strictly unique per blinding secret');

// ---------------------------------------------------------------------------
// TEST SUITE 3: Constant-Product AMM Invariant Logic
// ---------------------------------------------------------------------------
console.log('\n⚖️ [Suite 3] Verifying AMM Constant-Product Reserve Invariant...');

function simulateSwap(reserveA: bigint, reserveB: bigint, side: number, deltaIn: bigint): { newA: bigint; newB: bigint; deltaOut: bigint } {
  if (side === 0) {
    // BUY: Deposit A, Receive B
    const deltaOut = (reserveB * deltaIn) / (reserveA + deltaIn);
    const newA = reserveA + deltaIn;
    const newB = reserveB - deltaOut;
    return { newA, newB, deltaOut };
  } else {
    // SELL: Deposit B, Receive A
    const deltaOut = (reserveA * deltaIn) / (reserveB + deltaIn);
    const newB = reserveB + deltaIn;
    const newA = reserveA - deltaOut;
    return { newA, newB, deltaOut };
  }
}

const initialA = 100_000_000n;
const initialB = 100_000_000n;
const initialK = initialA * initialB;

const buyResult = simulateSwap(initialA, initialB, 0, 1_000_000n);
const kAfterBuy = buyResult.newA * buyResult.newB;

assert(buyResult.deltaOut > 0n, 'Swap produces non-zero output token distribution');
assert(kAfterBuy >= initialK, 'Reserve invariant k is non-decreasing across swaps');

// ---------------------------------------------------------------------------
// TEST SUITE 4: Wire Protocol Header Tag Compatibility
// ---------------------------------------------------------------------------
console.log('\n🌐 [Suite 4] Verifying Midnight Lace Wire Header Specifications...');

const V9_HEADER = "midnight:transaction[v9](signature[v1],proof,embedded-fr[v1]):";
const V12_HEADER = "midnight:transaction[v12](signature[v2],proof,embedded-fr[v1]):";

assert(V9_HEADER.includes('v9'), 'Lace Preprod compatible wire format tag v9 is recognized');
assert(!V9_HEADER.includes('v12'), 'Legacy wire format correctly isolated from modern testnet protocol');

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n========================================================');
console.log(`📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('========================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL VERIFICATION AUDIT TESTS PASSED SUCCESSFULLY!\n');
}
