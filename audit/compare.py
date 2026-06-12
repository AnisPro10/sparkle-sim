# -*- coding: utf-8 -*-
"""Comparateur adversarial : Python (formules Excel) vs moteur TS vs valeurs certifiees."""
import json, math, subprocess, sys
from engine import OFFICIAL, compute, legal, xround

REALISTE_PATCH = dict(productsRate=0.055, travelRate=0.065, unpaidRate=0.015,
                      fixedMonthly=95, renewalMonthly=30)

SETS = {
    "official": {},
    "acre_on": {"acre": True},
    "vfl_off": {"vfl": False},
    "unpaid_15": {"unpaidRate": 0.015},
    "delayed_half": {"delayedShare": 0.5},
    "growth_mod": {"growth": [0.5, 0.3, 0.2, 0.0]},
    "combo": {"acre": True, "vfl": False, "unpaidRate": 0.015, "delayedShare": 0.5,
              "growth": [0.45, 0.25, 0.15, 0.05]},
    "realiste": {},
    "sites_nonmono": {"sites": [3, 5, 8, 12, 12, 11, 10, 9, 8, 7, 6, 5]},
    "airbnb_zero": {"airbnb": [0] * 12},
    "big_contrib": {"contribution": 30000},
}

with open("sets.json", "w", encoding="utf-8") as f:
    json.dump(SETS, f)

ts = json.loads(subprocess.run(["bun", "run", "run_ts.ts", "sets.json"],
                               capture_output=True, text=True, check=True).stdout)

def close(a, b, tol=1e-9):
    if a is None or b is None:
        return a == b
    if isinstance(a, float) and math.isnan(a):
        return False  # NaN = #DIV/0! Excel -> jamais "egal"
    return abs(a - b) <= tol * max(1, abs(a), abs(b))

fails = []
def check(setname, label, py, tsv, tol=1e-9):
    if not close(py, tsv, tol):
        fails.append((setname, label, py, tsv))

for name, patch in SETS.items():
    h = dict(OFFICIAL)
    if name.startswith("realiste"):
        h.update(REALISTE_PATCH)
    h.update(patch)
    py = compute(h)
    pyl = legal(h, py["revenue"])
    t = ts[name]

    for i in range(12):
        m = t["months"][i]
        check(name, f"b2b[{i}]", py["b2b"][i], m["b2b"])
        check(name, f"ca[{i}]", py["ca"][i], m["ca"])
        check(name, f"hours[{i}]", py["hours"][i], m["hours"])
        check(name, f"netg[{i}]", py["netg"][i], m["netGestion"])
        check(name, f"receipts[{i}]", py["receipts"][i], m["receipts"])
        check(name, f"cash[{i}]", py["cash"][i], m["cash"])
    check(name, "revenue", py["revenue"], t["revenue"])
    check(name, "globalRate", py["rate"], t["globalRate"])
    for k, a in enumerate(py["by_act"]):
        ta = t["byActivity"][k]
        for fld, tsfld in [("ca", "ca"), ("cot", "cotisations"), ("imp", "impot"),
                           ("cfp", "cfp"), ("prod", "produits"), ("depl", "deplacements"),
                           ("contrib", "contribution")]:
            check(name, f"act[{k}].{fld}", a[fld], ta[tsfld])
    check(name, "realNet", py["real_net"], t["realNet"])
    check(name, "cruiseNet", py["cruise"], t["cruiseNet"])
    check(name, "lowCash", py["low"], t["lowCash"])
    check(name, "minApport", py["min_apport"], t["minimumContribution"])
    check(name, "recApport", py["rec_apport"], t["recommendedContribution"])
    check(name, "receivables", py["receivables"], t["endReceivables"])
    check(name, "peakHours", py["peak"], t["peakHours"])
    sc = {s["name"]: s for s in t["scenarios"]}
    check(name, "pess.ca", py["scenarios"]["pess"][0], sc["Pessimiste"]["ca"])
    check(name, "pess.net", py["scenarios"]["pess"][1], sc["Pessimiste"]["net"])
    check(name, "opt.ca", py["scenarios"]["opt"][0], sc["Optimiste"]["ca"])
    check(name, "opt.net", py["scenarios"]["opt"][1], sc["Optimiste"]["net"])
    check(name, "real.ca", py["scenarios"]["real"][0], sc["Réaliste"]["ca"])
    # double verif : net Realiste TS vs formule Excel Scenarios!C19
    check(name, "real.net(TS realNet)", py["scenarios"]["real"][1], sc["Réaliste"]["net"])
    check(name, "real.net(Excel C19)", py["real_scenario_net_excel"], sc["Réaliste"]["net"])
    for y in range(5):
        check(name, f"proj.ca[{y}]", py["projection"][y][0], t["projection"][y]["revenue"])
        check(name, f"proj.net[{y}]", py["projection"][y][1], t["projection"][y]["net"])
    tl = {s["id"]: s["value"] for s in t["legal"]}
    check(name, "legal.micro_vfl", pyl["micro_vfl"], tl["micro-vfl"])
    check(name, "legal.micro_acre", pyl["micro_acre"], tl["micro-acre"])
    check(name, "legal.micro_bar", pyl["micro_bar"], tl["micro-bareme"])
    check(name, "legal.ei", pyl["ei"], tl["ei"])
    check(name, "legal.eurl", pyl["eurl18000"], tl["eurl"])
    check(name, "legal.sasu", pyl["sasu0"], tl["sasu"])

print("ROUND CHECKS TS:", ts["__round_checks"])
print(f"\n{len(fails)} ECARTS Python(Excel) vs TS :")
for s, l, p, t in fails:
    print(f"  [{s}] {l}: py={p}  ts={t}")
