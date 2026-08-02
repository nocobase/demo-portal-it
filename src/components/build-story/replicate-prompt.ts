// Prompt that lets a visitor rebuild this app from scratch with their own
// coding agent. Derived from the live data model, pages and workflows of
// this portal, so it describes what the app actually is.
// English only - it is meant to be pasted into a coding agent.

export function buildReplicatePrompt() {
  return `Build an "IT Service Desk" app on NocoBase with your coding agent.

What it is: internal IT operations: a service catalogue, requests with approval and fulfilment, an asset register with assignments and repairs, software licences and runbooks.

Data model (collection - purpose; key fields):
  it_assets - assets
      fields: status (Assigned|Available|In stock|In use|Retired), category (Desktop|Laptop|Monitor|Networking|Peripheral), purchaseDate, name, serialNumber, location, assetTag, retiredAt, notes
      relations: repairs -> it_repairs, itRequests -> it_requests, assignee -> users
  it_assignments - assignments
      fields: memberId, checkedInAt, assetId, notes, checkedOutAt
      relations: asset -> it_assets, member -> users
  it_fulfillment_jobs - work items created after a request is approved
      fields: status (Blocked|Done|In progress|Queued), priority (Critical|High|Low|Medium), dueDate, instructions, title, requestId, assigneeId
      relations: request -> it_requests, assignee -> users
  it_licenses - licenses
      fields: status (Active|Expiring soon|Over-allocated), licenseType (Named host|Named user|Per endpoint|Per member|Per seat), seatsTotal, seatsUsed, name, renewalDate, annualCost, ownerId, vendor
      relations: owner -> users
  it_repairs - repairs
      fields: status (Done|In progress|Open|Scheduled), issue, cost, vendor, startedAt, completedAt, assetId, notes
      relations: asset -> it_assets
  it_request_types - the service-catalogue entries a request is raised from
      fields: category (Access|Facilities|Hardware|Network|Software), icon, description, requiresApproval, fulfillmentTeam, defaultPriority, slaHours, name, active
  it_requests - requests
      fields: requestType (Access Request|Incident|Service request), category (Access & identity|General IT support|Hardware|Mobile|Network & connectivity), priority (Critical|High|Low|Medium), requesterId, resolution, approvedAt, requestTypeRefId, description, status
      relations: fulfillmentJobs -> it_fulfillment_jobs, requester -> users, asset -> it_assets, assignee -> users, requestTypeRef -> it_request_types
  it_runbooks - step-by-step internal procedures
      fields: category (Access|Hardware|Network|Onboarding|Security), views, tags, summary, published, body, title

Pages:
  /asset-register, /assignments, /catalog, /dashboard, /fulfillment, /knowledge, /licenses, /repairs, /reports, /requests
  Each resource page is a list with search/filter plus create, edit and detail dialogs.

Workflows:
  it_ Notify IT of new request - on it_requests change
  it_ Create fulfillment job after approval - on it_requests change

Seed data: about 181 rows in total, e.g. it_assets ~44, it_requests ~39, it_repairs ~21.
Keep every seeded value in English.

Build in this order: data model -> pages -> workflows -> roles/permissions -> seed data.
After each page, open it and confirm it renders and its create/edit dialogs work before moving on.`;
}
