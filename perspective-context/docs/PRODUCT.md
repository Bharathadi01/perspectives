# Product

## Promise
Ask for perspective. Receive useful human insight. Connect when interest is mutual.

## V1 loop
1. Complete an adult, trustworthy profile and select perspective lenses.
2. Publish a tightly framed Perspective Request.
3. Explore one eligible request at a time.
4. Give structured feedback attached to that request.
5. Review received perspectives privately.
6. Mark helpful, archive, report, or express connection interest.
7. Open chat only after compatible mutual intent.
8. Collect private outcome feedback.

## Five tabs
- Explore: finite one-card-at-a-time request batch.
- Inbox: received perspectives and invitations.
- Create: central request action.
- Connections: mutual connections and conversations.
- You: profile, requests, settings, privacy, and safety.

## Request fields
Category, exact question, optional context, response style, text/image media, audience rules, connection permission, allowed connection modes, expiry.

## Response fields
First impression, reason, optional suggestion, up to three tags, tone, optional connection intent.

## Connection modes
Chat, friends, date, collaborate, network. Intent must be mutually compatible before chat opens.

## State machines
- Request: `draft -> pending_moderation -> active -> paused|fulfilled|expired|removed -> archived`
- Response: `submitted -> pending_moderation -> delivered -> helpful|archived|reported|removed`
- Connection: `none -> one_sided_interest -> mutual_pending -> active -> unmatched|blocked`
- Moderation: `unreviewed -> machine_allowed|human_review -> allowed|removed -> appealed -> upheld|restored`

## P0 scope
Auth, onboarding, profile, request creation, Explore, structured responses, Inbox, helpful feedback, mutual connection, text chat, push, report, block, moderation operations, account deletion, analytics, monitoring.

## Excluded from v1
Public scoring, followers, public comments, anonymous feedback, live streaming, groups, ads, boosts, complex subscriptions, custom ML, AI-written human responses, and national launch.

## North star
Helpful Perspectives per Weekly Active Requester.

## Guardrails
Reports/1,000 responses; blocks/1,000 interactions; severe safety incidents; zero-response requests at 24 hours; moderation response time; exposure concentration; deletion and notification opt-out.
