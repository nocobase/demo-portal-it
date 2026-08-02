import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import { DashboardPage } from "@/pages/it/dashboard";
import { AssetList } from "@/pages/it/assets/asset-list";
import { AssetShow } from "@/pages/it/assets/asset-show";
import { AssetCreate, AssetEdit } from "@/pages/it/assets/asset-form";
import { AssignmentsOverview } from "@/pages/it/assignments";
import { ServiceCatalog } from "@/pages/it/catalog";
import { RequestList } from "@/pages/it/requests/request-list";
import { RequestShow } from "@/pages/it/requests/request-show";
import { RequestCreate } from "@/pages/it/requests/request-form";
import { FulfillmentBoard } from "@/pages/it/fulfillment";
import { RepairsBoard, RepairCreate } from "@/pages/it/repairs";
import { LicenseList } from "@/pages/it/licenses/license-list";
import { LicenseCreate, LicenseEdit } from "@/pages/it/licenses/license-form";
import { RunbookList } from "@/pages/it/knowledge/runbook-list";
import { RunbookShow } from "@/pages/it/knowledge/runbook-show";
import { ReportsPage } from "@/pages/it/reports";

export const registryRoutesEnabled = false;

const gate = (resource: string, action: string, node: React.ReactNode) => (
  <CanAccess resource={resource} action={action} fallback={<AccessDenied />}>
    {node}
  </CanAccess>
);

const navMeta = (
  label: string,
  i18nKey: string,
  icon: React.ReactNode,
  priority: number,
  resource?: string
) => ({
  meta: {
    label,
    i18nKey,
    i18nOptions: { ns: "starter" },
    icon,
    priority,
    ...(resource ? { acl: { type: "collection" as const, resource } } : {}),
  },
});

export const appRoutes = defineAppRoutes([
  {
    name: "it-dashboard",
    path: "/dashboard",
    element: <DashboardPage />,
    resource: navMeta("Dashboard", "it.nav.dashboard", <LayoutDashboard />, 1),
  },
  {
    name: "it-assets",
    path: "/asset-register",
    element: gate("it_assets", "list", <AssetList />),
    resource: navMeta("Assets", "it.nav.assets", <Boxes />, 2, "it_assets"),
    children: [
      { name: "it-assets.create", path: "create", resourceAction: "create", element: gate("it_assets", "create", <AssetCreate />) },
      {
        name: "it-assets.show",
        path: ":id",
        element: gate("it_assets", "get", <AssetShow />),
        children: [
          { name: "it-assets.edit", path: "edit", resourceAction: "edit", element: gate("it_assets", "update", <AssetEdit />) },
        ],
      },
    ],
  },
  {
    name: "it-assignments",
    path: "/assignments",
    element: gate("it_assignments", "list", <AssignmentsOverview />),
    resource: navMeta("Assignments", "it.nav.assignments", <Users />, 3, "it_assignments"),
  },
  {
    name: "it-catalog",
    path: "/catalog",
    element: gate("it_request_types", "list", <ServiceCatalog />),
    resource: navMeta("Service catalog", "it.nav.catalog", <LayoutGrid />, 4, "it_request_types"),
  },
  {
    name: "it-requests",
    path: "/requests",
    element: gate("it_requests", "list", <RequestList />),
    resource: navMeta("Requests", "it.nav.requests", <ClipboardList />, 5, "it_requests"),
    children: [
      { name: "it-requests.create", path: "new", resourceAction: "create", element: gate("it_requests", "create", <RequestCreate />) },
      { name: "it-requests.show", path: ":id", element: gate("it_requests", "get", <RequestShow />) },
    ],
  },
  {
    name: "it-fulfillment",
    path: "/fulfillment",
    element: gate("it_fulfillment_jobs", "list", <FulfillmentBoard />),
    resource: navMeta("Fulfillment", "it.nav.fulfillment", <ListChecks />, 6, "it_fulfillment_jobs"),
  },
  {
    name: "it-repairs",
    path: "/repairs",
    element: gate("it_repairs", "list", <RepairsBoard />),
    resource: navMeta("Repairs", "it.nav.repairs", <Wrench />, 7, "it_repairs"),
    children: [
      { name: "it-repairs.create", path: "create", resourceAction: "create", element: gate("it_repairs", "create", <RepairCreate />) },
    ],
  },
  {
    name: "it-licenses",
    path: "/licenses",
    element: gate("it_licenses", "list", <LicenseList />),
    resource: navMeta("Licenses", "it.nav.licenses", <ShieldCheck />, 8, "it_licenses"),
    children: [
      { name: "it-licenses.create", path: "create", resourceAction: "create", element: gate("it_licenses", "create", <LicenseCreate />) },
      { name: "it-licenses.edit", path: ":id/edit", resourceAction: "edit", element: gate("it_licenses", "update", <LicenseEdit />) },
    ],
  },
  {
    name: "it-knowledge",
    path: "/knowledge",
    element: gate("it_runbooks", "list", <RunbookList />),
    resource: navMeta("Runbooks", "it.nav.knowledge", <BookOpen />, 9, "it_runbooks"),
    children: [
      { name: "it-knowledge.show", path: ":id", element: gate("it_runbooks", "get", <RunbookShow />) },
    ],
  },
  {
    name: "it-reports",
    path: "/reports",
    element: <ReportsPage />,
    resource: navMeta("Reports", "it.nav.reports", <BarChart3 />, 10),
  },
]);
