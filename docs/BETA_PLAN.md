# Beta plan

Decided by the product owner on 2026-10-20. The product rules are in `PRODUCT.md`; this file says what the beta must teach us and how we decide afterwards.

## Who and how long
- Invite-only, 50 to 100 people, mostly the founders' friends.
- Ages 20 to 25, about 60:40 men to women. Invite in waves and keep that balance.
- About one month. English only. Location is ignored.

## What everyone gets
- The onboarding goal (Get perspectives and/or Meet new people), private.
- One audience setting, used both ways. "Get perspectives only" people start with all genders selected and see a hint that including more people brings more perspectives.
- Orientation is asked but optional and private. It is not used for matching; it is only compared with what people actually do.
- No A/B test. With this few people, two groups would each be too small to show anything. We watch one setup and talk to people.

## The main question: dating app or social app?
| Question | What to look at | Points to dating if | Points to social if |
|---|---|---|---|
| Why do people come? | Share who tick "Meet new people" (alone or with perspectives) | over 70% | many tick "Get perspectives" only and stay |
| Do people want feedback from outside who they would date? | Share whose audience includes genders outside their orientation | few | many |
| Is that outside feedback useful? | Helpful rate of perspectives from inside vs outside the owner's orientation | outside is marked helpful much less | about the same |
| Does it feel wrong? | Skips, blocks and reports on profiles outside someone's orientation; interviews | much higher than for others | similar |
| What do connections look like? | Share of connections that match both people's orientations | over 80% | many same-gender or friendship connections |
| Who stays? | Day-14 retention by goal | "perspectives only" people leave | "perspectives only" people stay |

**After 4 weeks:**
- **Mostly dating signals:** for people who want to meet, orientation decides who they see (a separate "who I want to meet" setting, filled in from orientation).
- **Mostly social signals:** keep the one audience setting, perspectives-first.
- **Mixed:** keep one audience setting, and pre-fill it from orientation for people who want to meet.

The numbers are signals, not proof. Pair them with about 10 short interviews.

## Health checks (every week)
- Main number: helpful perspectives per weekly active person. Second: healthy connections (connected, both wrote, nobody reported or blocked within 14 days).
- Share of active profiles with no perspective after 24 hours (target: close to 0).
- How unevenly perspectives are spread (no one far above everyone else).
- Perspectives received per day by men and by women. If one side gets more than about twice the other, recruit to rebalance.
- Mandatory sets that could not be filled.
- Reports and blocks per 1,000 perspectives; connect decline rate; holds and bans, and appeals.

## How we measure
Everything above comes from data the app already keeps (perspectives, helpful marks, skips, blocks, reports, connections, daily sets) plus the goal and orientation answers. A few database queries are enough; no analytics service is needed. Orientation must never be copied into analytics events or logs.

## What must exist before the beta
In order:
1. The algorithm changes (decided 2026-10-20): mandatory count 1/2/3, boost for active people with no perspectives in 3 days, skip people inactive for 7 days, soft received limit, connect limit, 4 to 5 more profiles after the set, new ranking inputs.
2. The goal question, the worded audience step, optional private orientation, removing the dating intention, automatic widening, and the in-app notices list.
3. The admin dashboard, holds, bans, the ban screen and appeals (`SECURITY.md` → Admin access and enforcement), plus the weak-giver loop.
4. The blocked list with unblock.
5. Push notifications (needs Expo development builds).

Real moderation of text, photos and voice is to be added during the beta; until then reports and the admin review are the safety net.
