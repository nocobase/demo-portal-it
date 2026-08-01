import { PromptOutput } from "@/components/demo/prompt-output";

const overlayExample = `export const appRoutes = defineAppRoutes([
  {
    name: "customers",
    path: "customers",
    element: <CustomerList />,
    resource: { meta: { label: "Customers" } },
    children: [
      {
        name: "customers.create",
        path: "create",
        resourceAction: "create",
        element: <CustomerCreateRoute />,
      },
    ],
  },
]);

function CustomerCreateRoute() {
  return (
    <RouteDrawer
      title="Create customer"
      closeLabel="Close"
      closeTo="/customers"
    >
      <CustomerCreateForm />
    </RouteDrawer>
  );
}`;

const pageExample = `function CustomerResourceLayout() {
  const childPage = useOutlet();
  return childPage ?? <CustomerList />;
}

export const appRoutes = defineAppRoutes([
  {
    name: "customers",
    path: "customers",
    outlet: "manual",
    element: <CustomerResourceLayout />,
    resource: { meta: { label: "Customers" } },
    children: [
      {
        name: "customers.create",
        path: "create",
        resourceAction: "create",
        element: <CustomerCreatePage />,
      },
    ],
  },
]);`;

const contextualExample = `export const appRoutes = defineAppRoutes([
  {
    name: "customers",
    path: "customers",
    element: <CustomerList />,
    resource: { meta: { label: "Customers" } },
    children: [
      // These are contextual child routes. They stay under the host page.
      {
        name: "customers.create",
        path: "create",
        resourceAction: "create",
        element: <CustomerCreateRoute returnTo="list" />,
      },
      {
        name: "customers.edit",
        path: "edit/:id",
        resourceAction: "edit",
        element: <CustomerEditRoute returnTo="list" />,
      },
      {
        name: "customers.show",
        path: "show/:id",
        resourceAction: "show",
        element: <CustomerShowRoute />,
        children: [
          {
            name: "customers.show.edit",
            path: "edit",
            // Contextual duplicate: do not register a second resourceAction.
            element: <CustomerEditRoute returnTo="show" />,
          },
        ],
      },
    ],
  },
]);

// CustomerShowRoute renders useOutlet() through RouteDrawer's nested prop.
// From the list, use navigate("edit/42") or navigate("show/42").
// From CustomerShowRoute, use navigate("edit") for the contextual editor.
// Do not navigate to a fixed /customers/edit/42 URL from another host.`;

export function ResourceActionGuide() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">
          Refine resource actions
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          <code>resourceAction</code> registers the action URL. The route element
          still decides whether that URL opens an overlay or replaces the list.
          Add ACL and unsaved-change handling as shown in the installed Users
          example.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <PromptOutput
          title="List + routed drawer"
          description="Use the automatic resource outlet and let the child own RouteDrawer."
          prompt={overlayExample}
          copyLabel="Copy example"
          copiedLabel="Copied"
          promptClassName="min-h-96"
        />
        <PromptOutput
          title="Full page replaces the list"
          description="Use a manual resource outlet when the action is a standalone page."
          prompt={pageExample}
          copyLabel="Copy example"
          copiedLabel="Copied"
          promptClassName="min-h-96"
        />
        <PromptOutput
          title="Contextual child surfaces"
          description="Reuse create, edit, and detail content while each host owns its nested route."
          prompt={contextualExample}
          copyLabel="Copy example"
          copiedLabel="Copied"
          promptClassName="min-h-96"
        />
      </div>
    </section>
  );
}
