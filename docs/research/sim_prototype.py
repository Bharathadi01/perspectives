"""Throwaway agent-based sanity check of Perspective daily-set variants. Not product code."""
import math, random, sys
from collections import defaultdict

DAYS = 14
M = 3          # mandatory count
BATCH = 10     # daily batch incl. mandatory

def gini(xs):
    xs = sorted(xs); n = len(xs); s = sum(xs)
    if n == 0 or s == 0: return 0.0
    cum = sum((i + 1) * x for i, x in enumerate(xs))
    return (2 * cum) / (n * s) - (n + 1) / n

def make_users(n, male_share, rng):
    users = []
    for i in range(n):
        g = 'M' if rng.random() < male_share else 'W'
        age = rng.randint(21, 35)
        straight = rng.random() < 0.9
        if straight: aud_g = {'W'} if g == 'M' else {'M'}
        else: aud_g = {g} if rng.random() < 0.6 else {'M', 'W'}
        lo, hi = max(18, age - 5), age + 5
        join = 0 if rng.random() < 0.7 else rng.randint(1, DAYS - 4)
        users.append(dict(id=i, g=g, age=age, aud_g=aud_g, lo=lo, hi=hi,
                          interests=set(rng.sample(range(45), rng.randint(3, 10))),
                          posts=rng.randint(1, 4), act=rng.betavariate(2, 2), join=join,
                          created=join + rng.random()))
    return users

def inside(a, b):  # b inside a's audience
    return b['g'] in a['aud_g'] and a['lo'] <= b['age'] <= a['hi']

def compat(a, b):
    u = len(a['interests'] | b['interests'])
    return len(a['interests'] & b['interests']) / u if u else 0.5

def run(n, male_share, variant, seed):
    rng = random.Random(seed)
    U = make_users(n, male_share, rng)
    mutual = [[j for j in range(n) if j != i and inside(U[i], U[j]) and inside(U[j], U[i])] for i in range(n)]
    answered = defaultdict(int)          # (giver, owner) -> posts answered
    received_log = defaultdict(list)     # owner -> days received
    active_days = defaultdict(list)
    skipped_until = {}
    given_by = defaultdict(set)          # owner -> givers
    short_sets = 0; user_days = 0; max_assign = 0; compat_sum = 0; compat_n = 0
    wasted = 0; total_given = 0
    for day in range(DAYS):
        live = [u for u in U if u['join'] <= day]
        act = [u for u in live if rng.random() < u['act'] or u['join'] == day]
        for u in act: active_days[u['id']].append(day)
        def recent(o): return sum(1 for d in received_log[o] if d > day - 7)
        def last_active(o):
            ds = active_days[o]; return ds[-1] if ds else -99
        inflight = defaultdict(int)
        sets = {}
        rng.shuffle(act)
        # phase 1: everyone builds their set at first open (need counters don't move yet)
        for u in act:
            i = u['id']
            elig = [j for j in mutual[i] if U[j]['join'] <= day and answered[(i, j)] < U[j]['posts']
                    and skipped_until.get((i, j), -1) < day]
            if variant == 'proposed':
                elig = [j for j in elig if day - last_active(j) <= 7 or day - U[j]['join'] <= 2]
            if not elig:
                sets[i] = []; continue
            def score(j, w_comp, w_need, w_fresh, w_q):
                need = 1 / (1 + recent(j) + (inflight[j] if variant == 'proposed' else 0))
                fresh = math.exp(-(day - U[j]['created']) / 30) if variant == 'current' else (1.0 if day - U[j]['join'] <= 3 else 0.0)
                act_recent = 1.0 if day - last_active(j) <= 2 else 0.3
                base = w_comp * compat(U[i], U[j]) + w_need * need + w_fresh * fresh + w_q * 0.5
                return base + (0.15 * act_recent if variant == 'proposed' else 0)
            if variant == 'current':
                boost = min(elig, key=lambda j: (recent(j), U[j]['created'], j))
                rest = sorted([j for j in elig if j != boost], key=lambda j: -score(j, .45, .25, .15, .15))[:M - 1]
                picks = [boost] + rest
            else:
                cap = 6
                pool = [j for j in elig if inflight[j] < cap]
                if not pool: pool = elig
                served = lambda j: recent(j) + inflight[j]
                srt = sorted(pool, key=lambda j: (served(j), U[j]['created']))
                low = served(srt[0])
                K = [j for j in srt if served(j) <= low + 1][:5] or srt[:5]
                wts = [0.5 + compat(U[i], U[j]) for j in K]
                boost = rng.choices(K, weights=wts)[0]
                fresh_pool = [j for j in pool if j != boost and answered[(i, j)] == 0] or [j for j in pool if j != boost]
                rest = sorted(fresh_pool, key=lambda j: -(score(j, .45, .20, .10, .10) + rng.random() * 0.05))[:M - 1]
                picks = [boost] + rest
            for j in picks: inflight[j] += 1
            sets[i] = picks
        if inflight: max_assign = max(max_assign, max(inflight.values()))
        # phase 2: give (mandatory always given; bonus 0-4)
        for u in act:
            i = u['id']; picks = sets[i]
            user_days += 1
            if len(picks) < M: short_sets += 1
            for j in picks:
                answered[(i, j)] += 1; received_log[j].append(day); given_by[j].add(i)
                compat_sum += compat(U[i], U[j]); compat_n += 1; total_given += 1
                if not [d for d in active_days[j] if day <= d <= day + 7] and day + 7 < DAYS: wasted += 1
            bonus = rng.randint(0, 4)
            done = set(picks)
            for _ in range(min(bonus, BATCH - len(picks))):
                cand = [j for j in mutual[i] if U[j]['join'] <= day and j not in done and answered[(i, j)] < U[j]['posts']
                        and skipped_until.get((i, j), -1) < day]
                if not cand: break
                if variant == 'current':
                    j = max(cand, key=lambda j: .45 * compat(U[i], U[j]) + .25 / (1 + recent(j)) + .15 * math.exp(-(day - U[j]['created']) / 30))
                else:
                    top = sorted(cand, key=lambda j: -(.45 * compat(U[i], U[j]) + .2 / (1 + recent(j))))[:8]
                    j = rng.choice(top)
                if rng.random() < 0.25:
                    skipped_until[(i, j)] = day + 7; done.add(j); continue
                answered[(i, j)] += 1; received_log[j].append(day); given_by[j].add(i); done.add(j); total_given += 1
    # metrics on users who joined by day DAYS-7 (full 7-day window)
    cohort = [u for u in U if u['join'] <= DAYS - 8]
    z24 = sum(1 for u in cohort if not [d for d in received_log[u['id']] if d <= u['join'] + 1]) / max(1, len(cohort))
    z7 = sum(1 for u in cohort if not [d for d in received_log[u['id']] if d <= u['join'] + 7]) / max(1, len(cohort))
    rec = [len(received_log[u['id']]) for u in U]
    def per_day(g):
        us = [u for u in U if u['g'] == g]
        return sum(len(received_log[u['id']]) / (DAYS - u['join']) for u in us) / max(1, len(us))
    return dict(z24=z24, z7=z7, gini=gini(rec), M_rpd=per_day('M'), W_rpd=per_day('W'),
                short=short_sets / max(1, user_days), maxA=max_assign, fit=compat_sum / max(1, compat_n),
                wasted=wasted / max(1, total_given))

if __name__ == '__main__':
    print(f"{'N':>5} {'male':>5} {'variant':>9} | {'zero24h':>7} {'zero7d':>6} {'gini':>5} {'M/day':>6} {'W/day':>6} {'short':>6} {'maxAssign':>9} {'fit':>5} {'toDormant':>9}")
    for n in [50, 200, 1000]:
        for ms in [0.5, 0.7]:
            for v in ['current', 'proposed']:
                runs = [run(n, ms, v, s) for s in range(3 if n < 1000 else 1)]
                avg = {k: sum(r[k] for r in runs) / len(runs) for k in runs[0]}
                print(f"{n:>5} {ms:>5} {v:>9} | {avg['z24']:>7.1%} {avg['z7']:>6.1%} {avg['gini']:>5.2f} {avg['M_rpd']:>6.2f} {avg['W_rpd']:>6.2f} {avg['short']:>6.1%} {avg['maxA']:>9.0f} {avg['fit']:>5.2f} {avg['wasted']:>9.1%}")
        sys.stdout.flush()
