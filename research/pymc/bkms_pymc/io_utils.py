import json
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


@dataclass
class Encodings:
    hypothesis_to_idx: Dict[str, int]
    time_to_idx: Dict[int, int]
    feature_names: List[str]
    feature_mean: List[float]
    feature_std: List[float]

    def to_json(self) -> str:
        return json.dumps(
            {
                "hypothesis_to_idx": self.hypothesis_to_idx,
                "time_to_idx": self.time_to_idx,
                "feature_names": self.feature_names,
                "feature_mean": self.feature_mean,
                "feature_std": self.feature_std,
            },
            indent=2,
        )

    @staticmethod
    def from_file(path: str) -> "Encodings":
        with open(path, "r") as f:
            data = json.load(f)
        return Encodings(
            hypothesis_to_idx={str(k): int(v) for k, v in data["hypothesis_to_idx"].items()},
            time_to_idx={int(k): int(v) for k, v in data["time_to_idx"].items()},
            feature_names=list(data["feature_names"]),
            feature_mean=list(data["feature_mean"]),
            feature_std=list(data["feature_std"]),
        )


def load_observations(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"hypothesis_id", "time_index"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    return df


def prepare_encodings(df: pd.DataFrame, feature_names: List[str]) -> Tuple[Encodings, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if not set(feature_names).issubset(df.columns):
        missing = set(feature_names) - set(df.columns)
        raise ValueError(f"Missing feature columns: {sorted(missing)}")

    # Keep only rows with observed outcomes for training
    obs_df = df.dropna(subset=["outcome"]).copy()
    obs_df["outcome"] = obs_df["outcome"].astype(int)

    hypotheses = sorted(obs_df["hypothesis_id"].astype(str).unique())
    times = sorted(obs_df["time_index"].astype(int).unique())

    h2i = {h: i for i, h in enumerate(hypotheses)}
    t2i = {t: i for i, t in enumerate(times)}

    h_idx = obs_df["hypothesis_id"].astype(str).map(h2i).to_numpy()
    t_idx = obs_df["time_index"].astype(int).map(t2i).to_numpy()
    y = obs_df["outcome"].to_numpy().astype(int)
    X = obs_df[feature_names].to_numpy().astype(float)

    enc = Encodings(
        hypothesis_to_idx=h2i,
        time_to_idx=t2i,
        feature_names=feature_names,
        feature_mean=[0.0] * len(feature_names),
        feature_std=[1.0] * len(feature_names),
    )
    return enc, h_idx, t_idx, y, X


def standardize_features(X: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    mean = X.mean(axis=0)
    std = X.std(axis=0)
    std = np.where(std == 0, 1.0, std)
    Xs = (X - mean) / std
    return Xs, mean, std


def apply_standardization(X: np.ndarray, mean: List[float], std: List[float]) -> np.ndarray:
    mean_arr = np.asarray(mean)
    std_arr = np.asarray(std)
    std_arr = np.where(std_arr == 0, 1.0, std_arr)
    return (X - mean_arr) / std_arr

