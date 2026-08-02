import { NocoBaseAIExtensionProvider } from "./global-ai-chat";
import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { LoadingState } from "@/components/app-shell/loading-state";
import {
  Bot,
  MessageSquare,
  MousePointer2,
  PanelRight,
  Sparkles,
  Wrench,
} from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { Outlet, Route } from "react-router";
import "./locales";

const AIChatPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.AIChatPage }))
);
const FloatingChatPage = lazy(() =>
  import("./demo/floating").then((module) => ({
    default: module.FloatingChatPage,
  }))
);
const ShortcutPage = lazy(() =>
  import("./demo/shortcut").then((module) => ({
    default: module.ShortcutPage,
  }))
);
const PageContextPage = lazy(() =>
  import("./demo/page-context").then((module) => ({
    default: module.PageContextPage,
  }))
);
const ToolCardsPage = lazy(() =>
  import("./demo/tool-cards").then((module) => ({
    default: module.ToolCardsPage,
  }))
);

function LazyDemoRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState className="min-h-[320px]" />}>
      {children}
    </Suspense>
  );
}

const nocobaseAIExtension: AppExtension = {
  id: "nocobase-ai",
  Provider: NocoBaseAIExtensionProvider,
  dev: {
    resources: [
      {
        name: "ai-components",
        meta: {
          label: "AI Components",
          i18nKey: "navigation.group",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <Bot />,
          acl: { type: "authenticated" },
        },
      },
      {
        name: "ai-chat-window",
        list: "ai-chat",
        meta: {
          parent: "ai-components",
          label: "Chat window",
          i18nKey: "navigation.chat",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <MessageSquare />,
          description:
            "Build freely with AI while NocoBase keeps the application reliable.",
          acl: { type: "authenticated" },
        },
      },
      {
        name: "ai-floating-chat",
        list: "ai-chat/floating",
        meta: {
          parent: "ai-components",
          label: "Floating chat",
          i18nKey: "navigation.floating",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <PanelRight />,
          acl: { type: "authenticated" },
        },
      },
      {
        name: "ai-employee-tasks",
        list: "ai-chat/shortcut",
        meta: {
          parent: "ai-components",
          label: "Employee tasks",
          i18nKey: "navigation.tasks",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <Sparkles />,
          acl: { type: "authenticated" },
        },
      },
      {
        name: "ai-page-context",
        list: "ai-chat/context",
        meta: {
          parent: "ai-components",
          label: "Page context",
          i18nKey: "navigation.context",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <MousePointer2 />,
          acl: { type: "authenticated" },
        },
      },
      {
        name: "ai-tool-cards",
        list: "ai-chat/tools",
        meta: {
          parent: "ai-components",
          label: "Tool cards",
          i18nKey: "navigation.tools",
          i18nOptions: { ns: "nocobase-ai" },
          icon: <Wrench />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route key="nocobase-ai" path="ai-chat" element={<Outlet />}>
        <Route
          index
          element={
            <LazyDemoRoute>
              <AIChatPage />
            </LazyDemoRoute>
          }
        />
        <Route
          path="floating"
          element={
            <LazyDemoRoute>
              <FloatingChatPage />
            </LazyDemoRoute>
          }
        />
        <Route
          path="shortcut"
          element={
            <LazyDemoRoute>
              <ShortcutPage />
            </LazyDemoRoute>
          }
        />
        <Route
          path="context"
          element={
            <LazyDemoRoute>
              <PageContextPage />
            </LazyDemoRoute>
          }
        />
        <Route
          path="tools"
          element={
            <LazyDemoRoute>
              <ToolCardsPage />
            </LazyDemoRoute>
          }
        />
      </Route>
    ),
  },
};

export default nocobaseAIExtension;
