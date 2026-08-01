import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { Boxes, ClipboardList, LayoutDashboard, ShieldCheck, Wrench } from "lucide-react";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import {
  AssetHistoryRoute,
  ItConsolePage,
  ItCreateRoute,
  type ItConsoleListPage,
} from "@/pages/it-console";

// Set this to false when the application no longer needs the example routes
// contributed by installed Registry extensions. Providers, adapters, and the
// development showcase under /dev remain available.
export const registryRoutesEnabled = false;

// Add application-owned business routes here. Installed Registry extensions
// contribute their own route definitions through the same runtime. Add a
// resource entry when a route should also appear in navigation.
const listRoute = ({
  page,
  path,
  label,
  i18nKey,
  icon,
  priority,
  resource,
}: {
  page: ItConsoleListPage;
  path: string;
  label: string;
  i18nKey: string;
  icon: React.ReactNode;
  priority: number;
  resource: string;
}) => ({
  name: `it-${page}`,
  path,
  element: (
    <CanAccess resource={resource} action="list" fallback={<AccessDenied />}>
      <ItConsolePage page={page} />
    </CanAccess>
  ),
  resource: {
    meta: {
      label,
      i18nKey,
      i18nOptions: { ns: "starter" },
      icon,
      priority,
      acl: { type: "collection" as const, resource },
    },
  },
  children: [
    {
      name: `it-${page}.create`,
      path: "create",
      resourceAction: "create" as const,
      element: (
        <CanAccess resource={resource} action="create" fallback={<AccessDenied />}>
          <ItCreateRoute page={page} />
        </CanAccess>
      ),
    },
  ],
});

const assetListRoute = listRoute({
  page: "assets",
  path: "/assets",
  label: "Assets",
  i18nKey: "it.navigation.assets",
  icon: <Boxes />,
  priority: 2,
  resource: "it_assets",
});

const assetRoute = {
  ...assetListRoute,
  children: [
    ...assetListRoute.children,
    {
      name: "it-assets.history",
      path: ":assetId/history",
      element: (
        <CanAccess resource="it_assets" action="get" fallback={<AccessDenied />}>
          <AssetHistoryRoute />
        </CanAccess>
      ),
    },
  ],
};

export const appRoutes = defineAppRoutes([
  {
    name: "it-dashboard",
    path: "/dashboard",
    element: <ItConsolePage page="dashboard" />,
    resource: {
      meta: {
        label: "Dashboard",
        i18nKey: "it.navigation.dashboard",
        i18nOptions: { ns: "starter" },
        icon: <LayoutDashboard />,
        priority: 1,
      },
    },
  },
  assetRoute,
  listRoute({
    page: "requests",
    path: "/requests",
    label: "Requests",
    i18nKey: "it.navigation.requests",
    icon: <ClipboardList />,
    priority: 3,
    resource: "it_requests",
  }),
  listRoute({
    page: "licenses",
    path: "/licenses",
    label: "Licenses",
    i18nKey: "it.navigation.licenses",
    icon: <ShieldCheck />,
    priority: 4,
    resource: "it_licenses",
  }),
  listRoute({
    page: "repairs",
    path: "/repairs",
    label: "Repairs",
    i18nKey: "it.navigation.repairs",
    icon: <Wrench />,
    priority: 5,
    resource: "it_repairs",
  }),
]);
