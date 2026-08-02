# NocoBase error boundary

`NocoBaseErrorBoundary` contains render, lifecycle, lazy-component, and errors
forwarded through `useErrorBoundary`. It presents the same copyable, redacted
diagnostic format for root, page, and region failures.

The development showcase at `/dev/error-boundary` demonstrates render and
forwarded asynchronous failures for all three variants.

Use `root` outside application providers, `page` around routed page content, and
`region` around independently recoverable surfaces such as charts, AI output,
or third-party renderers. Keep normal API errors in their owning page or region
state instead of escalating every request failure to an error boundary.

```tsx
import { NocoBaseErrorBoundary } from "@/extensions/nocobase-error-boundary";

<NocoBaseErrorBoundary variant="region" resetKeys={[record.id]}>
  <RiskyRegion />
</NocoBaseErrorBoundary>;
```
