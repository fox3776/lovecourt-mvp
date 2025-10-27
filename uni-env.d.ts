interface ImportMetaEnv {
  readonly DIFY_BASE_URL: string;
  readonly DIFY_API_KEY: string;
  readonly USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    DIFY_BASE_URL: string;
    DIFY_API_KEY: string;
    USE_MOCK?: string;
  }
}
