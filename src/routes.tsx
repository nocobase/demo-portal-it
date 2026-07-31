import { defineAppRoutes } from "@/app/route-runtime";
import { Boxes, ClipboardList, LayoutDashboard, Wrench } from "lucide-react";

import { ItConsolePage } from "@/pages/it-console";

// Set this to false when the application no longer needs the example routes
// contributed by installed Registry extensions. Providers, adapters, and the
// development showcase under /dev remain available.
export const registryRoutesEnabled = false;

// Add application-owned business routes here. Installed Registry extensions
// contribute their own route definitions through the same runtime. Add a
// resource entry when a route should also appear in navigation.
export const appRoutes = defineAppRoutes([
  {
    name: "it-dashboard",
    path: "/dashboard",
    element: <ItConsolePage page="dashboard" />,
    resource: {
      meta: { label: "Dashboard", icon: <LayoutDashboard />, priority: 1 },
    },
  },
  {
    name: "it-assets",
    path: "/assets",
    element: <ItConsolePage page="assets" />,
    resource: {
      meta: { label: "Assets", icon: <Boxes />, priority: 2 },
    },
  },
  {
    name: "it-requests",
    path: "/requests",
    element: <ItConsolePage page="requests" />,
    resource: {
      meta: { label: "Requests", icon: <ClipboardList />, priority: 3 },
    },
  },
  {
    name: "it-licenses",
    path: "/licenses",
    element: <ItConsolePage page="licenses" />,
    resource: {
      meta: { label: "Licenses", icon: <Boxes />, priority: 4 },
    },
  },
  {
    name: "it-repairs",
    path: "/repairs",
    element: <ItConsolePage page="repairs" />,
    resource: {
      meta: { label: "Repairs", icon: <Wrench />, priority: 5 },
    },
  },
]);
