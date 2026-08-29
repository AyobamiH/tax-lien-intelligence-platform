# Open-Source Component Decisions

## Decision Summary

No mature open-source tax-lien acquisition engine was found that can be
installed as the product's intelligence core. Phase 47 will compose mature
adjacent components and keep tax-lien-specific rules and evaluation inside this
repository's governed boundary.

| Component | Intended use | License posture | Decision |
| --- | --- | --- | --- |
| Cook County `model-res-avm` | AVM methodology, temporal validation, ratio studies, explanations | AGPL-3.0 | Study methodology; do not copy code without a separate license decision |
| Splink | Parcel, owner, and address entity resolution | MIT | Planned for data foundation after real source inventory |
| Pandera | Dataframe contracts and dataset validation | MIT | Planned for Python data boundary |
| InterpretML | Explainable tabular baseline | MIT | Preferred first model baseline after labels exist |
| LightGBM | Challenger AVM and tabular model | MIT | Evaluate after interpretable baseline |
| lifelines | Time-to-redemption survival analysis with censoring | MIT | Preferred redemption-model foundation after outcomes exist |
| DVC | Dataset and model-artifact versioning | Apache-2.0 | Planned for reproducibility |
| MLflow | Experiment and model registry | Apache-2.0 | Defer until DVC-only workflow becomes insufficient |
| LeinOS | Tax-lien workflow concepts | MIT | Reference concepts only; do not reuse calculations without independent validation |
| WPRDC lien-machine and Philadelphia delinquency pipeline | ETL and normalization patterns | Repository-specific review required | Reference patterns only |

## Guardrails

- Record exact dependency versions and licenses before adoption.
- Do not import AGPL source into a differently licensed service without an
  explicit licensing decision.
- Do not treat repository popularity, README claims, or example notebooks as
  production validation.
- Benchmark every model against transparent baselines on out-of-time data.
- Preserve per-field source provenance and model-artifact provenance.
- Keep LLMs out of deterministic calculations and model inference.

## Primary References

- https://github.com/ccao-data/model-res-avm
- https://github.com/moj-analytical-services/splink
- https://github.com/unionai-oss/pandera
- https://github.com/interpretml/interpret
- https://github.com/lightgbm-org/LightGBM
- https://github.com/CamDavidsonPilon/lifelines
- https://github.com/iterative/dvc
- https://github.com/mlflow/mlflow
- https://github.com/3piecechickendinner/LeinOS
- https://github.com/WPRDC/lien-machine
- https://github.com/CityOfPhiladelphia/property-tax-delinquency-pipeline
- https://www.iaao.org/industry-data/iaao-technical-standards/
