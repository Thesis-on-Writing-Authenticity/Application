import csv
import os
import re
import statistics as st
import sys
from collections import defaultdict
from datetime import datetime

RHYTHM_MAX_GAP_MS = 10_000


def scenario_from_title(title):
    name = (title or "unknown").strip()
    name = re.sub(r"^\d+[-_ ]*", "", name)
    name = re.sub(r"[-_ ]*\d+$", "", name)
    return name.lower() or "unknown"


def load_sessions(path):
    sessions = defaultdict(lambda: {"scenario": "unknown", "events": []})
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            sid = row["sessionId"]
            sessions[sid]["scenario"] = scenario_from_title(row.get("documentTitle"))
            sessions[sid]["events"].append(row)
    return sessions


def as_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def parse_ms(iso):
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000
    except ValueError:
        return None


def features(events):
    inserts = [e for e in events if e["type"] == "INSERT"]
    pastes = [e for e in events if e["type"] == "PASTE"]
    deletes = [e for e in events if e["type"] == "DELETE"]
    pauses = [e for e in events if e["type"] == "PAUSE"]

    typed = sum(as_int(e["length"]) for e in inserts)
    pasted = sum(as_int(e["length"]) for e in pastes)
    sizes = [as_int(e["length"]) for e in inserts]

    times = sorted(t for t in (parse_ms(e["at"]) for e in inserts) if t is not None)
    gaps = [b - a for a, b in zip(times, times[1:]) if 0 < b - a < RHYTHM_MAX_GAP_MS]
    rhythm_cv = st.pstdev(gaps) / st.mean(gaps) if len(gaps) > 1 and st.mean(gaps) else 0.0

    return {
        "inserts": len(inserts),
        "deletes": len(deletes),
        "pastes": len(pastes),
        "typed_chars": typed,
        "pasted_chars": pasted,
        "deleted_chars": sum(as_int(e["length"]) for e in deletes),
        "mean_insert": round(sum(sizes) / len(sizes), 2) if sizes else 0,
        "max_insert": max(sizes, default=0),
        "paste_ratio": round(pasted / typed, 2) if typed else (float("inf") if pasted else 0),
        "long_pauses": len(pauses),
        "rhythm_cv": round(rhythm_cv, 2),
    }


def mean_or_value(values):
    numbers = [v for v in values if v != float("inf")]
    if not numbers:
        return float("inf")
    return round(st.mean(numbers), 2)


def write_plots(by_scenario, keys, outdir="analysis/figures"):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("\nPlots skipped: matplotlib not installed (pip install matplotlib)")
        return

    os.makedirs(outdir, exist_ok=True)
    scenarios = sorted(by_scenario)
    smallest = min(len(v) for v in by_scenario.values())
    if smallest < 3:
        print(f"\nNote: only {smallest} session(s) in the smallest scenario — "
              "box plots need several samples per scenario to be meaningful.")

    written = 0
    for key in keys:
        data = [[f[key] for f in by_scenario[s] if f[key] != float("inf")]
                for s in scenarios]
        if not any(data):
            continue
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.boxplot(data, labels=scenarios)
        ax.set_title(key.replace("_", " "))
        ax.set_ylabel(key)
        ax.grid(axis="y", alpha=0.3)
        fig.tight_layout()
        fig.savefig(f"{outdir}/{key}.png", dpi=150)
        plt.close(fig)
        written += 1

    print(f"\nWrote {written} plot(s) to {outdir}/")


def main(path, plots=False):
    sessions = load_sessions(path)
    if not sessions:
        print(f"No sessions found in {path}")
        return

    by_scenario = defaultdict(list)
    for data in sessions.values():
        by_scenario[data["scenario"]].append(features(data["events"]))

    scenarios = sorted(by_scenario)
    keys = list(next(iter(by_scenario.values()))[0].keys())

    print(f"\nSessions: {len(sessions)}   " +
          "   ".join(f"{s}: {len(by_scenario[s])}" for s in scenarios) + "\n")

    width = max(len(k) for k in keys) + 2
    print("feature".ljust(width) + "".join(s.rjust(14) for s in scenarios))
    print("-" * (width + 14 * len(scenarios)))
    for key in keys:
        line = key.ljust(width)
        for scenario in scenarios:
            line += str(mean_or_value([f[key] for f in by_scenario[scenario]])).rjust(14)
        print(line)
    print("\n(values are averaged across the sessions of each scenario)")

    if plots:
        write_plots(by_scenario, keys)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    main(args[0] if args else "evaluation-sessions.csv", plots="--plots" in sys.argv)
