from typing import Dict

import numpy as np
import pymc as pm


def build_model(
    n_hypotheses: int,
    n_time: int,
    X: np.ndarray,
    h_idx: np.ndarray,
    t_idx: np.ndarray,
    y: np.ndarray,
    coords: Dict[str, np.ndarray],
):
    with pm.Model(coords=coords) as model:
        pm.Data("h_idx", h_idx, dims="observation")
        pm.Data("t_idx", t_idx, dims="observation")
        X_data = pm.Data("X", X, dims=("observation", "feature"))

        alpha_global = pm.Normal("alpha_global", 0.0, 1.5)
        sigma_alpha = pm.HalfNormal("sigma_alpha", 1.0)
        alpha_h = pm.Normal("alpha_h", 0.0, sigma_alpha, dims="hypothesis")

        sigma_rw = pm.HalfNormal("sigma_rw", 1.0)
        gamma = pm.GaussianRandomWalk("gamma", sigma=sigma_rw, dims="time")

        beta = pm.Normal("beta", 0.0, 1.0, dims="feature")

        eta = alpha_global + alpha_h[h_idx] + gamma[t_idx] + pm.math.dot(X_data, beta)

        p = pm.Deterministic("p", pm.math.sigmoid(eta), dims="observation")
        pm.Bernoulli("y", p=p, observed=y, dims="observation")

    return model
