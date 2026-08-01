export type ErrorBoundaryLabels = {
  backHome: string;
  copied: string;
  copyFailed: string;
  copyDetails: string;
  description: string;
  details: string;
  reload: string;
  retry: string;
  title: string;
};

const labelsByLocale: Record<"en-US" | "zh-CN", ErrorBoundaryLabels> = {
  "en-US": {
    title: "Something went wrong",
    description:
      "This part of the application could not be displayed. Copy the diagnostic information if you need help.",
    details: "Diagnostic information",
    copyDetails: "Copy diagnostic information",
    copied: "Copied",
    copyFailed: "Copy failed",
    retry: "Try again",
    reload: "Reload page",
    backHome: "Back to homepage",
  },
  "zh-CN": {
    title: "页面出现错误",
    description: "此区域暂时无法显示。如需协助，请复制下面的诊断信息。",
    details: "诊断信息",
    copyDetails: "复制诊断信息",
    copied: "已复制",
    copyFailed: "复制失败",
    retry: "重试",
    reload: "刷新页面",
    backHome: "返回首页",
  },
};

const resolveDefaultLocale = () => {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : "en-US";
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : "en-US";
  }
  return "en-US";
};

export function getErrorBoundaryLabels(
  locale = resolveDefaultLocale(),
  overrides: Partial<ErrorBoundaryLabels> = {}
): ErrorBoundaryLabels {
  const defaults = locale.toLowerCase().startsWith("zh")
    ? labelsByLocale["zh-CN"]
    : labelsByLocale["en-US"];
  return { ...defaults, ...overrides };
}
