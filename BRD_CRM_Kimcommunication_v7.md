# Business Requirements Document (BRD)

**Project Name:** CRM System Development  
**Client:** Kim Communication  
**Document Version:** 7.0  
**Revision Date:** July 28, 2026  
**Revision Theme:** EMS Integration, 5-Tab Participant Lifecycle, Engagement Logging, and PIC Operations

## Document Control

| Version | Date | Summary |
|---|---|---|
| 6.0 | July 21, 2026 | PIC assignment, default PIC, operational-tab access, and PIC export. |
| 7.0 | July 28, 2026 | Aligns the BRD with the current event workflow: EMS mapping and sync, 5 participant tabs, Declined segregation, engagement history, explicit milestone updates, PIC workload reporting, expanded search, and event-history filtering. |

## 1. Executive Summary

Kim Communication's CRM is a centralized platform for managing contacts, companies, groups, events, participant follow-up, data quality, and privacy-related removal requests. Version 7 extends the event operating model by connecting CRM events to EMS events, separating participant handling into five lifecycle tabs, recording each telemarketing engagement as an auditable activity, and giving administrators a workload view for distributing participants across eligible PICs.

The revised workflow keeps the master contact database and EMS registrants distinct at intake, makes declined participants easy to isolate, and separates communication logs from milestone status changes. This prevents a call, email, or WhatsApp log from silently changing H-7/H-3/H-1/D-Day status while still allowing an authorized user to explicitly synchronize a selected outcome to the participant table.

## 2. Business Objectives

- Maintain a single source of truth for contacts, companies, groups, events, and event participation.
- Reduce duplicate, incomplete, and suspicious contact data through validation and fraud flagging.
- Integrate CRM events with EMS events and synchronize EMS registrants into the CRM workflow.
- Improve telemarketing productivity through five clearly separated participant work queues.
- Preserve an auditable history of Call, Email, and WhatsApp activity per participant.
- Balance operational workload across eligible PICs while maintaining role-based visibility.
- Support accurate reporting through contextual search, participant history filters, and Excel export.
- Maintain privacy compliance through controlled takeout and removal approval.

## 3. Scope of Work

### 3.1 In Scope

- Database/contact, company, and holding-group management.
- Event creation and maintenance, including optional EMS event mapping.
- Manual participant selection from the master database and EMS participant synchronization.
- Five-tab participant lifecycle: Data List, Pre-Event, Reminder, Reminder D-Day, and Declined.
- PIC assignment, reassignment, equal distribution, workload monitoring, and access filtering.
- Telemarketing engagement logs for Call, Email, and WhatsApp.
- Explicit synchronization of engagement outcomes to H-7, H-3, H-1, D-Day, or confirmation status.
- Milestone reminder tracking and participant confirmation handling.
- Participant search across identity, company, role, email, and phone information.
- Event-history filter and visible prior-invitation badges during participant selection.
- Excel import, validation, data-quality normalization, fraud detection, removal workflow, and Excel export.

### 3.2 Out of Scope

- Native mobile application.
- Automated email newsletter or marketing blast.
- Automated SMS or WhatsApp blast through a third-party gateway.
- Bi-directional real-time EMS synchronization; synchronization is initiated from the CRM interface.

## 4. User Roles and Access

| Role | Database Role | Access |
|---|---|---|
| Admin | ADMIN | Full access to all modules and participants; EMS sync; user and event management; PIC filtering and distribution; activity/workload reports; fraud and removal-request processing. |
| Staff Event / Manager | MANAGER | Create and update operational records; process assigned participants; record engagement; update participant outcomes; submit takeout requests. On all participant tabs except Data List, visibility is restricted to the participant's assigned PIC. |
| Viewer | USER | Read-only access to permitted directories and event data. Cannot import, export, assign PICs, change participant status, or process approvals. |

## 5. Functional Requirements

### FR-01 Database Management

The system shall manage contact identity, salutation, first and last name, job title, position level, specialty/division, mobile phone, LinkedIn, corporate and personal email, and the related company. Bulk import shall support the approved company and contact template.

### FR-02 Company and Group Management

The system shall manage companies and holding groups, including brand, address, office phone, website, industry, revenue/company size, employee size, hardware needs, city, and postal-code-compatible company data.

### FR-03 Event Management and EMS Mapping

- The system shall create, edit, view, and delete events subject to role permission.
- An event may be linked to an EMS event through an EMS event dropdown or EMS Event ID.
- If an EMS mapping exists, an authorized user may initiate **Sync EMS**.
- After a successful sync, synchronized registrants shall be available in Pre-Event for telemarketing processing.
- The interface shall report the number of synchronized participants or a synchronization error.

### FR-04 Participant Intake and History

- Users may add one or multiple eligible contacts from the master database to an event.
- Search shall match all entered words across first name, last name, full name, company, job title, email, mobile phone, and available office phone.
- Participant selection may be filtered by company, position level, industry, city, and a previous event.
- The previous-event filter shall identify the same person using available database ID, email, or normalized phone information, and shall account for CRM/PMS/EMS event identity or event name.
- Prior invitations shall be visible as event badges during participant selection.

### FR-05 Five-Tab Participant Lifecycle

| Tab | Business Purpose | Inclusion Rule |
|---|---|---|
| Data List | Vet candidates selected from the CRM master database. | Non-EMS participants. PIC filtering does not apply. |
| Pre-Event | Process EMS registrants and approved CRM candidates. | EMS participants that are not declined, plus non-EMS participants with Approve/Confirmed status. |
| Reminder | Perform scheduled pre-event follow-up. | Participants with Approve/Confirmed status. |
| Reminder D-Day | Track final attendance response on event day. | Participants with Approve/Confirmed status. |
| Declined | Separate rejected or declined registrants from active queues. | Participants with Decline/Declined status. |

The current Reminder and Reminder D-Day eligibility rule is based on approval status. A separate `Registered` tele-remark is not required for inclusion.

### FR-06 PIC Assignment, Security, and Distribution

- PIC is represented by a `[PIC: Name]` tag at the beginning of participant Notes.
- If the tag is missing, the effective PIC shall fall back to Admin.
- Data List is a shared intake queue and is not filtered by PIC.
- On Pre-Event, Reminder, Reminder D-Day, and Declined, non-admin staff shall see only participants assigned to their own PIC identity.
- Admin shall see all participants and may filter by PIC.
- Admin may assign or reassign PIC individually or in batch.
- Admin may distribute remaining unassigned participants evenly or redistribute all participants across eligible operational PICs.
- Non-operational accounts shall not appear as eligible telemarketing PICs.
- The workload view shall show assigned counts and status composition per active PIC.
- Excel export shall expose PIC as a dedicated field and remove the PIC tag from the exported clean Notes value where that export format is used.

### FR-07 Engagement Logging and Outcome Synchronization

- Authorized staff may record Call, Email, and WhatsApp activity per participant.
- Each activity shall store channel, completion status, notes, creator, and timestamp.
- The engagement view shall show activity counts, last-activity time by channel, and a chronological history.
- Adding an engagement log shall not automatically change H-7 or another milestone status.
- A user may explicitly select a target field: H-7, H-3, H-1, D-Day, Registration Approval, or Log Only.
- A status change shall occur only after the user explicitly saves the selected outcome.
- When an explicit reminder outcome is saved for a participant who is not approved, the current workflow may also set confirmation to Approve so the participant remains in the operational reminder queue.

### FR-08 Milestone Reminder Statuses

- H-7, H-3, and H-1 support: None, Not Respond Yet, Not Respond 2x, Tentative, Confirm, and Unable to Attend.
- D-Day supports: On Location, On The Way, Not Respond Yet, repeated Not Respond states where available, and Unable to Attend.
- Registration approval supports: Approve, Pending, and Decline.
- Milestone status and engagement history are separate records and shall not be conflated.

### FR-09 PIC Activity and Workload Reporting

- Admin shall be able to open the PIC workload and balance view from operational tabs.
- The report shall support Today, last 7 days, last 30 days, all time, and custom date range.
- For a selected PIC, the report shall show Call, Email, and WhatsApp totals and the underlying activity timeline.
- The view shall also show participants managed by the selected PIC and support participant reassignment/removal actions subject to permission.

### FR-10 Excel Import and Data Quality

- Excel import shall preview new and duplicate/update rows before submission.
- The system shall normalize company naming where an ending `PT` must become a `PT ` prefix.
- Placeholder values such as `-`, `N/A`, `none`, `tidak ada`, and blank values shall not cause false duplicate detection.

### FR-11 Fraud Detection

- A phone number or email used by different contact names shall create a Suspected flag.
- Admin may move the flag to Confirmed, Cleared, or Deleted.
- Confirmed contacts shall be deactivated and hidden from the active directory; Cleared contacts shall return to normal active use.

### FR-12 Takeout and Removal Audit

- Staff may submit a removal request with an auditable reason.
- Admin shall approve or reject the request.
- Approved removal shall deactivate the contact from the active directory while preserving required event and audit history.

### FR-13 Export

- Authorized users may export the current participant context to Excel.
- Export output shall follow the active tab and include the fields appropriate to that workflow.
- Obsolete communication-status columns shall not be used when activity history is the authoritative record.

## 6. System Activity Flows

### 6.1 EMS Event and Participant Flow

1. Authorized user creates or edits a CRM event.
2. User optionally links the event to an EMS event.
3. User selects **Sync EMS** from the CRM event.
4. The backend retrieves and synchronizes EMS registrants.
5. The CRM reloads participants and opens Pre-Event.
6. Telemarketing staff process only participants visible under their PIC permission.

### 6.2 Manual Candidate Flow

1. User opens Add Participant from Data List or Pre-Event.
2. User searches or filters the master database, optionally using previous-event history.
3. User selects one or multiple contacts and adds them to the event.
4. Non-EMS candidates remain in Data List for vetting.
5. Approved candidates become available in Pre-Event and the approved reminder queues.
6. Declined candidates move to Declined.

### 6.3 Engagement and Status Flow

1. Staff opens a participant's engagement view.
2. Staff optionally enters engagement notes.
3. Staff records Call, Email, or WhatsApp; the system writes an activity log only.
4. If an outcome must update the participant table, staff selects the target milestone or confirmation field.
5. Staff selects the response outcome and explicitly saves it.
6. The participant is re-evaluated against the five-tab inclusion rules.

### 6.4 PIC Distribution Flow

1. Admin opens PIC Workload & Balance.
2. Admin reviews active PIC assignment counts and activity performance.
3. Admin assigns participants individually, distributes remaining participants evenly, or redistributes all participants.
4. The system stores the revised PIC tag in Notes.
5. Operational tab visibility immediately follows the updated PIC assignment.

## 7. Business Rules

- BR-01: Data List must remain visible as a shared non-EMS candidate queue.
- BR-02: PIC visibility applies to every participant tab except Data List.
- BR-03: Declined participants must not appear in Pre-Event, Reminder, or Reminder D-Day.
- BR-04: Reminder and Reminder D-Day require Approve/Confirmed; Registered is not an additional gate.
- BR-05: A communication log must not silently mutate a milestone status.
- BR-06: Only an explicit save may synchronize an engagement outcome to participant status.
- BR-07: EMS sync is available only when the CRM event has a valid EMS mapping.
- BR-08: Search terms are cumulative: every entered word must match somewhere in the participant's indexed display data.
- BR-09: Effective PIC defaults to Admin when no PIC tag exists.
- BR-10: PIC activity attribution uses the activity creator and selected reporting period.

## 8. Non-Functional Requirements

- Role and PIC restrictions shall be enforced consistently in the user interface and supporting API authorization.
- Participant and activity operations shall provide clear success and failure feedback.
- Lists and tables shall remain usable on common desktop widths with accessible horizontal scrolling where needed.
- Imported and synchronized data shall be validated before being presented as authoritative.
- Activity and removal records shall retain creator and timestamp information for auditability.
- Search and filters shall remain responsive for normal operational event volumes.

## 9. Acceptance Criteria

- AC-01: A mapped CRM event can synchronize EMS participants and show them in Pre-Event.
- AC-02: The event detail presents exactly five lifecycle tabs, including Declined.
- AC-03: A non-EMS candidate remains in Data List; an EMS registrant does not appear there.
- AC-04: An approved participant appears in Reminder and Reminder D-Day without requiring Registered tele-remarks.
- AC-05: A declined participant appears only in Declined among lifecycle queues.
- AC-06: Non-admin staff cannot see another PIC's participants outside Data List.
- AC-07: Recording a Call, Email, or WhatsApp creates an activity entry without changing H-7 by default.
- AC-08: Explicitly saving a milestone outcome updates only the chosen participant status fields and any documented approval synchronization.
- AC-09: Admin can view PIC activity totals for a selected reporting period.
- AC-10: Participant search matches names, company, title, email, and phone using cumulative terms.
- AC-11: Add Participant can filter by a prior event and shows prior-invitation badges.
- AC-12: Non-operational users are excluded from automatic PIC distribution.

## 10. Traceability of Version 7 Changes

| Change | Primary BRD References |
|---|---|
| EMS event mapping and participant sync | FR-03, 6.1, AC-01 |
| 5-tab lifecycle and Declined queue | FR-05, 6.2, BR-03, AC-02 to AC-05 |
| Reminder eligibility aligned to current system | FR-05, BR-04, AC-04 |
| Engagement history and explicit status sync | FR-07, 6.3, BR-05/06, AC-07/08 |
| PIC workload and activity report | FR-06, FR-09, 6.4, AC-09 |
| Expanded participant search | FR-04, BR-08, AC-10 |
| Previous-event filter and invitation badges | FR-04, AC-11 |
| Eligible telemarketing PIC filtering | FR-06, AC-12 |

## Approval

Prepared for review and approval by Kim Communication stakeholders.

| Prepared / Updated By | Client Approval |
|---|---|
| Juan Emmanuel | Lana |

