PyMC Research Module (Isolated from BKMS App)

This directory contains a standalone Python/PyMC workflow for Bayesian belief modeling, separate from the TypeScript/Next.js app. It does not modify or depend on the app code.

What’s included
- Dynamic belief model: Hierarchical logistic model with a global time effect (Gaussian random walk) and feature coefficients.
- CLI scripts:
  - `simulate.py`: Generate a toy dataset.
  - `train.py`: Fit the model to observed outcomes and save posterior.
  - `predict.py`: Load the posterior and score new rows.
- Minimal docs and requirements for a separate Python environment.

Data schema
- observations.csv (training)
  - `hypothesis_id` (str)
  - `time_index` (int; discrete time step)
  - `outcome` (0/1; rows with missing outcome are ignored in training)
  - One or more feature columns (e.g., `feat_1`, `feat_2`, ...)
- new_observations.csv (prediction)
  - Same columns except `outcome` optional/ignored

Model (high level)
- p(y=1) = sigmoid(alpha_global + alpha_h[h] + gamma[t] + X·beta)
  - `alpha_h` is a hierarchical offset per hypothesis
  - `gamma` is a Gaussian random walk over time_index (shared global time effect)
  - `beta` are feature coefficients

Isolation note
- This is a research-only module. No Python is used by the Next.js app. Keep this directory separate for experiments.

Quickstart
1) Create a virtualenv and install deps
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

2) Generate sample data
   python simulate.py --out data/observations.csv --n-hypotheses 20 --n-time 40 --features 3

3) Train
   python train.py \
     --data data/observations.csv \
     --features feat_1 feat_2 feat_3 \
     --out outputs

4) Predict (requires new rows use known hypothesis_id and time_index from training)
   python predict.py \
     --model outputs/posterior.nc \
     --encodings outputs/encodings.json \
     --data data/observations.csv \
     --features feat_1 feat_2 feat_3 \
     --out outputs/predictions.csv

Notes
- New hypotheses or new time indices are not supported by the saved posterior (shape mismatch). Retrain to expand coordinates.
- This example uses simple standardization (mean/std) stored in `encodings.json`.

