# Release status

The application is a local prototype plus a private, fictional-data review build. Initial account/record and membership workflows are implemented locally; the complete seven-sprint specification has not been delivered as a production system.

Before any real patient launch:

1. Deploy and validate the API, PostgreSQL, private document storage, encryption-key management and backups in the approved South African region. Test restore, residency, monitoring and incident handling.
2. Replace displayed local OTPs and sample roles with a verified delivery provider, staff provisioning, MFA, robust distributed abuse controls and production session management.
3. Integrate and verify the payment provider, authenticated webhooks, idempotency, debit-order mandates, reconciliation, invoice delivery, failed-payment handling and tax documentation. Local invoice generation and test-payment events do not collect funds.
4. Confirm the information officer, consent wording, record retention/deletion process, processor contracts, staff permissions, audit retention and independent security assessment. Database triggers are not a substitute for tamper-resistant backup and operational controls.
5. Confirm clinical protocols, human review ownership, staffed hours, escalation and emergency arrangements. Device flags do not diagnose or automatically treat a member.
6. Complete supported device integrations, document extraction/reconciliation, e-prescribing, pharmacy onboarding, delivery signature/photo/offline sync, live messaging/video, reminders and medical-aid claims workflows as applicable. Existing demonstration queues are not live partner integrations.
7. Test the native app on physical Android/iOS devices, accessibility with intended users, unreliable networks, permissions and background/session behaviour. Complete distribution/signing before an app-store release.

## Current limitations

- OTPs are returned locally for testing; no email or SMS is sent. Staff MFA and self-service staff registration are not implemented.
- Payment methods are selections only; no card data is accepted and no funds move.
- Uploaded local demo documents are encrypted in the database. OCR, malware scanning and managed object storage are not connected.
- Family grants create a local account record; no invitation email is sent by the local app.
- Consultation/video links and pharmacy/driver data are fictional. Delivery uses a clearly labelled name-confirmation demonstration, without signature/photo capture.
- Reading thresholds are sample clinician protocols. Production monitoring needs explicit response targets and after-hours coverage.
- Village clinics, benefits and claims are partial/reference views. Claims submission and adjudication are not implemented.
- PostgreSQL is supported in code but has not been exercised against a running server in this workspace.
- Business-day calculations include standard holidays and Easter; exceptional proclaimed holidays require a maintained calendar.
- The review site's hosting region is not established as South African. It contains fictional fixtures only, never local user records.

The `NODE_ENV=production` startup gate intentionally remains closed. Do not remove it until these requirements are implemented and validated.
