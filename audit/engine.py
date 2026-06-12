# -*- coding: utf-8 -*-
"""
Implementation Python INDEPENDANTE, traduite des formules Excel dumpees dans
verite_previsionnel.json / verite_juridique.json (PAS du TypeScript).
Semantique Excel : ROUND = half away from zero, ROUNDUP(-2) = centaine away from zero.
"""
import math
from decimal import Decimal, ROUND_HALF_UP

WEEKS = 4.33
GLASS_H = 2
AIRBNB_H = 2.5
CFE2 = 300


def xround(x, n=0):
    """ROUND Excel : half away from zero, via Decimal(repr) pour coller au decimal."""
    if x == 0:
        return 0.0
    q = Decimal(1).scaleb(-n)
    d = Decimal(repr(abs(x))).quantize(q, rounding=ROUND_HALF_UP)
    return float(math.copysign(float(d), x))


def xroundup100(x):
    """ROUNDUP(x,-2) Excel : away from zero a la centaine."""
    if x == 0:
        return 0.0
    return math.copysign(math.ceil(abs(x) / 100 - 1e-12) * 100, x)


OFFICIAL = dict(
    hourlyB2B=30, annualShare=0.5, annualDiscount=0.067, visitsPerWeek=2,
    hoursPerVisit=1.2, glassRate=32, airbnbPrice=75, privateRate=30,
    privateHours=3, socialRate=0.212, acreRate=0.159, taxRate=0.017,
    cfpRate=0.003, acre=False, vfl=True, tmi=0.11, productsRate=0.04,
    travelRate=0.05, unpaidRate=0.0, fixedMonthly=75, renewalMonthly=0,
    contribution=2000, capex=1200, delayedShare=1.0, target=1500,
    capacity=165, microCeiling=83600, vatCeiling=37500,
    sites=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonality=[1, 1, 1, 0.9, 1, 1, 1, 1, 1, 1, 0.9, 0.65],
    glassJobs=[0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
    airbnb=[2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 12, 12],
    privateJobs=[2, 4, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    growth=[0.3, 0.2, 0.1, 0.1],
)


def global_rate(h):
    # Hypotheses!B27 = IF(ACRE,B22,B20) + IF(VFL,B24,0) + B25
    return (h["acreRate"] if h["acre"] else h["socialRate"]) + (h["taxRate"] if h["vfl"] else 0) + h["cfpRate"]


def full_rate(h):
    # Hypotheses!B28 = B20 + IF(VFL,B24,0) + B25  (jamais d'ACRE)
    return h["socialRate"] + (h["taxRate"] if h["vfl"] else 0) + h["cfpRate"]


def compute(h):
    eff = h["hourlyB2B"] * (1 - h["annualShare"] * h["annualDiscount"])      # B15
    site_monthly = h["visitsPerWeek"] * WEEKS * h["hoursPerVisit"] * eff      # B16
    rate = global_rate(h)
    var = h["productsRate"] + h["travelRate"]

    # ---- Plan_Activite (onglet ABSENT du dump : logique presumee = TS, validee
    #      indirectement par les valeurs certifiees) ----
    b2b, glass, airbnb, priv, ca, hours, netg = [], [], [], [], [], [], []
    for i in range(12):
        b = xround(h["sites"][i] * site_monthly * h["seasonality"][i] * (1 - h["unpaidRate"]))
        g = h["glassJobs"][i] * h["glassRate"] * GLASS_H
        a = h["airbnb"][i] * h["airbnbPrice"]
        p = h["privateJobs"][i] * h["privateRate"] * h["privateHours"]
        c = b + g + a + p
        hrs = xround(h["sites"][i] * h["visitsPerWeek"] * WEEKS * h["hoursPerVisit"] * h["seasonality"][i]
                     + h["glassJobs"][i] * GLASS_H + h["airbnb"][i] * AIRBNB_H
                     + h["privateJobs"][i] * h["privateHours"])
        n = xround(c * (1 - rate - var) - h["fixedMonthly"] - h["renewalMonthly"])
        b2b.append(b); glass.append(g); airbnb.append(a); priv.append(p)
        ca.append(c); hours.append(hrs); netg.append(n)

    revenue = sum(ca)

    # ---- Resultat (par activite, chaque poste ROUND sur le total annuel) ----
    by_act = []
    for tot in (sum(b2b), sum(glass), sum(airbnb), sum(priv)):
        cot = xround(tot * (h["acreRate"] if h["acre"] else h["socialRate"]))
        imp = xround(tot * (h["taxRate"] if h["vfl"] else (1 - 0.5) * h["tmi"]))   # B29 = 0.5
        cfp = xround(tot * h["cfpRate"])
        prod = xround(tot * h["productsRate"])
        depl = xround(tot * h["travelRate"])
        by_act.append(dict(ca=tot, cot=cot, imp=imp, cfp=cfp, prod=prod, depl=depl,
                           contrib=tot - cot - imp - cfp - prod - depl))
    total_contrib = sum(a["contrib"] for a in by_act)
    fixed_year = (h["fixedMonthly"] + h["renewalMonthly"]) * 12               # B46 (+renew hors dump)
    real_net = total_contrib - fixed_year - h["capex"]                        # F18 (CFE an1 = 0)
    cruise = xround(sum(netg[9:]) / 3)                                        # F20

    # ---- Tresorerie ----
    cash_rows, receipts_rows = [], []
    cash = h["contribution"]
    for i in range(12):
        d30 = xround((b2b[i] + glass[i]) * (1 - h["delayedShare"])
                     + ((b2b[i - 1] + glass[i - 1]) * h["delayedShare"] if i > 0 else 0))
        imm = airbnb[i] + priv[i]
        enc = d30 + imm
        out = xround(enc * rate) + xround(ca[i] * var) + h["fixedMonthly"] + h["renewalMonthly"] \
            + (h["capex"] if i == 0 else 0)
        cash = cash + enc - out
        receipts_rows.append(enc)
        cash_rows.append(cash)
    low = min(cash_rows)
    min_apport = xroundup100(h["contribution"] - low)        # B17 — Excel NE clampe PAS a 0
    rec_apport = xroundup100(min_apport * 1.3)               # B18
    receivables = xround((b2b[11] + glass[11]) * h["delayedShare"])           # B19

    # ---- Scenarios (formules exactes ; ATTENTION : Excel B5/C5/D5 lisent Plan!M6
    #      = sites du DERNIER mois, pas le max) ----
    season_avg = sum(h["seasonality"]) / 12                                   # N7 = AVERAGE
    sites_end = h["sites"][11]                                                # Plan!M6
    plat_air = max(h["airbnb"])
    plat_priv = max(h["privateJobs"])
    glass_year = sum(h["glassJobs"])
    air_year = sum(h["airbnb"]) * h["airbnbPrice"]
    priv_year = sum(h["privateJobs"]) * h["privateRate"] * h["privateHours"]
    fixed_capex = fixed_year + h["capex"]

    def variant(fS, fR, fA, fP, fV):
        S = xround(sites_end * fS)
        R = xround(site_monthly * fR)
        A = xround(plat_air * fA)
        P = xround(plat_priv * fP)
        V = xround(glass_year * fV)
        ca_bv = xround((h["sites"][0] + S) / 2 * 12 * R * season_avg) + xround(V * h["glassRate"] * GLASS_H)
        ca_air = xround(air_year * A / plat_air) if plat_air else float("nan")   # Excel #DIV/0!
        ca_pr = xround(priv_year * P / plat_priv) if plat_priv else float("nan")
        tot = ca_bv + ca_air + ca_pr
        net = tot - xround(tot * rate) - xround(tot * var) - fixed_capex
        return tot, net

    pess = variant(0.65, 0.95, 0.6, 0.6, 0.6)
    opt = variant(1.35, 1.05, 1.25, 1.25, 1.4)
    # Scenarios!C19 (colonne Realiste) : net recalcule sur le TOTAL, un seul ROUND par ligne
    real_scenario_net_excel = revenue - xround(revenue * rate) - xround(revenue * var) - fixed_capex

    # ---- Projection 5 ans ----
    proj = [(revenue, revenue - xround(revenue * rate) - xround(revenue * var) - fixed_year - 0)]
    fr = full_rate(h)
    prev = revenue
    for g in h["growth"]:
        c = xround(prev * (1 + g))
        proj.append((c, c - xround(c * fr) - xround(c * var) - fixed_year - CFE2))
        prev = c

    return dict(
        b2b=b2b, glass=glass, airbnb=airbnb, priv=priv, ca=ca, hours=hours, netg=netg,
        revenue=revenue, rate=rate, by_act=by_act, total_contrib=total_contrib,
        real_net=real_net, cruise=cruise, cash=cash_rows, receipts=receipts_rows,
        low=low, min_apport=min_apport, rec_apport=rec_apport, receivables=receivables,
        peak=max(hours), scenarios=dict(pess=pess, real=(revenue, real_net), opt=opt),
        real_scenario_net_excel=real_scenario_net_excel, projection=proj,
    )


# ---- Classeur juridique (formules des onglets Micro / EI_reel / EURL / SASU) ----
def legal(h, revenue):
    var = h["productsRate"] + h["travelRate"]
    fixed_year = (h["fixedMonthly"] + h["renewalMonthly"]) * 12
    charges_micro = revenue * var + fixed_year                  # Micro!B9 (pas de CFE)

    def micro(cotis, impot):
        return revenue - revenue * cotis - revenue * h["cfpRate"] - impot - charges_micro

    micro_vfl = micro(h["socialRate"], revenue * h["taxRate"])
    micro_acre = micro(h["acreRate"], revenue * h["taxRate"])
    micro_bar = micro(h["socialRate"], revenue * (1 - 0.5) * h["tmi"])   # B14 = 0.5

    benefice = revenue * (1 - var) - fixed_year - CFE2          # EI/EURL/SASU deduisent CFE
    tns = max(benefice * 0.32, 1300)
    ei = benefice - tns - max(benefice - tns, 0) * h["tmi"]

    def impot_soc(b):
        return 0.15 * min(b, 42500) + 0.25 * max(b - 42500, 0)

    def eurl(remu):
        base = max(benefice - remu * 1.45 - (1300 if remu == 0 else 0), 0)
        dist = base - impot_soc(base)
        seuil = 0.1 * 1000
        div = min(dist, seuil) * (1 - 0.314) + max(dist - seuil, 0) * (1 - 0.45 - 0.128)
        return remu + div

    def sasu(remu):
        base = max(benefice - remu * 1.8, 0)
        dist = base - impot_soc(base)
        return remu + max(dist, 0) * (1 - 0.314)

    return dict(micro_vfl=micro_vfl, micro_acre=micro_acre, micro_bar=micro_bar,
                ei=ei, eurl18000=eurl(18000), sasu0=sasu(0))
