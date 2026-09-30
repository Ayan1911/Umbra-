import type { WitnessContext } from "compact-runtime-ledger8";
import type { Ledger, Witnesses, Order } from "../build/contract/index.js";

export type { Order } from "../build/contract/index.js";

export type DarkPoolPrivateState = {
  readonly currentOrder: Order | null;
  readonly orderHistory: readonly Order[];
};

export const createInitialPrivateState = (): DarkPoolPrivateState => ({
  currentOrder: null,
  orderHistory: [],
});

export const witnesses: Witnesses<DarkPoolPrivateState> = {
  getOrderDetails: ({ privateState }: WitnessContext<Ledger, DarkPoolPrivateState>): [DarkPoolPrivateState, Order] => {
    if (!privateState.currentOrder) {
      throw new Error("No active order details found in private state for zero-knowledge witness.");
    }
    return [privateState, privateState.currentOrder];
  },
};
