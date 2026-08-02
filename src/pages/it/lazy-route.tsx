import type { ComponentType } from "react";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";

type LazyRouteModule = { default: ComponentType };
type LazyRouteLoader = () => Promise<LazyRouteModule>;

export function withCollectionAccess(
  load: LazyRouteLoader,
  resource: string,
  action: string
): LazyRouteLoader {
  return async () => {
    const { default: Page } = await load();

    function ProtectedRoute() {
      return (
        <CanAccess
          resource={resource}
          action={action}
          fallback={<AccessDenied />}
        >
          <Page />
        </CanAccess>
      );
    }

    return { default: ProtectedRoute };
  };
}
