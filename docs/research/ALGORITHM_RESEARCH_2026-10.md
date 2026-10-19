# Matching algorithm research (2026-10-19 to 2026-10-20)

This records what the research session found and why the beta model in `docs/PRODUCT.md`, `docs/BETA_PLAN.md` and ADR-017 to ADR-019 looks the way it does. The decisions themselves live in those files; this file holds the evidence and the reasoning. Sources reviewed: `perspective_report.pdf` (a 25-page landscape study of Tinder, Hinge, Bumble, Coffee Meets Bagel and OkCupid), and the PRAM report ("Perspective Reciprocal Matching Algorithm", 21 pages) with its speed-dating sandbox CSVs. Neither source file is in the repo.

## 1. Verdict
- At 50 to 200 users, **ranking weights barely matter**. Each person can only be shown about 20 to 60 others and will see most of them within a week. What decides the beta is who is in the pool (gender balance, age band), how the daily set spreads attention, and safety.
- Use **rule-based formulas** now. Consider machine learning only after the beta, on our own data, and only if it beats the formula in a shadow test.
- **Biggest risk: a lopsided pool.** Give-to-get conserves perspectives: every perspective given is one received. With 70% men, each woman gets about 5 to 7 perspectives a day and each man about 1.2, whatever the algorithm. Fix it by recruiting (60:40 invite waves), not by formulas.

## 2. The landscape report (`perspective_report.pdf`)
It looks machine-generated. Leftover citation tokens remain, and its numbers contradict each other: three different mandatory-count formulas, two weight sets, and "ceil(100/100) = 2 boosts".

**Useful and well sourced:**
- Tinder retired its Elo desirability score and favors users who are active, and active at the same time (official Tinder blog).
- Biega et al. 2018 (SIGIR), "amortized fairness": spread attention over time. This is the theory behind the boost slot and exposure caps.
- Attention on dating apps is very unequal (Rudder / OkCupid data).
- Hinge's mutual dealbreakers shrink the pool.
- Wilson or Bayesian shrinkage for ratings with few votes.

**Wrong, outdated or unverified:**
- Gale–Shapley is graded "A" in the summary but "C" in its own source list. It is irrelevant anyway: one-to-one stable matching does not fit a many-to-many daily set.
- "Hinge has unlimited likes" is likely wrong; the free tier has a small daily like limit.
- "Tinder matches expire in 14 to 72 hours": not true of Tinder (that is Bumble's 24-hour rule).
- The Coffee Meets Bagel model described is the 2015 to 2017 version.
- "Bumble is about 2:1 women" is unverified.
- "DPDP requires a right to explanation": not in the Act as we understand it; check with counsel.

**Rejected suggestions:**
- Dropping all filters for narrow audiences (breaks the "never outside your own filters" rule).
- Fake dummy profiles or seeded perspectives (deceptive).
- A mandatory count that grows with pool size (pool size doesn't change how many perspectives each person receives).
- Boost slots tied to pool size.

**What it missed:** supply and demand between the two sides; running out of fresh people in a tiny pool; dormant profiles soaking up perspectives; India-specific safety (public orientation can out someone, women flooded with advances); perspectives used as pickup lines; "helpful" marks turning into a hidden attractiveness score.

## 3. The PRAM report and sandbox
**Proposal:**
1. Hard filters.
2. Candidates gathered from several sources.
3. Separate predicted outcomes: give, helpful, request, return, reply, harm.
4. Calibration.
5. Product and harmonic fusion of both directions.
6. Exposure and perspective-debt ledgers with capacity limits.
7. A three-card slate: reciprocal, opportunity, discovery.
8. Event logging with selection probabilities.

Logistic regression is the first ML model; it also proposes voice transcription (Whisper, openSMILE) and a Python ML pipeline. Its launch stage, "PRAM v0", is a rule-based formula, the same kind as ours.

**What the sandbox actually shows** (Columbia speed-dating data, 2002 to 2004, US students, four-minute in-person dates):
- **No model really beats guessing the average.**
  - Directional test: predicting the base rate gives a log loss of 0.674; logistic regression gets 0.665 (about 1% better), and its accuracy is 60.9% against 59.8% for always saying "no".
  - Pair (mutual match) test: the constant prediction gives 0.420; the best model gets 0.4204. Every pair model has F1 = 0.
- **"Logistic regression wins" is within noise.** The test-set margin of error on ROC-AUC is about ±0.015, so logistic (0.611), RBF SVM (0.608), Naive Bayes (0.600) and Random Forest (0.587) are effectively tied.
- **Calibration flipped the fusion results; the report does not mention it.** Every calibrated fusion ROC-AUC equals exactly 1 minus its raw value (product 0.5854 / 0.4146, harmonic 0.5849 / 0.4151, arithmetic 0.5848 / 0.4152, minimum 0.5755 / 0.4245). Either there is a sign bug, or the pair signal reversed between the validation and test waves (not stable).
- **On the top-3 ranking task, one-sided ranking beat every reciprocal fusion:** NDCG@3 0.333 vs 0.287, hit rate 44/99 vs 38/99. The sample is small, but it contradicts the report's headline.
- **The fusion chart shipped with the sandbox does not match its CSVs** (about 0.62 and 0.25 in the chart vs 0.585 and 0.214 raw).
- **The sandbox features include self-ratings** (for example self-rated attractiveness): a desirability proxy that PRAM's own never-use list forbids.
- Allocation test: Gale–Shapley 14.3%, random 13.9%, max-weight 12.2%, on only 49 assignments. Not decision-grade, as the report says.

**Adopted from PRAM:**
- Its staged structure as the long-term target.
- The quality score's influence stays capped (writing fluency must not stand in for class or education).
- Rater reliability.
- Promotion gates before any model goes live.

**Recommended, not yet decided:**
- An event contract: log rendered vs assigned, selection probability, reason codes, policy version.
- A useful-perspective debt (counting helpful perspectives once marks exist).
- Routing posts by the categories where a giver's perspectives tend to be marked helpful.

**Not adopted:**
- The discovery slot in the mandatory set (it makes the set feel random; random picks go in bonus profiles only).
- Intent modes as labels.
- New lifestyle fields.
- Orientation as a hard filter.
- Voice features.
- Starting with ML.

## 4. Our simulation (indicative)
`sim_prototype.py` in this folder is a throwaway Python model. Setup: 14 days, 3 mandatory plus 0 to 4 bonus gives per day, 25% of bonus profiles skipped, varied activity, 90% straight, and everyone builds their set before anyone gives (the worst case for pile-on). "Proposed" = counting today's sets, a capped random boost among the least-served, the activity filter and the new weights.

| Users | Share men | Variant | Gini | Men / day | Women / day | Sets not fillable | Max sets for one profile in a day | Fit |
|---|---|---|---|---|---|---|---|---|
| 50 | 50% | current | 0.33 | 1.6 | 2.1 | 32% | 13 | 0.11 |
| 50 | 50% | proposed | 0.34 | 1.6 | 2.2 | 41% | 8 | 0.09 |
| 200 | 50% | current | 0.24 | 2.8 | 2.8 | 5% | 44 | 0.14 |
| 200 | 50% | proposed | 0.14 | 2.6 | 2.6 | 6% | 7 | 0.11 |
| 200 | 70% | current | 0.51 | 1.2 | 6.4 | 6% | 64 | 0.13 |
| 200 | 70% | proposed | 0.46 | 1.2 | 5.3 | 10% | 9 | 0.10 |
| 1,000 | 50% | current | 0.43 | 3.2 | 3.0 | 0.2% | 254 | 0.16 |
| 1,000 | 50% | proposed | 0.09 | 2.7 | 2.6 | 0.3% | 6 | 0.18 |

What it shows:
- The pile-on is real and the fix works (ADR-017, built).
- Zero-perspective profiles were rare under both variants; the problem was concentration, not zero.
- Fairness costs about 20% fit at 200 users and gains fit at 1,000.
- Gender skew dominates everything.
- At 50 users, sets often cannot be filled, whatever the algorithm.
- Equal spreading sends about 10% of perspectives to people who don't return within a week, which is why the promise covers recently active people.

**A proper simulator** (not built) should be TypeScript, import the real domain functions, and compare:
- current vs proposed
- all-boost vs no-boost
- dynamic count, intent dealbreaker on or off, split audience

across 50, 200, 1,000 and 10,000 users and 50 to 80% men, measuring:
- zero perspectives at 24 hours and 7 days, time to first perspective
- Gini, maximum sets per profile per day
- fit, helpful rate, unfillable sets
- perspectives sent to dormant owners
- connect ask and accept rates, retention
- a collusion ring's quality advantage

## 5. Path to machine learning (after the beta)
1. Log the events from section 3.
2. Once there are about 1,000 or more positive examples, train logistic regression for "gives rather than skips" and "marked helpful". Split by time, calibrate on later data, and run in shadow mode.
3. Use it as one input to the formula, never as a replacement, and only if it beats the formula.
4. Later, in order: request and return models, pair fusion, collaborative features, a city-level allocator.
5. Harm stays rules plus human review.

## 6. Open research items
- The run behind the PRAM fusion chart, and a check of the sandbox calibration step (the suspected sign bug).
- The second PRAM report ("Perspective-Reciprocal-Matching-System-Research-Model-Design-and-Low-Cost-MLOps-Plan.pdf"), not yet reviewed.
- Decide whether to adopt the event contract, useful-perspective debt and helpfulness-by-category routing (section 3).
- Measure the beta questions in `BETA_PLAN.md` (dating vs social).
