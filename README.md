# VeDelegate Pool Recovery

Static VeDelegate recovery console for GitHub Pages.

Users connect with VeChain Kit, scan owned VeDelegate pools, withdraw VET, registry token balances, and GM NFTs, convert VOT3 back to B3TR, and close ended Lock-2-Earn terms.

## Run

```sh
npm install
npm run dev
```

## Test / Build

```sh
npm run test
npm run build
```

## Config

Defaults target VeChain mainnet.

Copy `.env.example` to `.env` when overrides are needed:

- `VITE_NETWORK`: `main`, `test`, or `solo`
- `VITE_NODE_URL`: Thor REST node
- `VITE_VEDELEGATE_ADDRESS`
- `VITE_B3TR_ADDRESS`
- `VITE_VOT3_ADDRESS`
- `VITE_VEB3TR_ADDRESS`
- `VITE_LOCKED_TERMS_ADDRESS`
- `VITE_GALAXY_MEMBER_ADDRESS`
- `VITE_WALLET_CONNECT_PROJECT_ID`
- `VITE_DELEGATION_URL`
- `VITE_BASE_PATH`
- `VITE_ENABLE_DEMO_DATA`: set `true` to enable local fixture screenshots with `?demo=balances` and `?demo=scanning`

## GitHub Pages

`.github/workflows/pages.yml` installs, tests, builds, and deploys `dist`.

Vite base path uses `VITE_BASE_PATH` first, then the GitHub repository name in Actions.

## Signing Risk

All recovery calls execute through the user's pool smart wallet. The signer remains the owner wallet. Recover-all is a multi-clause transaction: all clauses succeed or all fail.

Closing an ended auto-renew term first disables auto-renew, then closes, then withdraws term funds into the owner pool. After that, recover B3TR from the pool.

GM NFTs are read from the VeBetterDAO GalaxyMember contract. If a GM NFT has a node attached, recovery first calls `detachNode(nodeId, gmTokenId)` from the pool and then transfers the NFT. If no node is attached, only the NFT transfer is built.

## Wallet UI

The header uses local connect and connected-wallet buttons that open VeChain Kit modals through Kit hooks. VeChain Kit dark mode is enabled through the provider. Recovery console styles and theme tokens are scoped under `.app-shell`; the only global page styles are body margin reset and the `#root` backdrop. No custom VeChain Kit theme variables or modal CSS overrides are set. Generic send, swap, and receive quick actions are hidden.

## Interface Style

Pool metadata is unframed. Pools, liquid funds, and locked terms each use one thin container with row dividers inside, avoiding nested boxes around the same content.

## Demo Fixtures

For screenshots without a wallet, run with demo data enabled:

```sh
VITE_ENABLE_DEMO_DATA=true npm run dev
```

Open `/?demo=balances` for populated pools or `/?demo=scanning` for the scan loading state.

The fixture covers multi-pool selection, VET, B3TR, VOT3, veB3TR, a registry token, hidden zero balances, GM NFTs with and without attached nodes, ended terms with and without auto-renew, a locked active term, a closed funded term, and a closed empty term.
