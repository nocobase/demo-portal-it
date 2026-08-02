import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const {
    buildRouteLocationHref,
    createRouteSurfaceNavigationState,
    resolveRouteSurfaceCloseTo,
  } = await server.ssrLoadModule("@nocobase/portal-sdk/routing");
  const location = {
    pathname: "/customers",
    search: "?status=renewal&page=2",
    hash: "#northwind",
    state: { activeTab: "mine" },
  };

  assert.equal(
    buildRouteLocationHref(location),
    "/customers?status=renewal&page=2#northwind"
  );
  assert.deepEqual(createRouteSurfaceNavigationState(location), {
    activeTab: "mine",
    routeSurfaceReturnTo: "/customers?status=renewal&page=2#northwind",
  });
  assert.equal(
    resolveRouteSurfaceCloseTo(
      { routeSurfaceReturnTo: "/customers?page=2" },
      { pathname: "/customers" }
    ),
    "/customers?page=2"
  );
  assert.equal(
    resolveRouteSurfaceCloseTo(undefined, {
      pathname: "/customers/show/42",
      search: "?tab=activity",
    }),
    "/customers/show/42?tab=activity"
  );

  console.log("NocoBase route surfaces regression tests passed");
} finally {
  await server.close();
}
