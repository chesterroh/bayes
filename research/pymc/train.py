import argparse
import json
from pathlib import Path

import arviz as az
import numpy as np
import pandas as pd
import pymc as pm

from bkms_pymc.io_utils import (
    Encodings,
    apply_standardization,
    load_observations,
    prepare_encodings,
    standardize_features,
)
from bkms_pymc.model import build_model


def main():
    parser = argparse.ArgumentParser(description="Train PyMC dynamic belief model")
    parser.add_argument("--data", required=True, help="Path to observations.csv")
    parser.add_argument(
        "--features", nargs="+", required=True, help="List of feature column names"
    )
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--draws", type=int, default=1000)
    parser.add_argument("--tune", type=int, default=1000)
    parser.add_argument("--target-accept", type=float, default=0.9)
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = load_observations(args.data)
    enc, h_idx, t_idx, y, X = prepare_encodings(df, args.features)

    Xs, mean, std = standardize_features(X)
    enc.feature_mean = list(map(float, mean))
    enc.feature_std = list(map(float, std))

    coords = {
        "observation": np.arange(len(y)),
        "hypothesis": np.arange(len(enc.hypothesis_to_idx)),
        "time": np.arange(len(enc.time_to_idx)),
        "feature": np.arange(len(enc.feature_names)),
    }

    model = build_model(
        n_hypotheses=len(enc.hypothesis_to_idx),
        n_time=len(enc.time_to_idx),
        X=Xs,
        h_idx=h_idx,
        t_idx=t_idx,
        y=y,
        coords=coords,
    )

    with model:
        idata = pm.sample(
            draws=args.draws,
            tune=args.tune,
            target_accept=args.target_accept,
            return_inferencedata=True,
            chains=4,
            cores=4,
        )

    az.to_netcdf(idata, out_dir / "posterior.nc")

    with open(out_dir / "encodings.json", "w") as f:
        f.write(enc.to_json())

    summ = az.summary(idata, var_names=["alpha_global", "sigma_alpha", "sigma_rw"])  # small summary
    summ.to_csv(out_dir / "posterior_summary.csv")

    # Save simple training calibration: mean predicted p on observed rows
    try:
        p_obs = idata.posterior["p"].stack(draws=("chain", "draw")).mean("draws").mean("chain").values
        calib = {
            "n_observations": int(len(y)),
            "mean_p": float(np.mean(p_obs)),
            "mean_y": float(np.mean(y)),
        }
        with open(out_dir / "calibration.json", "w") as f:
            json.dump(calib, f, indent=2)
    except Exception:
        pass

    print(f"Saved posterior to {out_dir / 'posterior.nc'}")
    print(f"Saved encodings to {out_dir / 'encodings.json'}")
    print(f"Saved summary to {out_dir / 'posterior_summary.csv'}")


if __name__ == "__main__":
    main()

