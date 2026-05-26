# VeDelegate Pool Recovery

Static VeDelegate recovery console for GitHub Pages.

Users connect with VeChain Kit, scan owned VeDelegate pools, withdraw VET and registry token balances, convert VOT3 back to B3TR, and close ended Lock-2-Earn terms.

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
- `VITE_WALLET_CONNECT_PROJECT_ID`
- `VITE_DELEGATION_URL`
- `VITE_BASE_PATH`
- `VITE_ENABLE_DEMO_DATA`: set `true` to enable `?demo=balances` local fixture screenshots

## GitHub Pages

`.github/workflows/pages.yml` installs, tests, builds, and deploys `dist`.

Vite base path uses `VITE_BASE_PATH` first, then the GitHub repository name in Actions.

## Signing Risk

All recovery calls execute through the user's pool smart wallet. The signer remains the owner wallet. Recover-all is a multi-clause transaction: all clauses succeed or all fail.

Closing an ended auto-renew term first disables auto-renew, then closes, then withdraws term funds into the owner pool. After that, recover B3TR from the pool.

## Demo Fixtures

For screenshots without a wallet, run with demo data enabled:

```sh
VITE_ENABLE_DEMO_DATA=true npm run dev
```

Open `/?demo=balances`.

The fixture covers multi-pool selection, VET, B3TR, VOT3, veB3TR, a registry token, hidden zero balances, ended terms with and without auto-renew, a locked active term, a closed funded term, and a closed empty term.
