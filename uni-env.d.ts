/// <reference types="@dcloudio/types" />

interface ImportMetaEnv {
  readonly DIFY_BASE_URL: string;
  readonly DIFY_API_KEY: string;
  readonly USE_MOCK?: string;
  readonly WX_CLOUD_ENV_ID?: string;
  readonly FORCE_CLOUD_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    DIFY_BASE_URL: string;
    DIFY_API_KEY: string;
    USE_MOCK?: string;
    WX_CLOUD_ENV_ID?: string;
    FORCE_CLOUD_ONLY?: string;
  }
}

// uni-app 全局变量声明
declare const uni: any;
declare const wx: any;
declare const getApp: () => any;
declare const getCurrentPages: () => any[];
