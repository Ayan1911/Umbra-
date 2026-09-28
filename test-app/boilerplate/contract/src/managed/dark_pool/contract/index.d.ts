import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revealAndMatch(context: __compactRuntime.CircuitContext<PS>,
                 commitmentHash_0: Uint8Array,
                 side_0: bigint,
                 amount_0: bigint,
                 secret_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         commitmentHash_0: Uint8Array,
         side_0: bigint,
         amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revealAndMatch(context: __compactRuntime.CircuitContext<PS>,
                 commitmentHash_0: Uint8Array,
                 side_0: bigint,
                 amount_0: bigint,
                 secret_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         commitmentHash_0: Uint8Array,
         side_0: bigint,
         amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revealAndMatch(context: __compactRuntime.CircuitContext<PS>,
                 commitmentHash_0: Uint8Array,
                 side_0: bigint,
                 amount_0: bigint,
                 secret_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         commitmentHash_0: Uint8Array,
         side_0: bigint,
         amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           commitmentHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly reserveA: bigint;
  readonly reserveB: bigint;
  commitmentPool: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
