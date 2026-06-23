# UAV Embodied Intelligence — Synthesis Note

> Knowledge-base synthesis from the deep-science-writer run (2026-06-22). Pairs with `../Research_Report.docx`, `../../papers-reading-list.md`.

## One-paragraph takeaway
UAV autonomy is splitting into two converging routes. **Route A (planner-on-top):** keep the flight stack, put an LLM/VLM on top to emit code or waypoints (ChatGPT for Robotics, SayCan, Code as Policies → UAV-specific LLVM-drone, ASMA). **Route B (learned policy):** replace large parts of the stack with a learned sensorimotor mapping (VLA: RT-2/OpenVLA; Diffusion Policy; sim-to-real RL: Swift, High-Speed Flight). Route A's risk is grounding + safety; Route B's risk is sample efficiency + the sim-to-real gap. Aerial VLN (AerialVLN, CityNavAgent, OpenFly) is where both routes meet and where the aerial domain is hardest.

## Strategic takeaways for the learner
1. **Start modular, end learned.** PID + flight modes remain the substrate every learned component eventually commands — Phase 1–2 of the plan is not optional nostalgia.
2. **Open + quantizable models are the real entry point.** OpenVLA (7B, LoRA-tunable on consumer GPU) beats closed 55B RT-2-X — you can actually run this in Phase 3.
3. **Closing the reality gap is engineered, not assumed.** Swift's edge came from empirical noise models; budget for domain randomization in any RL plan (Phase 3 W6).
4. **Latency vs expressiveness is the recurring UAV tension.** Diffusion Policy is expressive but slow; for a fast aircraft this trade-off is the design decision.

## Research gap (for Week 8 selection)
- **Onboard deployment**: capable planners/VLAs assume cloud compute; drones carry small boards → distillation/quantization is load-bearing.
- **Continuous 6-DoF execution**: aerial VLN benchmarks lean on discretized actions, sidestepping real flight control.
- **Sim-to-real for VLN**: little work transfers aerial VLN policies to hardware.

## Concrete starter project (1–2 months)
Take a discretized aerial VLN task (AerialVLN / OpenFly), replace its action interface with **continuous `TrajectorySetpoint` control** (the Phase 2 PX4 Offboard skill), and validate transfer in a high-fidelity simulator (OmniDrones / Aerial Gym / PX4 SITL) before any hardware.

## How this feeds the 8-week plan
| Plan phase | Fed by |
|---|---|
| P1 control | Swift / agile-flight benchmark (traditional vs learned control contrast) |
| P2 ROS2/Offboard | the continuous-action bridge used in the starter project |
| P3 VLM + RL | OpenVLA, Diffusion Policy, OmniDrones/Aerial Gym, sim-to-real survey |
| P4 integration + papers | ChatGPT for Robotics, SayCan, Code as Policies; AerialVLN/CityNavAgent/OpenFly + surveys |
