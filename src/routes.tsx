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

import { withCollectionAccess } from "@/pages/it/lazy-route";

export const registryRoutesEnabled = false;

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
    lazy: () =>
      import("@/pages/it/dashboard").then(({ DashboardPage }) => ({
        default: DashboardPage,
      })),
    resource: navMeta("Dashboard", "it.nav.dashboard", <LayoutDashboard />, 1),
  },
  {
    name: "it-assets",
    path: "/asset-register",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/assets/asset-list").then(({ AssetList }) => ({
          default: AssetList,
        })),
      "it_assets",
      "list"
    ),
    resource: navMeta("Assets", "it.nav.assets", <Boxes />, 2, "it_assets"),
    children: [
      {
        name: "it-assets.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/assets/asset-form").then(({ AssetCreate }) => ({
              default: AssetCreate,
            })),
          "it_assets",
          "create"
        ),
      },
      {
        name: "it-assets.show",
        path: ":id",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/assets/asset-show").then(({ AssetShow }) => ({
              default: AssetShow,
            })),
          "it_assets",
          "get"
        ),
        children: [
          {
            name: "it-assets.edit",
            path: "edit",
            resourceAction: "edit",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/assets/asset-form").then(({ AssetEdit }) => ({
                  default: AssetEdit,
                })),
              "it_assets",
              "update"
            ),
          },
          {
            name: "it-assets.show.repair",
            path: "repairs/:repairId",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/repairs").then(({ RepairShow }) => ({
                  default: RepairShow,
                })),
              "it_repairs",
              "get"
            ),
          },
        ],
      },
    ],
  },
  {
    name: "it-assignments",
    path: "/assignments",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/assignments").then(({ AssignmentsOverview }) => ({
          default: AssignmentsOverview,
        })),
      "it_assignments",
      "list"
    ),
    resource: navMeta("Assignments", "it.nav.assignments", <Users />, 3, "it_assignments"),
  },
  {
    name: "it-catalog",
    path: "/catalog",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/catalog").then(({ ServiceCatalog }) => ({
          default: ServiceCatalog,
        })),
      "it_request_types",
      "list"
    ),
    resource: navMeta("Service catalog", "it.nav.catalog", <LayoutGrid />, 4, "it_request_types"),
    children: [
      {
        name: "it-catalog.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/catalog-form").then(({ CatalogItemCreate }) => ({
              default: CatalogItemCreate,
            })),
          "it_request_types",
          "create"
        ),
      },
      {
        name: "it-catalog.edit",
        path: ":id/edit",
        resourceAction: "edit",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/catalog-form").then(({ CatalogItemEdit }) => ({
              default: CatalogItemEdit,
            })),
          "it_request_types",
          "update"
        ),
      },
    ],
  },
  {
    name: "it-requests",
    path: "/requests",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/requests/request-list").then(({ RequestList }) => ({
          default: RequestList,
        })),
      "it_requests",
      "list"
    ),
    resource: navMeta("Requests", "it.nav.requests", <ClipboardList />, 5, "it_requests"),
    children: [
      {
        name: "it-requests.create",
        path: "new",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/requests/request-form").then(({ RequestCreate }) => ({
              default: RequestCreate,
            })),
          "it_requests",
          "create"
        ),
      },
      {
        name: "it-requests.show",
        path: ":id",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/requests/request-show").then(({ RequestShow }) => ({
              default: RequestShow,
            })),
          "it_requests",
          "get"
        ),
        children: [
          {
            name: "it-requests.edit",
            path: "edit",
            resourceAction: "edit",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/requests/request-form").then(
                  ({ RequestEdit }) => ({ default: RequestEdit })
                ),
              "it_requests",
              "update"
            ),
          },
          {
            name: "it-requests.show.job",
            path: "jobs/:jobId",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/fulfillment").then(
                  ({ FulfillmentShow }) => ({ default: FulfillmentShow })
                ),
              "it_fulfillment_jobs",
              "get"
            ),
          },
        ],
      },
    ],
  },
  {
    name: "it-fulfillment",
    path: "/fulfillment",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/fulfillment").then(({ FulfillmentBoard }) => ({
          default: FulfillmentBoard,
        })),
      "it_fulfillment_jobs",
      "list"
    ),
    resource: navMeta("Fulfillment", "it.nav.fulfillment", <ListChecks />, 6, "it_fulfillment_jobs"),
    children: [
      {
        name: "it-fulfillment.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/fulfillment").then(({ FulfillmentCreate }) => ({
              default: FulfillmentCreate,
            })),
          "it_fulfillment_jobs",
          "create"
        ),
      },
      {
        name: "it-fulfillment.show",
        path: ":id",
        resourceAction: "show",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/fulfillment").then(({ FulfillmentShow }) => ({
              default: FulfillmentShow,
            })),
          "it_fulfillment_jobs",
          "get"
        ),
        children: [
          {
            name: "it-fulfillment.edit",
            path: "edit",
            resourceAction: "edit",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/fulfillment").then(({ FulfillmentEdit }) => ({
                  default: FulfillmentEdit,
                })),
              "it_fulfillment_jobs",
              "update"
            ),
          },
        ],
      },
    ],
  },
  {
    name: "it-repairs",
    path: "/repairs",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/repairs").then(({ RepairsBoard }) => ({
          default: RepairsBoard,
        })),
      "it_repairs",
      "list"
    ),
    resource: navMeta("Repairs", "it.nav.repairs", <Wrench />, 7, "it_repairs"),
    children: [
      {
        name: "it-repairs.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/repairs").then(({ RepairCreate }) => ({
              default: RepairCreate,
            })),
          "it_repairs",
          "create"
        ),
      },
      {
        name: "it-repairs.show",
        path: ":id",
        resourceAction: "show",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/repairs").then(({ RepairShow }) => ({
              default: RepairShow,
            })),
          "it_repairs",
          "get"
        ),
        children: [
          {
            name: "it-repairs.edit",
            path: "edit",
            resourceAction: "edit",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/repairs").then(({ RepairEdit }) => ({
                  default: RepairEdit,
                })),
              "it_repairs",
              "update"
            ),
          },
        ],
      },
    ],
  },
  {
    name: "it-licenses",
    path: "/licenses",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/licenses/license-list").then(({ LicenseList }) => ({
          default: LicenseList,
        })),
      "it_licenses",
      "list"
    ),
    resource: navMeta("Licenses", "it.nav.licenses", <ShieldCheck />, 8, "it_licenses"),
    children: [
      {
        name: "it-licenses.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/licenses/license-form").then(({ LicenseCreate }) => ({
              default: LicenseCreate,
            })),
          "it_licenses",
          "create"
        ),
      },
      {
        name: "it-licenses.edit",
        path: ":id/edit",
        resourceAction: "edit",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/licenses/license-form").then(({ LicenseEdit }) => ({
              default: LicenseEdit,
            })),
          "it_licenses",
          "update"
        ),
      },
    ],
  },
  {
    name: "it-knowledge",
    path: "/knowledge",
    lazy: withCollectionAccess(
      () =>
        import("@/pages/it/knowledge/runbook-list").then(({ RunbookList }) => ({
          default: RunbookList,
        })),
      "it_runbooks",
      "list"
    ),
    resource: navMeta("Runbooks", "it.nav.knowledge", <BookOpen />, 9, "it_runbooks"),
    children: [
      {
        name: "it-knowledge.create",
        path: "create",
        resourceAction: "create",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/knowledge/runbook-form").then(
              ({ RunbookCreate }) => ({ default: RunbookCreate })
            ),
          "it_runbooks",
          "create"
        ),
      },
      {
        name: "it-knowledge.show",
        path: ":id",
        lazy: withCollectionAccess(
          () =>
            import("@/pages/it/knowledge/runbook-show").then(({ RunbookShow }) => ({
              default: RunbookShow,
            })),
          "it_runbooks",
          "get"
        ),
        children: [
          {
            name: "it-knowledge.edit",
            path: "edit",
            resourceAction: "edit",
            lazy: withCollectionAccess(
              () =>
                import("@/pages/it/knowledge/runbook-form").then(
                  ({ RunbookEdit }) => ({ default: RunbookEdit })
                ),
              "it_runbooks",
              "update"
            ),
          },
        ],
      },
    ],
  },
  {
    name: "it-reports",
    path: "/reports",
    lazy: () =>
      import("@/pages/it/reports").then(({ ReportsPage }) => ({
        default: ReportsPage,
      })),
    resource: navMeta("Reports", "it.nav.reports", <BarChart3 />, 10),
  },
]);
