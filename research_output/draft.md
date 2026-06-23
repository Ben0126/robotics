# Embodied Intelligence for UAVs: From Language-Conditioned Planning to End-to-End Control, Diffusion Policies, Sim-to-Real Reinforcement Learning, and Aerial Vision-Language Navigation

## Abstract

Uncrewed aerial vehicles (UAVs) are moving away from hand-scripted autonomy toward systems that interpret intent, reason about scenes, and generate control directly from perception. This review traces that shift across five research threads: large language models (LLMs) as high-level planners, vision-language-action (VLA) models for end-to-end control, diffusion-based generative policies, sim-to-real reinforcement learning for agile flight, and aerial vision-and-language navigation (Aerial VLN). The evidence shows two converging paths. One stacks a reasoning model on top of a conventional flight stack and asks it to emit code or waypoints. The other learns a sensorimotor mapping outright and pushes the learned component down toward the control loop. Each path carries its own failure modes — grounding and safety for the planner route, sample efficiency and the simulation-to-reality gap for the learning route. The aerial setting sharpens both, because a drone acts in a continuous six-degree-of-freedom space under tight onboard compute and unforgiving dynamics. We close by mapping the open problems onto a practical adoption pathway for new entrants to the field.

## 1. Introduction

A decade ago, a UAV mission meant a finite-state machine and a stack of tuned PID loops. The pipeline was modular and legible: sense, map, plan, control. That structure still anchors production autopilots, and it remains the right place to relearn the fundamentals. The research frontier, though, has moved. Foundation models now sit at the top of the stack as planners, or replace large parts of it as learned policies (Firoozi et al., 2024).

Two pressures drive the change. First, language and vision-language models carry broad semantic priors that a hand-coded planner never had, which lets a non-expert steer a robot through plain instructions (Vemprala et al., 2024). Second, learned policies trained in massively parallel simulation can exploit a drone's full flight envelope in ways that staged pipelines cannot, because separating perception from planning adds latency and compounds error (Loquercio et al., 2021). This review organizes the literature around those two pressures and treats the aerial domain as the stress test that exposes where each approach breaks.

## 2. Language Models as High-Level Planners

The first wave kept the control stack intact and put an LLM in charge of deciding what to do. Vemprala et al. (2024) set out a recipe: expose a high-level function library with descriptive names, prompt the model with the task and the allowed calls, and keep a human in the loop to vet generated code before deployment. Their study ran zero-shot across manipulation, navigation, and aerial tasks, and the drone case is directly relevant here — the model wrote a zig-zag inspection pattern and asked clarifying questions when an instruction was ambiguous.

Two earlier results explain why the recipe works and where it strains. Ahn et al. (2022) addressed grounding with SayCan: the language model proposes useful actions, while learned value functions score whether each action can actually succeed from the current state. Pairing the two roughly doubled performance over an ungrounded baseline across 101 real-world tasks. Liang et al. (2023) pushed the LLM deeper into the loop with Code as Policies, where the model writes the policy program itself — feedback loops, control primitives, and spatial arithmetic via library calls — and hierarchical code generation handled more complex commands.

The UAV-specific literature has since adapted these ideas to flight. Recent systems wrap an LLM around model predictive control or treat planning as constrained code generation. Hu et al. (2025) integrate language and vision models for onboard visual tasks, and Sanyal et al. (2025) add a safety layer through scene-aware control barrier functions, which is the kind of guardrail the planner route needs once a real aircraft is in the air. The consistent lesson across this thread is that the LLM supplies semantics, not physics; competence depends on grounding and on an enforcement layer that can refuse an unsafe plan.

## 3. Vision-Language-Action Models for End-to-End Control

The second wave folds perception, language, and action into one network. RT-2 expressed robot actions as text tokens and co-trained a vision-language model on web data and robot trajectories, which produced emergent generalization to unseen objects and instructions (Brohan et al., 2023). The approach built on the at-scale control transformer RT-1 (Brohan et al., 2022). Closed weights and heavy compute limited adoption, a gap that OpenVLA addressed: a 7B open model trained on 970k Open X-Embodiment episodes, fusing DINOv2 and SigLIP features with a Llama 2 backbone, which outperformed the 55B RT-2-X by 16.5 percentage points across 29 tasks while remaining fine-tunable on consumer GPUs through low-rank adaptation (Kim et al., 2024). The breadth of the field is now catalogued in a dedicated survey covering architectures, datasets, platforms, and benchmarks (Kawaharazuka et al., 2025).

For a UAV practitioner, the value of this thread is conceptual and practical at once. Conceptually, casting action as another token sequence unifies high-level reasoning and low-level control. Practically, an open and quantizable model is the realistic entry point for hands-on work, because it can run and adapt without a data-center budget.

## 4. Diffusion and Generative Policies

A parallel line reframes action selection as conditional generation. Chi et al. (2023) introduced Diffusion Policy, which represents a visuomotor policy as a conditional denoising diffusion process over action sequences. Across 12 tasks and four benchmarks it improved on prior methods by an average of 46.9%, with three properties that matter for control: graceful handling of multimodal action distributions, suitability for high-dimensional action spaces, and stable training. Receding-horizon execution, visual conditioning, and a time-series diffusion transformer carried the method onto physical robots, and the journal version consolidated those results (Chi et al., 2024).

Generative policies trade inference latency for expressiveness, which is the central tension when the target is a fast-moving aircraft. A complementary line of work fine-tunes these generative policies with reinforcement learning to improve sampling efficiency and to counter representation collapse, and this review treats Diffusion Policy as the anchor of that lineage rather than surveying each fine-tuning variant.

## 5. Sim-to-Real Reinforcement Learning and Aerial Simulators

Where the previous threads largely borrow from manipulation, agile flight is where UAV research leads. Kaufmann et al. (2023) trained Swift with model-free reinforcement learning in simulation, corrected the simulation-to-reality mismatch with empirical noise models estimated from real flight data, and beat human champions in head-to-head first-person-view racing using only onboard sensing and computation. Loquercio et al. (2021) took the end-to-end route for cluttered environments, mapping noisy observations straight to collision-free receding-horizon trajectories with a network trained only in simulation through privileged learning, then transferring zero-shot to forests, snow, and disaster sites. Both results turn on the same idea: close the reality gap deliberately rather than hope it is small (Zhao et al., 2021).

That recipe depends on simulators that can generate enormous experience cheaply. OmniDrones provides GPU-parallel multirotor reinforcement learning on Isaac Sim, reaching roughly 10^5 frames per second on a single high-end GPU with benchmark tasks and baselines (Xu et al., 2024). Aerial Gym parallelizes thousands of multirotors with GPU-resident geometric controllers and trains motor-command policies in under a minute and vision-based navigation in under an hour (Kulkarni et al., 2025). Benchmarks of learned control for agile flight give a sober baseline for what these tools can and cannot yet deliver (Kaufmann et al., 2022).

## 6. Aerial Vision-and-Language Navigation

Aerial VLN is where the planner and the learning routes meet, and where the aerial domain is hardest. Liu et al. (2023) defined the problem with AerialVLN, the first city-scale benchmark, spanning 25 urban scenes with continuous navigation and a wide gap between baseline and human performance. The follow-on work splits along familiar lines. CityNavAgent uses an LLM for hierarchical semantic planning backed by a global memory graph, which reduces the long-horizon search that makes aerial navigation intractable (Zhang et al., 2025). OpenFly supplies a toolchain and a 100k-sample benchmark built across multiple rendering engines and 3D Gaussian Splatting, with an agent built on OpenVLA (Gao et al., 2025). Search-and-rescue framings add real-time constraints and vision-language model predictive control to the mix.

The aerial setting introduces problems that ground robots avoid: a continuous six-degree-of-freedom action space, severe viewpoint variation with altitude, city-scale instructions, and strict onboard compute. These are the structural reasons aerial VLN trails its ground counterpart, and they define the agenda for the next few years.

## 7. Synthesis: Gaps and a Learning Roadmap

Three gaps recur across the threads. Onboard deployment is the first: most capable planners and VLA models assume cloud-scale compute, while a drone carries a small board, so distillation and quantization are load-bearing, not optional. Continuous control is the second: aerial VLN benchmarks still lean on discretized actions, which sidesteps the six-degree-of-freedom execution a real aircraft needs. The reality gap is the third and most stubborn: the methods that cross it best, Swift among them, invest specifically in modeling the mismatch rather than assuming it away.

Those gaps suggest a staged adoption pathway. The modular stack remains foundational, because PID control and the standard flight modes are the substrate that every learned component eventually commands. The middleware and the language-to-command interface form the next layer, since that interface is the literal bridge in the planner route. Vision-language perception and generative or reinforcement-learned control follow, ideally on open and quantizable models that fit a single GPU. Integration into a compact embodied demonstration, paired with the frontier surveys, then situates a specific contribution. The most tractable near-term target is narrow: replacing the discretized action interface of an aerial VLN benchmark with continuous trajectory setpoints, then validating the transfer in a high-fidelity simulator before hardware deployment.

## Evidence Table

| Title | Authors / Year | Key finding | DOI / URL |
|---|---|---|---|
| ChatGPT for Robotics | Vemprala et al., 2024 | High-level API library + prompting lets an LLM control robots zero-shot, including a drone inspection pattern | 10.1109/ACCESS.2024.3387941 |
| Do As I Can, Not As I Say (SayCan) | Ahn et al., 2022 | Value-function affordances ground LLM plans; ~2x over ungrounded on 101 tasks | arXiv:2204.01691 |
| Code as Policies | Liang et al., 2023 | LLMs write executable policy code with hierarchical code-gen | 10.1109/ICRA48891.2023.10160591 |
| RT-1 | Brohan et al., 2022 | Transformer for real-world robot control at scale | arXiv:2212.06817 |
| RT-2 | Brohan et al., 2023 | Actions as text tokens; web-scale pretraining yields emergent generalization | arXiv:2307.15818 |
| OpenVLA | Kim et al., 2024 | Open 7B VLA, 970k episodes; beats RT-2-X (55B) by 16.5%; LoRA-tunable on consumer GPUs | arXiv:2406.09246 |
| VLA survey | Kawaharazuka et al., 2025 | Systematic review of VLA architectures, datasets, platforms, benchmarks | 10.1109/ACCESS.2025.3609980 |
| Diffusion Policy | Chi et al., 2023/2024 | Action diffusion; +46.9% avg; handles multimodal, high-dim actions | 10.15607/RSS.2023.XIX.026 |
| Champion-level drone racing (Swift) | Kaufmann et al., 2023 | Sim-trained RL + empirical noise models beats human FPV champions onboard-only | 10.1038/s41586-023-06419-4 |
| Learning high-speed flight in the wild | Loquercio et al., 2021 | End-to-end obs→trajectory, privileged learning, zero-shot sim-to-real | 10.1126/scirobotics.abg5810 |
| OmniDrones | Xu et al., 2024 | Isaac Sim GPU-parallel drone RL, ~10^5 FPS, benchmark suite | 10.1109/LRA.2024.3356168 |
| Aerial Gym Simulator | Kulkarni et al., 2025 | Thousands of MAVs parallel; motor policy <1 min, vision nav <1 hr | 10.1109/LRA.2025.3548507 |
| AerialVLN | Liu et al., 2023 | First city-scale UAV-VLN benchmark; large human–baseline gap | 10.1109/ICCV51070.2023.01411 |
| CityNavAgent | Zhang et al., 2025 | LLM hierarchical semantic planning + global memory for aerial VLN | 10.18653/v1/2025.acl-long.1511 |
| OpenFly | Gao et al., 2025 | Aerial VLN toolchain + 100k benchmark; OpenFly-Agent on OpenVLA | arXiv:2502.18041 |
| LLVM-drone | Hu et al., 2025 | Integrates LLMs and vision models for UAV visual tasks | 10.1016/j.knosys.2025.114190 |
| ASMA | Sanyal et al., 2025 | Scene-aware control barrier functions for safe vision-language drone nav | 10.1109/LRA.2025.3592138 |
| Foundation models in robotics | Firoozi et al., 2024 | Survey of foundation-model applications and challenges in robotics | 10.1177/02783649241281508 |
| Crossing the Reality Gap | Zhao et al., 2021 | Survey of sim-to-real transfer for RL controllers | 10.1109/ACCESS.2021.3126658 |
| Benchmark of learned agile flight control | Kaufmann et al., 2022 | Comparison of learned control policies for agile quadrotor flight | 10.1109/ICRA46639.2022.9811564 |

## References

Ahn, M., Brohan, A., Brown, N., Chebotar, Y., Cortes, O., David, B., … Zeng, A. (2022). *Do as I can, not as I say: Grounding language in robotic affordances* [Conference paper]. Conference on Robot Learning. https://arxiv.org/abs/2204.01691

Brohan, A., Brown, N., Carbajal, J., Chebotar, Y., Dabis, J., Finn, C., … Zitkovich, B. (2022). *RT-1: Robotics transformer for real-world control at scale*. arXiv. https://arxiv.org/abs/2212.06817

Brohan, A., Brown, N., Carbajal, J., Chebotar, Y., Chen, X., Choromanski, K., … Zitkovich, B. (2023). *RT-2: Vision-language-action models transfer web knowledge to robotic control*. arXiv. https://arxiv.org/abs/2307.15818

Chi, C., Feng, S., Du, Y., Xu, Z., Cousineau, E., Burchfiel, B., & Song, S. (2023). Diffusion policy: Visuomotor policy learning via action diffusion. In *Proceedings of Robotics: Science and Systems*. https://doi.org/10.15607/RSS.2023.XIX.026

Chi, C., Xu, Z., Feng, S., Cousineau, E., Du, Y., Burchfiel, B., Tedrake, R., & Song, S. (2024). Diffusion policy: Visuomotor policy learning via action diffusion. *The International Journal of Robotics Research*. https://doi.org/10.1177/02783649241273668

Firoozi, R., Tucker, J., Tian, S., Majumdar, A., Sun, J., Liu, W., Zhu, Y., Song, S., Kapoor, A., Hausman, K., Ichter, B., Driess, D., Wu, J., Lu, C., & Schwager, M. (2024). Foundation models in robotics: Applications, challenges, and the future. *The International Journal of Robotics Research, 44*(5), 701–739. https://doi.org/10.1177/02783649241281508

Gao, Y., Li, C., You, Z., Liu, J., Li, Z., Chen, P., … Zhao, B. (2025). *OpenFly: A versatile toolchain and large-scale benchmark for aerial vision-language navigation*. arXiv. https://arxiv.org/abs/2502.18041

Hu, Y., Zhou, Y., Zhu, Z., Yang, X., Zhang, H., Bian, K., & Han, H. (2025). LLVM-drone: A synergistic framework integrating large language models and vision models for visual tasks in unmanned aerial vehicles. *Knowledge-Based Systems, 327*, Article 114190. https://doi.org/10.1016/j.knosys.2025.114190

Kaufmann, E., Bauersfeld, L., & Scaramuzza, D. (2022). A benchmark comparison of learned control policies for agile quadrotor flight. In *2022 IEEE International Conference on Robotics and Automation (ICRA)* (pp. 10504–10510). https://doi.org/10.1109/ICRA46639.2022.9811564

Kaufmann, E., Bauersfeld, L., Loquercio, A., Müller, M., Koltun, V., & Scaramuzza, D. (2023). Champion-level drone racing using deep reinforcement learning. *Nature, 620*, 982–987. https://doi.org/10.1038/s41586-023-06419-4

Kawaharazuka, K., Oh, J., Yamada, J., Posner, I., & Zhu, Y. (2025). Vision-language-action models for robotics: A review towards real-world applications. *IEEE Access, 13*, 162467–162504. https://doi.org/10.1109/ACCESS.2025.3609980

Kim, M. J., Pertsch, K., Karamcheti, S., Xiao, T., Balakrishna, A., Nair, S., … Finn, C. (2024). *OpenVLA: An open-source vision-language-action model*. arXiv. https://arxiv.org/abs/2406.09246

Kulkarni, M., Rehberg, W., & Alexis, K. (2025). Aerial Gym Simulator: A framework for highly parallelized simulation of aerial robots. *IEEE Robotics and Automation Letters, 10*(4), 4093–4100. https://doi.org/10.1109/LRA.2025.3548507

Liang, J., Huang, W., Xia, F., Xu, P., Hausman, K., Ichter, B., Florence, P., & Zeng, A. (2023). Code as policies: Language model programs for embodied control. In *2023 IEEE International Conference on Robotics and Automation (ICRA)*. https://doi.org/10.1109/ICRA48891.2023.10160591

Liu, S., Zhang, H., Qi, Y., Wang, P., Zhang, Y., & Wu, Q. (2023). AerialVLN: Vision-and-language navigation for UAVs. In *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)* (pp. 15384–15394). https://doi.org/10.1109/ICCV51070.2023.01411

Loquercio, A., Kaufmann, E., Ranftl, R., Müller, M., Koltun, V., & Scaramuzza, D. (2021). Learning high-speed flight in the wild. *Science Robotics, 6*(59), eabg5810. https://doi.org/10.1126/scirobotics.abg5810

Sanyal, S., & Roy, K. (2025). ASMA: An adaptive safety margin algorithm for vision-language drone navigation via scene-aware control barrier functions. *IEEE Robotics and Automation Letters, 10*(9), 9232–9239. https://doi.org/10.1109/LRA.2025.3592138

Vemprala, S., Bonatti, R., Bucker, A., & Kapoor, A. (2024). ChatGPT for robotics: Design principles and model abilities. *IEEE Access, 12*, 55682–55696. https://doi.org/10.1109/ACCESS.2024.3387941

Xu, B., Gao, F., Yu, C., Zhang, R., Wu, Y., & Wang, Y. (2024). OmniDrones: An efficient and flexible platform for reinforcement learning in drone control. *IEEE Robotics and Automation Letters, 9*(3), 2838–2844. https://doi.org/10.1109/LRA.2024.3356168

Zhang, W., Gao, C., Yu, S., Peng, R., Zhao, B., Zhang, Q., Cui, J., Chen, X., & Li, Y. (2025). CityNavAgent: Aerial vision-and-language navigation with hierarchical semantic planning and global memory. In *Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics* (pp. 31292–31309). https://doi.org/10.18653/v1/2025.acl-long.1511

Zhao, W., Queralta, J. P., & Westerlund, T. (2021). Crossing the reality gap: A survey on sim-to-real transferability of robot controllers in reinforcement learning. *IEEE Access, 9*, 153171–153187. https://doi.org/10.1109/ACCESS.2021.3126658
