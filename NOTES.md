wallet-sdk used once for DUST registration; @midnight-ntwrk/wallet used for contract deployment via midnight-js-contracts, which doesn't yet support wallet-sdk's WalletFacade interface.

Note: The wallet-sdk migration/registration path from earlier is no longer needed for this deployment.
Root Cause: The old @midnight-ntwrk/wallet v5 WalletBuilder only accepts a flat 32-byte seed and cannot derive from a BIP39/HD mnemonic (Lace/1AM). Any Lace/1AM-derived wallet is structurally incompatible with this deploy script and must instead be used to manually fund the dedicated flat-seed wallet, not replace it.
Network Mismatch Note: The `midnight-js-network-id` package version used here lacks a Preprod enum value (it only knows TestNet/test1), causing addresses to be hardcoded with a `test1` prefix despite hitting Preprod RPCs. This requires manual bech32 re-encoding for Lace compatibility.
