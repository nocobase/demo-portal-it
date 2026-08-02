import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";
import { starter as enUSStarter } from "./en-US";
import { starter as zhCNStarter } from "./zh-CN";
import { IT_EN, IT_ZH } from "@/pages/it/messages";

registerTranslationResources("starter", {
  "en-US": { ...enUSStarter, ...IT_EN },
  "zh-CN": { ...zhCNStarter, ...IT_ZH },
});
