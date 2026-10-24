# The test world: 100 fake people to test the rules

A local-only set of 100 verified, fake people (54 men, 42 women, 4 non-binary), each set up so that a rule from steps 1 to 5 actually happens when you sign in. Photos are generated colour gradients, not real people.

- **Create or reset it:** `pnpm db:seed:world`. It deletes and recreates everyone with an `@world.test` email, so run it again whenever you want a clean start (for example after you gave perspectives while testing).
- **Password for everyone:** `perspective123`. Emails are the first name: `tara@world.test`, `dev@world.test`, and so on.
- **Admin page:** http://localhost:8082, `admin@perspective.test` / `perspective123`.
- **Each person's day is fresh:** nobody has opened the app yet today, so the first time you sign in as someone, their daily set is built from these rules.
- **Random parts change by day:** the boost pick and the last "discovery" profile are fixed per person per day, so the names can differ tomorrow; the rules don't.

> **Heads up:** the 7 original test people (Ravi, Meera, Asha, Kabir 28, Nisha, Priya, Arjun) and any accounts you made yourself (like "Jana" or "Sam") live in the same database, so they can appear in the world's Explore too. They were created recently, so they get the **new-member bonus** and often rank high. That is correct behaviour, not a bug.

## Who to sign in as, and what you should see

Checked on 2026-10-21 against the running app.

| Sign in as | Set up so that | You should see |
|---|---|---|
| **Tara** (woman 23, likes men 20–30) | 40+ men fit her range | A daily set of **3**; one card is the **boost** (someone with no perspectives in 3 days). **You → Blocked people** lists 2 men (Zubin, Dhruv). |
| **Rohan** (man 27, likes women 25–26) | 8 active women fit | A daily set of **2**. |
| **Neha** (woman 22, likes non-binary only) | Only 4 people fit | A daily set of **1**, and **no widening** (a wider age range brings in nobody new, so her range stays 18–30). |
| **Dev** (man 24, likes women aged exactly 24) | Only 2 women are 24 | His range **widens to 22–26**: **You → Notices** shows "We widened your age range to 22–26", and his set is 3. |
| **Sid** (man 22, likes women 21–23) | His range holds the women below | His set (3) **never** contains: **Ananya** (10 perspectives today, soft limit), **Meghna** (reported by 2 people), **Pooja** (on hold), or the inactive women (Esha, Jiya, Mira, Yamini). Ananya and Meghna **can** appear after his set. **Pooja's profile page says "not available".** |
| **Aman** (man 26, likes women 26–27) | He already gave to 7 of the 11 women in his range, earlier days | Fewer than 6 fresh women are left, so **returning profiles mix in**: his set of 2 can be women he gave to before, and their cards show **only the posts he hasn't answered**. |
| **Isha** (woman 21) | Three men (**Arnav, Yash, Vihaan**) share all 5 of her interests | Her non-boost set cards are her interest twins (shared interests weigh 0.45). |
| **Kiran** (man 23) | A weak giver: 12 "vague" marks from 6 people, 3 helpful | **You → Notices** has "Make your perspectives count". His set **never** has brand-new members (Hina, Naina, Urvi, and recent accounts like Meera or Nisha), even though Sid's and Dev's sets do. Other people see him lower in Explore (−0.2). |
| **Raj** (man 24) | A weak giver who got 10+ more low-effort marks after his tip | He is on the **admin list** as "Weak giver" (not hidden). |
| **Pooja** (woman 23) | Reported by 3 different people | **On hold**: hidden from anyone new, on the admin list as "3+ reporters (hidden)". She can still use the app and isn't told. |
| **Rhea** (woman 21) | One serious report (sexual content) | **On hold**, at the **top** of the admin list as "Serious report". |
| **Vikram** (man 25) | 3-day ban with an appeal waiting | Signing in shows only the **ban screen** (reason, end date, "We're looking at it again"). The admin list shows his **appeal**; try "Keep the ban" or "Lift the ban". |
| **Ananya** (woman 22) | Received 10 perspectives today | Out of everyone's daily set today; she can still receive perspectives people choose to give. |
| **Meghna** (woman 22) | Reported by 2 people | Out of everyone's daily set; lower in rankings (−0.2). |

**Other people in the world**
- **Brand-new members** (1–2 days old, get the new-member bonus): Hina 22, Naina 23, Urvi 25, Chirag 20, Pranav 23, Faiz 26.
- **Inactive for 10 days** (never in a daily set, may appear after the set): Esha, Jiya, Mira, Yamini, Chitra, Farhan, Laksh, Varun, Kunal, Parth.
- **Opened the app 5 days ago** (count as active, but lower "recently active" score): a few women aged 20, 24 and 27.
- **Gay men** (audience men only): three of the men, so you can check that audiences work both ways.
- **Perspectives-only women** with every gender in their audience, and **non-binary people** (Ari, Sky, Noor, Rumi).
- About a third of everyone received a perspective in the last 2 days, so **need** varies.

## Things to try beyond signing in
- **Give perspectives** as Tara or Sid until the set is done: the perspectives you received unlock, then 4 to 5 more profiles follow (the last one random).
- **Skip** a card: it is replaced by someone else; skipped people come back after 2 days.
- **Change Neha's or Rohan's audience** under You: today's set rebuilds (nothing given yet), and widening may kick in.
- **Report someone three times** from three accounts, or once for sexual content: they go on hold and appear on the admin list.
- **Mark perspectives "not helpful → sexual"** in someone's Inbox: the giver is put on hold at once.
- **Block and unblock** from a profile's ⋯ menu, then check You → Blocked people.
- **Ban, extend, appeal and restore** with Vikram and the admin page.

Push notifications can't be seen on the web preview; they need a development build on a phone (business logic section 8.3).
