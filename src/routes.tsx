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
import { CatalogItemCreate, CatalogItemEdit } from "@/pages/it/catalog-form";
import { RequestList } from "@/pages/it/requests/request-list";
import { RequestShow } from "@/pages/it/requests/request-show";
import { RequestCreate, RequestEdit } from "@/pages/it/requests/request-form";
import {
  FulfillmentBoard,
  FulfillmentCreate,
  FulfillmentEdit,
  FulfillmentShow,
} from "@/pages/it/fulfillment";
import { RepairsBoard, RepairCreate, RepairEdit, RepairShow } from "@/pages/it/repairs";
import { LicenseList } from "@/pages/it/licenses/license-list";
import { LicenseCreate, LicenseEdit } from "@/pages/it/licenses/license-form";
import { RunbookList } from "@/pages/it/knowledge/runbook-list";
import { RunbookShow } from "@/pages/it/knowledge/runbook-show";
import { RunbookCreate, RunbookEdit } from "@/pages/it/knowledge/runbook-form";
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
          {
            // Nested one level deeper: a repair opened from within an asset's
            // detail popup gets its own URL-addressable child route, reusing
            // the same RepairShow surface as the canonical /repairs/:id.
            name: "it-assets.show.repair",
            path: "repairs/:repairId",
            element: gate("it_repairs", "get", <RepairShow />),
          },
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
    children: [
      { name: "it-catalog.create", path: "create", resourceAction: "create", element: gate("it_request_types", "create", <CatalogItemCreate />) },
      { name: "it-catalog.edit", path: ":id/edit", resourceAction: "edit", element: gate("it_request_types", "update", <CatalogItemEdit />) },
    ],
  },
  {
    name: "it-requests",
    path: "/requests",
    element: gate("it_requests", "list", <RequestList />),
    resource: navMeta("Requests", "it.nav.requests", <ClipboardList />, 5, "it_requests"),
    children: [
      { name: "it-requests.create", path: "new", resourceAction: "create", element: gate("it_requests", "create", <RequestCreate />) },
      {
        name: "it-requests.show",
        path: ":id",
        element: gate("it_requests", "get", <RequestShow />),
        children: [
          { name: "it-requests.edit", path: "edit", resourceAction: "edit", element: gate("it_requests", "update", <RequestEdit />) },
          {
            // Nested one level deeper: a fulfilment job opened from within a
            // request's detail popup gets its own URL-addressable child
            // route, reusing the same FulfillmentShow surface as the
            // canonical /fulfillment/:id.
            name: "it-requests.show.job",
            path: "jobs/:jobId",
            element: gate("it_fulfillment_jobs", "get", <FulfillmentShow />),
          },
        ],
      },
    ],
  },
  {
    name: "it-fulfillment",
    path: "/fulfillment",
    element: gate("it_fulfillment_jobs", "list", <FulfillmentBoard />),
    resource: navMeta("Fulfillment", "it.nav.fulfillment", <ListChecks />, 6, "it_fulfillment_jobs"),
    children: [
      { name: "it-fulfillment.create", path: "create", resourceAction: "create", element: gate("it_fulfillment_jobs", "create", <FulfillmentCreate />) },
      {
        name: "it-fulfillment.show",
        path: ":id",
        resourceAction: "show",
        element: gate("it_fulfillment_jobs", "get", <FulfillmentShow />),
        children: [
          { name: "it-fulfillment.edit", path: "edit", resourceAction: "edit", element: gate("it_fulfillment_jobs", "update", <FulfillmentEdit />) },
        ],
      },
    ],
  },
  {
    name: "it-repairs",
    path: "/repairs",
    element: gate("it_repairs", "list", <RepairsBoard />),
    resource: navMeta("Repairs", "it.nav.repairs", <Wrench />, 7, "it_repairs"),
    children: [
      { name: "it-repairs.create", path: "create", resourceAction: "create", element: gate("it_repairs", "create", <RepairCreate />) },
      {
        name: "it-repairs.show",
        path: ":id",
        resourceAction: "show",
        element: gate("it_repairs", "get", <RepairShow />),
        children: [
          { name: "it-repairs.edit", path: "edit", resourceAction: "edit", element: gate("it_repairs", "update", <RepairEdit />) },
        ],
      },
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
      { name: "it-knowledge.create", path: "create", resourceAction: "create", element: gate("it_runbooks", "create", <RunbookCreate />) },
      {
        name: "it-knowledge.show",
        path: ":id",
        element: gate("it_runbooks", "get", <RunbookShow />),
        children: [
          { name: "it-knowledge.edit", path: "edit", resourceAction: "edit", element: gate("it_runbooks", "update", <RunbookEdit />) },
        ],
      },
    ],
  },
  {
    name: "it-reports",
    path: "/reports",
    element: <ReportsPage />,
    resource: navMeta("Reports", "it.nav.reports", <BarChart3 />, 10),
  },
]);
