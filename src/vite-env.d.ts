/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK?: string
  readonly VITE_NODE_URL?: string
  readonly VITE_VEDELEGATE_ADDRESS?: string
  readonly VITE_B3TR_ADDRESS?: string
  readonly VITE_VOT3_ADDRESS?: string
  readonly VITE_VEB3TR_ADDRESS?: string
  readonly VITE_LOCKED_TERMS_ADDRESS?: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID?: string
  readonly VITE_DELEGATION_URL?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
