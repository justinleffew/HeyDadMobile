export interface ExpoIapPluginCommonOptions {
  enableLocalDev?: boolean;
  localPath?:
    | string
    | {
        ios?: string;
        android?: string;
      };
}
