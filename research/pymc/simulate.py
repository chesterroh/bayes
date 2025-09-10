import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def simulate(n_hypotheses: int, n_time: int, n_features: int, seed: int = 42):
    rng = np.random.default_rng(seed)
    beta = rng.normal(0.0, 0.8, size=n_features)
    alpha_global = rng.normal(0.0, 1.0)
    alpha_h = rng.normal(0.0, 0.8, size=n_hypotheses)
    sigma_rw = 0.2
    eps = rng.normal(0.0, sigma_rw, size=n_time)
    gamma = np.cumsum(eps)

    rows = []
    for h in range(n_hypotheses):
        for t in range(n_time):
            x = rng.normal(0.0, 1.0, size=n_features)
            eta = alpha_global + alpha_h[h] + gamma[t] + float(x @ beta)
            p = 1.0 / (1.0 + np.exp(-eta))
            y = rng.binomial(1, p)
            row = {
                "hypothesis_id": f"H{h:03d}",
                "time_index": t,
                "outcome": y,
            }
            for j in range(n_features):
                row[f"feat_{j+1}"] = x[j]
            rows.append(row)

    df = pd.DataFrame(rows)
    return df


def main():
    parser = argparse.ArgumentParser(description="Simulate toy dataset for PyMC model")
    parser.add_argument("--out", required=True, help="Output CSV path")
    parser.add_argument("--n-hypotheses", type=int, default=20)
    parser.add_argument("--n-time", type=int, default=40)
    parser.add_argument("--features", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = simulate(args.n_hypotheses, args.n_time, args.features, args.seed)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} rows to {args.out}")


if __name__ == "__main__":
    main()

