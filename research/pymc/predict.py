import argparse
from pathlib import Path

import arviz as az
import numpy as np
import pandas as pd
import pymc as pm

from bkms_pymc.io_utils import Encodings, apply_standardization, load_observations
from bkms_pymc.model import build_model


def main():
    parser = argparse.ArgumentParser(description="Predict with PyMC dynamic belief model")
    parser.add_argument("--model", required=True, help="Path to posterior.nc")
    parser.add_argument("--encodings", required=True, help="Path to encodings.json")
    parser.add_argument("--data", required=True, help="Path to new_observations.csv")
    parser.add_argument("--features", nargs="+", required=True, help="Feature names")
    parser.add_argument("--out", required=True, help="Output CSV path for predictions")
    args = parser.parse_args()

    enc = Encodings.from_file(args.encodings)
    idata = az.from_netcdf(args.model)

    df = load_observations(args.data)
    if not set(args.features).issubset(df.columns):
        missing = set(args.features) - set(df.columns)
        raise ValueError(f"Missing feature columns: {sorted(missing)}")

    # Map to indices known at train time
    def map_idx(series, mapping, name):
        unknown = sorted(set(series) - set(mapping.keys()))
        if unknown:
            raise ValueError(f"Unknown {name} values not seen in training: {unknown[:5]}{'...' if len(unknown)>5 else ''}")
        return series.map(mapping).to_numpy()

    df["hypothesis_id"] = df["hypothesis_id"].astype(str)
    df["time_index"] = df["time_index"].astype(int)
    h_idx = map_idx(df["hypothesis_id"], enc.hypothesis_to_idx, "hypothesis_id")
    t_idx = map_idx(df["time_index"], enc.time_to_idx, "time_index")
    X = df[enc.feature_names].to_numpy().astype(float)
    Xs = apply_standardization(X, enc.feature_mean, enc.feature_std)

    coords = {
        "observation": np.arange(len(df)),
        "hypothesis": np.arange(len(enc.hypothesis_to_idx)),
        "time": np.arange(len(enc.time_to_idx)),
        "feature": np.arange(len(enc.feature_names)),
    }

    # Dummy y (not used for prediction); model requires shape
    y_dummy = np.zeros(len(df), dtype=int)

    model = build_model(
        n_hypotheses=len(enc.hypothesis_to_idx),
        n_time=len(enc.time_to_idx),
        X=Xs,
        h_idx=h_idx,
        t_idx=t_idx,
        y=y_dummy,
        coords=coords,
    )

    with model:
        ppc = pm.sample_posterior_predictive(idata, var_names=["p"], predictions=True)

    p_mean = ppc.predictions["p"].mean(dim=("chain", "draw")).values
    out_df = df.copy()
    out_df["p_hat"] = p_mean
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(args.out, index=False)
    print(f"Saved predictions to {args.out}")


if __name__ == "__main__":
    main()

