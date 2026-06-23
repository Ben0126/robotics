# NotebookLM Ingestion Kit (manual)

> ⚠️ Programmatic `add_source` via the MCP is currently broken in this environment
> ("Could not open the Add source dialog" — a stale UI selector; `ask_question` still works).
> Add these manually in NotebookLM: open the notebook → **+ Add source**.
> Notebook: https://notebooklm.google.com/notebook/7cefe9eb-1377-4a24-9d8d-7552db51cebb

## 1) Paper URLs — use "Add source → Website/Link" (prefer open-access links below)

```
https://arxiv.org/abs/2306.17582      # ChatGPT for Robotics (Vemprala et al., 2024)
https://arxiv.org/abs/2204.01691      # SayCan (Ahn et al., 2022)
https://arxiv.org/abs/2209.07753      # Code as Policies (Liang et al., 2023)
https://arxiv.org/abs/2212.06817      # RT-1 (Brohan et al., 2022)
https://arxiv.org/abs/2307.15818      # RT-2 (Brohan et al., 2023)
https://arxiv.org/abs/2406.09246      # OpenVLA (Kim et al., 2024)
https://vla-survey.github.io/         # VLA Survey (Kawaharazuka et al., 2025, IEEE Access)
https://arxiv.org/abs/2303.04137      # Diffusion Policy (Chi et al., 2023/2024)
https://www.nature.com/articles/s41586-023-06419-4   # Swift / drone racing (Kaufmann et al., 2023, Nature)
https://arxiv.org/abs/2110.05113      # Learning High-Speed Flight in the Wild (Loquercio et al., 2021)
https://arxiv.org/abs/2309.12825      # OmniDrones (Xu et al., 2024)
https://ntnu-arl.github.io/aerial_gym_simulator/     # Aerial Gym Simulator (Kulkarni et al., 2025)
https://arxiv.org/abs/2308.06735      # AerialVLN (Liu et al., 2023)
https://aclanthology.org/2025.acl-long.1511/         # CityNavAgent (Zhang et al., 2025)
https://arxiv.org/abs/2502.18041      # OpenFly (Gao et al., 2025)
https://doi.org/10.1016/j.knosys.2025.114190         # LLVM-drone (Hu et al., 2025)
https://doi.org/10.1109/LRA.2025.3592138             # ASMA (Sanyal & Roy, 2025)
https://doi.org/10.1177/02783649241281508            # Foundation models in robotics (Firoozi et al., 2024)
https://doi.org/10.1109/ACCESS.2021.3126658          # Crossing the Reality Gap (Zhao et al., 2021)
https://doi.org/10.1109/ICRA46639.2022.9811564       # Agile flight benchmark (Kaufmann et al., 2022)
```
> Tip: arXiv/ACL/project-site links crawl cleanly. Nature/IEEE/Elsevier DOI pages may be partly paywalled to the crawler — the arXiv versions above cover most of them.

## 2) Local files — use "Add source → Upload" (Markdown/PDF/txt accepted)
- `d:\robotics\research_output\Research_Report.docx`  ← the literature review (or paste `draft.md`)
- `d:\robotics\papers-reading-list.md`                ← annotated reading list (curriculum ↔ papers)
- `d:\robotics\README.md`                             ← 8-week curriculum overview
- `d:\robotics\research_output\knowledge_base\uav-embodied-ai-synthesis.md`  ← synthesis + gaps
- (optional) the four phase files `01-…`–`04-…`

## 3) Source budget
Free tier = 50 sources/notebook. The 20 papers + ~5 docs ≈ 25 new sources, which fits alongside your existing Generative-RL/flow-policy sources.
