# Background Check Provider Research

## Checkr
- **API capabilities**: RESTful API with SDKs (Node, Python, Ruby). Supports webhook callbacks for status updates, fine-grained report ordering, and sandbox mode for testing.
- **Cost structure**: Starter plans begin around $29/report for basic screens; volume pricing negotiated for enterprise. Add-ons (global watchlists, education verification) billed per check.
- **Turnaround time**: Instant for SSN trace and watchlists; U.S. county criminal searches typically 1–3 business days. Checkr publishes live status dashboards and auto-notifies when delays occur.

## Sterling
- **API capabilities**: SOAP + REST APIs, with OAuth-based authentication and webhook/event bridge support. Offers pre-built integrations for Workday, ServiceNow, and custom middleware.
- **Cost structure**: Premium provider—baseline packages often $35–$50/report with custom quotes. Additional fees for international searches and adjudication services.
- **Turnaround time**: Advertises 1 day for standard U.S. checks, 3–5 days for international screening. Provides SLA-backed escalation channels for enterprise clients.

## HireRight
- **API capabilities**: REST API plus XML gateway; supports bulk ordering, applicant invites, and status polling webhooks. Offers compliance tools for consent and adverse action workflows.
- **Cost structure**: Mid-range pricing (~$30/report for core package) with tiered discounts at scale. Charges extra for drug testing, education, and employment verifications.
- **Turnaround time**: Core U.S. criminal searches average 1–2 business days; international checks vary 3–7 days. Provides configurable alerts when turnaround exceeds SLA.

## Summary Recommendations
- **Fast + developer-friendly**: Checkr (modern API, extensive SDKs, good documentation).
- **Enterprise compliance focus**: Sterling (strong integrations and SLAs, but higher cost).
- **Balanced cost/performance**: HireRight (broader compliance workflows, moderate pricing).
