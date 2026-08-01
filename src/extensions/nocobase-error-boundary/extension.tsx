import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { ShieldAlert } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route } from "react-router";

import { LoadingState } from "@/components/app-shell/loading-state";

const ErrorBoundaryDemo = lazy(() => import("./demo"));

const errorBoundaryExtension: AppExtension = {
  id: "nocobase-error-boundary",
  dev: {
    resources: [
      {
        name: "error-boundary",
        list: "error-boundary",
        meta: {
          label: "Error boundaries",
          icon: <ShieldAlert />,
          description: "Root, page, and region error-containment patterns.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <Route
        key="nocobase-error-boundary"
        path="error-boundary"
        element={
          <Suspense fallback={<LoadingState className="min-h-80" />}>
            <ErrorBoundaryDemo />
          </Suspense>
        }
      />
    ),
  },
};

export default errorBoundaryExtension;
