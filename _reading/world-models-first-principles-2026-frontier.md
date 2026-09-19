---
layout: post
title: "World Models: From First Principles to the 2026 Frontier"
date: 2026-09-20
order: 24
categories: [reading, ai]
tags: [world-models, reinforcement-learning, generative-ai]
---

## What Is a World Model?

Imagine tossing a ball to a friend. Neither of you performs Newtonian calculus mid-throw; instead, your brain runs a fast, rough internal simulation of how the ball will move, and your hands adjust on the fly. That internal simulation — built from years of watching objects fall, bounce, and roll — is the intuition behind a world model: a learned internal representation of how an environment behaves, which an agent (biological or artificial) can use to predict, plan, and act without having to touch the real world every single time. In AI, a world model is a system trained to answer a simple but powerful question: given the current situation and a hypothetical action, what happens next? If a model can answer that reliably, it can be used to plan ahead, to train a decision-making policy safely inside a simulation, or to generate entirely new plausible experiences.

### Three Schools of Thought

By 2026, the phrase “world model” is used by at least three overlapping but distinct communities, and conflating them causes a lot of confusion. It helps to keep them separate from the start.

<div class="table-scroll"><table><thead><tr><th>School</th><th>What “world model” means</th><th>Flagship systems</th></tr></thead><tbody><tr><td>Planner-view (LeCun / JEPA)</td><td>A system that predicts future latent representations, not pixels, so it can be queried for “what would happen if I did X” as a planning substrate.</td><td>I-JEPA, V-JEPA, V-JEPA 2</td></tr><tr><td>Generative-video view</td><td>A video generator that displays emergent physics-like behaviour (object permanence, occlusion, gravity) and is treated as a pixel-level simulator of reality.</td><td>Sora, Veo, HunyuanWorld</td></tr><tr><td>Interactive-environment view (DeepMind)</td><td>A system that generates a navigable, persistent, playable environment in real time from a prompt or image.</td><td>Genie 3, World Labs Marble</td></tr></tbody></table></div>

<aside class="article-callout" role="note">
<p class="article-callout__label">Key Idea</p>
<p>All three schools share one root idea: an internal model of state transitions — how the world changes from one moment to the next — that is learned from data rather than hand-coded. They differ mainly in what space they predict in (pixels vs. abstract latents) and what they are for (planning vs. content generation vs. interactive simulation).</p>
</aside>

### Why Not Just Use a Bigger Language Model?

Large language models are extremely good at manipulating symbols, but they have no grounded, causal understanding of physical space, gravity, occlusion, or object permanence: they have only ever seen text descriptions of the world, not the world itself. Proponents of world models argue that an agent which must act in a physical or simulated environment — a warehouse robot, a self-driving car, a game character — needs a model that predicts sensory consequences of actions, which is a fundamentally different training signal from predicting the next token in a sentence. This is the central bet behind the current wave of investment in world models as a candidate path beyond pure language modelling.

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>This is a live, unresolved debate, not settled science. Skeptics point out that generative video models already show impressive physical plausibility without an explicit JEPA-style architecture, and that scaling laws for language and multimodal models have repeatedly outperformed hand-designed architectural bets. Hold the claims in this document as a snapshot of an active research race, not a final verdict.</p>
</aside>

## A Short History

### Roots in the 1990s

Long before the term became fashionable, Jürgen Schmidhuber proposed recurrent neural network “controllers” paired with a separate predictive model of the environment, arguing that an agent could think ahead by rolling its internal model forward instead of only reacting to raw sensory input. This “learning to think” framing — separate the world's dynamics from the decision-making policy — underlies almost every architecture discussed in this document, thirty years later.

### 2018: Ha & Schmidhuber's World Models

The paper that popularised the modern term trained three components in sequence on simple game environments (a car-racing task and a first-person shooter):

- V (Vision): a variational autoencoder (VAE) that compresses each raw video frame into a

small latent vector z.

- M (Memory): a mixture-density recurrent network (MDN-RNN) that predicts the distribution of the next latent z′ given the current z, the action taken, and a hidden recurrent state.

- C (Controller): a tiny, often single-layer, policy that maps [z,h] to an action, trained with

an evolutionary strategy (CMA-ES) rather than gradient descent. The strikingly counter-intuitive result: because V and M are trained once, self-supervised, and then frozen, the controller can be trained entirely inside a “hallucinated” rollout generated by M — a dream — and the resulting policy still transfers back to the real environment. This is the origin of the now-common phrase training an agent inside its own imagination.

<figure class="native-diagram native-diagram--vmc" aria-labelledby="vmc-caption"><div class="native-diagram__flow"><div class="native-diagram__node"><strong>V</strong><span>VAE encoder</span><small>raw frame x<sub>t</sub> → latent z<sub>t</sub></small></div><div class="native-diagram__arrow" aria-hidden="true">→</div><div class="native-diagram__node"><strong>M</strong><span>MDN-RNN</span><small>latent z<sub>t</sub>, hidden h<sub>t</sub></small></div><div class="native-diagram__arrow" aria-hidden="true">→</div><div class="native-diagram__node"><strong>C</strong><span>Controller</span><small>[z<sub>t</sub>, h<sub>t</sub>] → action a<sub>t</sub></small></div></div><div class="native-diagram__feedback">action a<sub>t</sub> fed back into M (real or dreamed rollout)</div><figcaption id="vmc-caption">World Models V–M–C loop: the VAE encodes a raw frame, the MDN-RNN predicts latent dynamics, and the controller chooses an action that feeds the rollout.</figcaption></figure>

<aside class="article-callout" role="note">
<p class="article-callout__label">Why train the controller separately?</p>
<p>Keeping the controller tiny and training it after freezing V and M means almost all the representational complexity lives in the world model, while the decision-making layer stays small, fast to train, and easy to inspect — a design philosophy that still shows up in 2026 systems, where a large pretrained world model is paired with a lightweight, task-specific policy head.</p>
</aside>

### The Model-Based RL Renaissance: PlaNet to DreamerV3

Through 2019–2023, DeepMind's Danijar Hafner and collaborators pushed the same recipe — learn a compact latent dynamics model, then plan or act inside it — to state-of-the-art results on continuous control and Atari-scale benchmarks:

- PlaNet (2019): introduced the Recurrent State-Space Model (RSSM), which mixes a deterministic recurrent path with a stochastic latent variable, and plans actions with a samplingbased optimiser (CEM) directly in latent space, with no learned policy network at all.

- Dreamer (2020): replaced online planning with a learned actor-critic pair trained purely

from imagined rollouts inside the RSSM — “dream to control.”

- DreamerV2 (2021): switched to discrete categorical latents and added KL-balancing tricks,

closing much of the gap to model-free RL on Atari.

- DreamerV3 (2023): generalised the recipe across dozens of qualitatively different domains

(robotics, Minecraft, Atari, continuous control) using one fixed set of hyperparameters, largely by normalising value and reward predictions with a “symlog” transform so that wildly different reward scales stop breaking training. DreamerV3 in particular is still, as of 2026, a widely used baseline and production-grade recipe for model-based reinforcement learning, and is a reasonable first stop for anyone who wants to build a world model that a policy actually acts inside of, rather than one used purely for representation learning.

### A Parallel Line: MuZero and Learned-Rules Planning

DeepMind's MuZero (2019) and its more sample-efficient successor EficientZero took a related but distinct approach: instead of learning to predict raw observations, MuZero learns a latent transition model that only needs to correctly predict future rewards, values, and policies for a Monte Carlo Tree Search planner — it never needs to reconstruct anything the eye would recognise as an image. This lineage traces back to (and powers descendants of) AlphaGo/AlphaZero, and demonstrates that a world model does not need to be visually interpretable to be useful for planning.

## Anatomy of a World Model

Despite very different implementations, nearly every system in this document is built from the same four functional pieces:

<div class="table-scroll"><table><thead><tr><th>Component</th><th>Role</th></tr></thead><tbody><tr><td>Representation / encoder</td><td>Compresses raw, high-dimensional observations (pixels, video, sensor streams) into a smaller latent state.</td></tr><tr><td>Dynamics / transition model</td><td>Predicts how the latent state evolves, typically conditioned on an action: z<sub>t+1</sub> ∼ f(z<sub>t</sub>, a<sub>t</sub>).</td></tr><tr><td>Reward / value model</td><td>Predicts the outcome that matters for the task — reward, value, or task-relevant signal — from the latent state, when the system is used for control.</td></tr><tr><td>Policy / controller</td><td>Chooses actions, either by directly querying the dynamics model (planning) or by being trained on imagined rollouts (Dreamer-style).</td></tr></tbody></table></div>

<aside class="article-callout" role="note">
<p class="article-callout__label">Key Idea</p>
<p>Two design choices split almost the entire field: (1) what space does the dynamics model predict in — pixels, discrete latents, or continuous embeddings — and (2) is the model trained to be useful for a downstream policy, or trained purely to represent the world well, with any downstream use added later. The following sections walk through how these choices play out across today’s major architecture families.</p>
</aside>

## Latent-Space Model-Based Reinforcement Learning

This family predicts a compact latent state forward in time and either plans against it directly or trains a policy inside imagined rollouts.

### PlaNet and the Recurrent State-Space Model (RSSM)

The RSSM splits the latent state into a deterministic part (carried by a GRU, good at remembering long-range information) and a stochastic part (a sampled latent, good at capturing genuine uncertainty about what happens next). PlaNet used this model purely for planning: at each real step, it imagines thousands of candidate action sequences using the RSSM, scores them by predicted reward, and executes only the best first action, discarding the rest — a receding-horizon (model-predictive control) strategy.

### Dreamer, DreamerV2, DreamerV3

Dreamer keeps the RSSM but stops re-planning at every step; instead it trains an actor network and a critic network entirely from short imagined rollouts sampled from the RSSM, then deploys the actor directly in the real environment. This is dramatically cheaper at inference time (a single forward pass instead of search) and made a strong actor-critic loop trainable almost entirely “in the model's head.”

<div class="table-scroll"><table><thead><tr><th>Version</th><th>Main technical change</th><th>Practical effect</th></tr></thead><tbody><tr><td>DreamerV1</td><td>RSSM + imagined actor-critic training</td><td>First strong “dream to control” result on pixel-based continuous control</td></tr><tr><td>DreamerV2</td><td>Discrete categorical latents, KL balancing</td><td>Matched top model-free agents on the full Atari benchmark</td></tr><tr><td>DreamerV3</td><td>Symlog-transformed predictions, return normalisation, one fixed hyperparameter set</td><td>Works out-of-the-box across robotics, Minecraft, board-style and continuous-control tasks without per-domain tuning</td></tr></tbody></table></div>

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>The “symlog” trick used in DreamerV3 — predicting sign(x)log(1+|x|) instead of raw values — squashes rewards that might range from 0.01 to 10,000 across different tasks into a comparable scale, which is a large part of why a single hyperparameter configuration generalises so well. It is a small, almost boring idea with an outsized practical impact, and a good illustration of how much of world-model engineering is about numerical stability, not just architecture.</p>
</aside>

### MuZero-Family: Planning Without Knowing the Rules

MuZero learns three functions jointly: a representation function (observation to latent), a dynamics function (latent + action to next latent, reward), and a prediction function (latent to policy, value). Crucially, none of these are trained to reconstruct anything resembling the original observation — they are trained end-to-end only so that Monte Carlo Tree Search, run entirely inside the latent space, produces accurate value and policy estimates. EficientZero (2021) added self-supervised consistency losses and off-policy correction to make this approach practical with orders of magnitude less environment interaction, closing in on human sample eficiency on Atari.

<aside class="article-callout" role="note">
<p class="article-callout__label">Key Idea</p>
<p>MuZero’s dynamics model does not need to be interpretable or even physically meaningful to a human — it only needs to be useful for planning. This foreshadows the JEPA philosophy: prediction accuracy in an abstract space, not pixel-perfect reconstruction, is the objective that actually matters for downstream decision-making.</p>
</aside>

## The JEPA Family: Non-Generative World Models

### The Problem With Predicting Pixels

A model asked to predict the exact next video frame is forced to also predict unpredictable, task-irrelevant detail: the precise ripple pattern on water, the exact rustle of leaves, sensor noise. Spending capacity on these details is wasteful and can actively hurt the quality of the learned representation, because the model is graded on getting noise right rather than getting the important structure right. Yann LeCun's Joint Embedding Predictive Architecture (JEPA), first proposed around 2022, is built specifically to avoid this trap.

### I-JEPA and V-JEPA

I-JEPA (images) and V-JEPA / V-JEPA 2 (video) share the same skeleton:

- A context encoder processes a visible portion of the input (an image with regions masked

out, or the early frames of a clip).

- A target encoder (typically an exponential moving average copy of the context encoder,

never trained directly by gradient descent) encodes the masked-out region or future frames to produce a target representation.

- A predictor tries to predict the target encoder's output from the context encoder's output —

entirely in latent space, with no pixel decoder in the loss at all.

<figure class="native-diagram native-diagram--jepa" aria-labelledby="jepa-caption"><div class="native-diagram__flow"><div class="native-diagram__node"><span>Visible context</span><small>image regions or early video frames</small></div><div class="native-diagram__arrow" aria-hidden="true">→</div><div class="native-diagram__node"><strong>Context Encoder</strong></div><div class="native-diagram__arrow" aria-hidden="true">→</div><div class="native-diagram__node"><strong>Predictor</strong></div></div><div class="native-diagram__comparison"><div class="native-diagram__node"><span>Masked region / future frames</span><small>Target Encoder (EMA, no gradient)</small></div><span aria-hidden="true">⇅</span><strong>compare (loss)</strong></div><figcaption id="jepa-caption">JEPA training flow: a predictor estimates the target encoder’s representation of masked or future input from the context encoder’s visible-context representation.</figcaption></figure>

### V-JEPA 2 and Action-Conditioned Planning

V-JEPA 2 scales this recipe to roughly 1.2 billion parameters and over a million hours of unlabelled internet video, learning strong motion-understanding and action-anticipation representations purely self-supervised. A second, much smaller stage — V-JEPA2-AC — post-trains an action-conditioned predictor on a modest amount of robot interaction data, which is enough for the resulting model to plan robot manipulation actions in new environments with no environment-specific data collection or task-specific fine-tuning, a strong form of zero-shot transfer.

Meta paired the V-JEPA 2 release with three new physical-reasoning benchmarks: IntPhys 2 (physically plausible vs. impossible scenarios), MVPBench (visually similar clip pairs with opposite correct answers, which resists shortcut guessing), and CausalVQA (causal and counterfactual reasoning about video). Even the strongest 2026 models remain far from human performance on IntPhys 2, and V-JEPA 2's roughly 44% paired accuracy on MVPBench, while best-in-class, is far short of reliable physical common sense — a clear signal that “understanding physics” is still substantially unsolved.

## Generative Video Models as Implicit World Models

A separate lineage treats video generation itself as a form of world modelling: if a model can generate a plausible continuation of a scene, including how objects respond to implied forces, it has implicitly learned something like physics, even without any explicit latent-dynamics module.

- Diffusion-based generators (Sora, Veo, and similar systems) iteratively denoise a video clip

conditioned on text or an initial frame, and have been observed to exhibit emergent object permanence and rough physical plausibility over short clips, without ever being told a single physical law.

- Autoregressive frame-by-frame generators (Genie-style systems, discussed later)

instead generate the next frame conditioned on previous frames and an explicit user action, which is what makes them interactive rather than merely generative.

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>The practical distinction that matters most in 2026: pure video generators are typically not directly controllable frame-by-frame by a user’s real-time input, while interactive world models like Genie 3 are built specifically so that an action taken right now visibly changes the very next frame, at real-time frame rates.</p>
</aside>

### Comparing the Families

<div class="table-scroll"><table><thead><tr><th>Family</th><th>Predicts in</th><th>Trained via</th><th>Primarily used for</th></tr></thead><tbody><tr><td>Ha &amp; Schmidhuber (2018)</td><td>Pixels (VAE) + latent (RNN)</td><td>Reconstruction + next-latent prediction</td><td>Small-scale control, pedagogical clarity</td></tr><tr><td>Dreamer / PlaNet</td><td>Latent (RSSM)</td><td>Reconstruction + reward prediction</td><td>Sample-efficient model-based RL</td></tr><tr><td>MuZero / EfficientZero</td><td>Latent (unconstrained)</td><td>Value/policy/reward prediction only</td><td>Planning via search, no visual grounding needed</td></tr><tr><td>JEPA / V-JEPA(2)</td><td>Latent (embeddings)</td><td>Latent prediction, self-supervised, no pixels</td><td>Representation learning, zero-shot robot planning</td></tr><tr><td>Diffusion video (Sora/Veo)</td><td>Pixels</td><td>Denoising diffusion</td><td>Content generation, emergent physical plausibility</td></tr><tr><td>Interactive generators (Genie 3)</td><td>Pixels, autoregressive</td><td>Autoregressive next-frame + action conditioning</td><td>Real-time playable environments</td></tr></tbody></table></div>

The period from late 2025 through 2026 is when world models moved from research benchmarks into shipped products, well-funded startups, and a public rivalry with the LLM-scaling paradigm. This part is necessarily a snapshot: check primary sources for anything time-sensitive, since this is one of the fastest-moving corners of AI research.

## Google DeepMind Genie 3: Real-Time Interactive World Generation

Released in research preview in August 2025, Genie 3 generates navigable, photorealistic 3D-feeling environments directly from a text prompt or an image, rendering at roughly 24 frames per second in real time and holding visual consistency — object placement, layout, lighting — for several minutes of continuous interaction. DeepMind researchers describe it as the first real-time, interactive, general-purpose world model, distinguishing it from earlier systems that either generated static scenes or required heavy offline processing per clip. Notably, Genie 3 does not rely on any hard-coded physics engine or 3D asset pipeline: the sense of persistent geometry, gravity, and object permanence is learned entirely from data, then reproduced frame-by-frame conditioned on the user's actions. Google has begun productising this capability as Project Genie, an experimental tool (paired with the Nano Banana Pro image generator and Gemini) offered to Google AI Ultra subscribers, which turns a text prompt or photo into an explorable, game-like world. 2025–2026 Frontier The headline limitation is long-horizon consistency. “Several minutes” of stable memory is a real jump over the few seconds earlier interactive generators could hold, but it is still short of a full game session, and the characteristic failure mode — the world quietly forgetting its own geometry, a wall that was on the left drifting to the right — is what currently separates an impressive demo from a shippable product.

## World Labs' Marble: Editable 3D Worlds

World Labs (founded by computer-vision researcher Fei-Fei Li) released Marble, which takes a different technical path from Genie 3: instead of an implicit, autoregressive video stream, Marble constructs an explicit, editable 3D representation using Gaussian splatting, built from text, images, sketches, or video. Because the output is an editable mesh or splat scene rather than an opaque video stream, it can be exported into standard 3D tools (Unity, Unreal, Isaac Sim) for game development, VR/AR content, or robotics simulation — trading some of Genie's raw real-time interactivity for controllability and downstream tool compatibility.

## NVIDIA Cosmos: Open World Foundation Models

NVIDIA's Cosmos platform is a family of openly released “World Foundation Models” (WFMs) trained on large volumes of robotics and driving data, intended as a reusable simulation backbone that robotics and autonomous-vehicle teams can fine-tune rather than build from scratch. Cosmos-family models have been positioned as strong performers on physics-consistency benchmarks (for example, pose-estimation and reprojection-error metrics), reflecting NVIDIA's emphasis on physical fidelity for downstream sim-to-real transfer, complementing NVIDIA's own Alpamayo effort aimed at helping autonomous vehicles reason through rare, safety-critical scenarios.

## Meta's V-JEPA 2 in Production Contexts

Beyond the research result described earlier, V-JEPA 2-style representation-first world models are being positioned as a practical foundation for embodied AI: Mobileye's physical-AI stack, for instance, spans perception, world modelling, intent-aware planning, and control for robotaxi deployment, on the premise that a robot or vehicle needs an internal model of how its actions change the physical world, not just a classifier of what is currently in view.

## Yann LeCun's AMI Labs and the World-Models-versus-LLMs Debate

In 2026, Yann LeCun left Meta to found AMI Labs (Advanced Machine Intelligence), reportedly raising several hundred million dollars in early funding on the explicit thesis that large language models, however capable, cannot reach general intelligence through scaling alone, and that grounded, JEPA-style world models trained on sensory prediction are the more promising path. This is one of the more prominent bets in the field: a well-resourced, high-profile lab founded specifically to pursue the planner-view of world models over continued LLM scaling.

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>This is a genuinely contested claim within the AI research community, not a consensus position. Reasonable researchers disagree about whether current world-model architectures actually solve problems that scaled multimodal LLMs cannot, whether JEPA-style latent prediction meaningfully outperforms other self-supervised objectives at scale, and how much of the 2026 enthusiasm is driven by results versus by narrative and investment momentum. Treat this section as a description of an ongoing debate, not a settled outcome.</p>
</aside>

## The “Imagine-Then-Act” Robotics Pattern

A recurring two-stage design pattern has emerged for embodied AI in 2025–2026: a world model first generates an “imagined” rollout — a short predicted video or latent trajectory of what should happen — and a separate, much smaller Inverse Dynamics Model then translates that imagined trajectory into concrete motor commands for the actual robot. This decouples “what should happen” (a harder, more general prediction problem, reusable across many robot embodiments) from “how do I make my specific actuators do that” (an easier, embodiment-specific control problem), and is becoming a standard architecture for connecting large, general-purpose world models to specific physical hardware.

## Open Problems Going Into 2027

- Long-horizon drift. Every current interactive world model, from Genie 3 downward, degrades over sufficiently long rollouts — geometry shifts, objects disappear, or causal chains become incoherent. No system as of 2026 reliably holds a consistent world for an hour of interaction.

- The physical-plausibility gap. Benchmarks like IntPhys 2 show that even leading world

models remain close to chance at distinguishing physically possible from impossible scenarios, despite being fluent at generating visually convincing footage — a reminder that visual plausibility and physical correctness are not the same thing.

- Evaluation itself is unsettled. There is no single agreed-upon benchmark suite for “how

good is this world model,” and different labs optimise for different proxies (FPS and visual fidelity for Genie-style systems; zero-shot robot task success for JEPA-style systems; gamebenchmark scores for Dreamer-style systems), which makes cross-comparison genuinely difficult.

- Compute and data cost. Training internet-scale video world models remains extremely

expensive, and it is not yet clear how much of the recent progress is architecture versus simply more compute and better curated video data.

Reading about world models only gets you so far. This part walks through four progressively harder hands-on projects: reproducing the original 2018 recipe from scratch, running a modern production-grade library, probing a pretrained frontier model, and, finally, a short project idea using an open interactive-generation stack. All of it is runnable on a single reasonably modern GPU except where noted.

## Environment Setup

**Listing 1: Base environment for all four projects (adjust CUDA build as needed)**

```python
python3 -m venv wm-env && source wm-env/bin/activate
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install gymnasium[box2d] numpy matplotlib opencv -python tqdm
pip install transformers accelerate huggingface_hub
```

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>gymnasium[box2d] pulls in the CarRacing-v3 environment used in Project 1. If the Box2D wheel fails to build, install swig first (apt install swig on Debian/Ubuntu).</p>
</aside>

## Project 1: Rebuilding Ha & Schmidhuber's World Model on CarRacing

Goal: reproduce the three-stage V–M–C pipeline from Section 2.2 end to end. This project is small enough to run on a laptop GPU (or slowly on CPU) and is the best way to build real intuition for “training an agent inside its own dream.” Stage V — collect data and train the VAE.

**Listing 2: Rollout collection and a minimal convolutional VAE**

```python
import gymnasium as gym
import numpy as np, torch, torch.nn as nn

env = gym.make("CarRacing -v3", continuous=True)

def collect_random_rollouts(n_episodes=1000, max_steps=300):
frames = []
for _ in range(n_episodes):
obs, _ = env.reset()
for _ in range(max_steps):
action = env.action_space.sample()
obs, _, terminated , truncated , _ = env.step(action)
frames.append(obs) # 96x96x3 uint8
if terminated or truncated:
break
return np.array(frames, dtype=np.uint8)

class ConvVAE(nn.Module):
def __init__(self, z_dim=32):
super().__init__()
self.enc = nn.Sequential(
nn.Conv2d(3, 32, 4, 2), nn.ReLU(),
nn.Conv2d(32, 64, 4, 2), nn.ReLU(),
nn.Conv2d(64, 128, 4, 2), nn.ReLU(),
nn.Conv2d(128, 256, 4, 2), nn.ReLU(), nn.Flatten())
self.fc_mu = nn.Linear(2 * 2 * 256, z_dim)
self.fc_logvar = nn.Linear(2 * 2 * 256, z_dim)
# decoder mirrors the encoder with transposed convolutions (omitted for
```

brevity) 29 30 def encode(self, x): 31 h = self.enc(x) 32 return self.fc_mu(h), self.fc_logvar(h) 33 34 def reparameterize(self, mu, logvar): 35 std = torch.exp(0.5 * logvar) 36 return mu + std * torch.randn_like(std) Stage M — train an MDN-RNN on the latent sequences. Encode every collected frame with the frozen VAE, then train a recurrent network (LSTM is fine) with a mixture-density output head to predict p(zt+1 | zt,at,ht), exactly the M model from Section 2.2. Stage C — evolve a tiny controller. With V and M frozen, train a single linear layer mapping [zt,ht] → at using CMA-ES (the cma PyPI package is a drop-in fit) against cumulative reward, either in the real environment or, for the full “dream training” experience, entirely inside rollouts imagined by M.

<aside class="article-callout" role="note">
<p class="article-callout__label">Try It Yourself</p>
<p>Before writing your own MDN-RNN and CMA-ES loop from scratch, look at ADGEfficiency/world-models, a clean TensorFlow 2 reimplementation of the original paper with pretrained checkpoints, and flydexo/world-models-carracing-v3 on Hugging Face for a PyTorch version with reported reward matching the original paper (roughly 906 in the paper vs. 916 reproduced). Reading a faithful reimplementation before writing your own is the fastest way to debug your own version when it inevitably breaks.</p>
</aside>

## Project 2: Running DreamerV3 on a Gym Environment

Rather than reimplementing DreamerV3's RSSM and symlog machinery, use Danijar Hafner's reference implementation directly.

**Listing 3: Installing and running the official DreamerV3 repository**

```python
git clone https://github.com/danijar/dreamerv3.git
cd dreamerv3
pip install -U -r requirements.txt

# Train on Crafter , a fast open-world survival benchmark
python dreamerv3/main.py \
--logdir ~/logdir/dreamer/crafter \
--configs crafter \
--run.train_ratio 32
```

Point a plotting script at the logdir's scalar summaries (or use tensorboard –logdir) to watch the world-model loss and the actor-critic's imagined vs. real returns converge over training. As a follow-up exercise, swap the –configs flag to a continuous-control suite (for example dmc_vision) and compare how many environment steps DreamerV3 needs to reach a competent policy versus a model-free baseline like PPO or SAC on the same task — this is the most direct way to feel the sample-eficiency argument for model-based RL in your own hands.

<aside class="article-callout" role="note">
<p class="article-callout__label">Note</p>
<p>If JAX/GPU setup is painful on your machine, NM512/dreamerv3-torch is a well-regarded PyTorch reimplementation with the same configs, useful if your existing tooling is PyTorch-centric.</p>
</aside>

## Project 3: Probing V-JEPA 2 as a Pretrained Feature Extractor

V-JEPA 2 checkpoints are published on Hugging Face and wired into transformers, so you can extract its learned video representations without any training of your own.

**Listing 4: Loading V-JEPA 2 and extracting embeddings from a short video clip**

```python
from transformers import AutoVideoProcessor , AutoModel
import torch, numpy as np

model_id = "facebook/vjepa2 -vitl-fpc64 -256" # check the V-JEPA 2 HF collection
```

for size variants 5 processor = AutoVideoProcessor.from_pretrained(model_id) 6 model = AutoModel.from_pretrained(model_id).eval() 7 8 # `clip` is a list of numpy RGB frames (T, H, W, 3), uint8 9 def embed_clip(clip): 10 inputs = processor(clip, return_tensors="pt") 11 with torch.no_grad(): 12 outputs = model(**inputs) 13 return outputs.last_hidden_state.mean(dim=1) # pooled clip-level embedding 14 15 # Suggested exercise: embed short clips of the SAME action performed at different 16 # speeds or camera angles, then check embedding cosine similarity -- V-JEPA 2's 17 # selling point is that action *identity* should cluster even when low-level 18 # pixels vary substantially.

<aside class="article-callout" role="note">
<p class="article-callout__label">Try It Yourself</p>
<p>Two concrete follow-on exercises: (1) fine-tune a small linear probe on top of frozen V-JEPA 2 embeddings for an action-recognition dataset (Something-Something-v2 or a small custom clip set) and compare accuracy against a linear probe on a plain ResNet/ViT trained supervised on ImageNet; (2) if you have access to a robot arm simulator (PyBullet, MuJoCo, or Isaac Sim), attempt a minimal reproduction of the “imagine-then-act” pattern: use V-JEPA 2 embeddings to score candidate short action sequences by predicted-vs-goal latent distance, and execute the best-scoring one, a toy version of V-JEPA2-AC.</p>
</aside>

## Project 4: Experimenting With Open Interactive World Generation

Genie 3 and Marble are not open-weight, so a fully faithful hands-on reproduction is not possible today. Two productive substitutes:

- Diffusion-based “world models” for games. Several open research projects (search for

“diffusion world model” and “neural game engine” on GitHub and arXiv) train a diffusion model to predict the next game frame conditioned on the previous frames and the player's action, on classic game footage (Doom and Atari-scale environments are common because they are small enough to train on a single GPU). Reproducing even a low-resolution, short-horizon version of this on a simple game is a very direct, tangible way to feel the difference between the JEPA philosophy (Project 3) and the generative-pixel philosophy discussed in Section 6.

- NVIDIA Cosmos. NVIDIA has released open Cosmos World Foundation Model checkpoints

and tooling aimed at robotics and driving simulation; if your interest is closer to embodied AI/simulation than to game generation, working through NVIDIA's published Cosmos quickstart and fine-tuning it on a small custom robot-camera dataset is a closer match to how these models are used in industry in 2026 than a from-scratch reimplementation would be.

## An 8-Week Study Plan

<div class="table-scroll"><table><thead><tr><th>Week</th><th>Focus</th></tr></thead><tbody><tr><td>1–2</td><td>Read the foundations; skim the original Ha &amp; Schmidhuber paper and its interactive web version; get gymnasium and CarRacing-v3 running locally.</td></tr><tr><td>3</td><td>Complete Project 1 (VAE + MDN-RNN + CMA-ES controller); confirm your trained controller beats a random-action baseline.</td></tr><tr><td>4</td><td>Read latent-space model-based reinforcement learning in full; read the DreamerV3 paper's method section alongside the code in danijar/dreamerv3.</td></tr><tr><td>5</td><td>Complete Project 2; compare DreamerV3's sample efficiency against a model-free baseline on the same task.</td></tr><tr><td>6</td><td>Read the JEPA family closely; read the V-JEPA 2 blog post and skim the IntPhys 2 / MVPBench / CausalVQA benchmark papers.</td></tr><tr><td>7</td><td>Complete Project 3; write a short internal note comparing what V-JEPA 2's embeddings capture versus what a Dreamer-style RSSM latent captures.</td></tr><tr><td>8</td><td>Read the frontier material in full; pick one open problem and write a one-page position note on how you would attempt to measure or address it.</td></tr></tbody></table></div>

## Curated Reading List and Repositories

<div class="table-scroll"><table><thead><tr><th>Resource</th><th>Why it’s useful</th></tr></thead><tbody><tr><td>Ha &amp; Schmidhuber, <em>World Models</em> (2018), plus its interactive companion site</td><td>The paper that named the field; the interactive site lets you watch the V/M/C loop directly in-browser.</td></tr><tr><td>Hafner et al., PlaNet (2019), Dreamer (2020), DreamerV2 (2021), DreamerV3 (2023)</td><td>The full model-based RL lineage; read in order to see exactly which design choice each successor changed.</td></tr><tr><td>danijar/dreamerv3 (GitHub)</td><td>Official reference implementation used in Project 2.</td></tr><tr><td>NM512/dreamerv3-torch (GitHub)</td><td>Community PyTorch port, useful if your stack is not JAX-based.</td></tr><tr><td>ADGEfficiency/world-models (GitHub)</td><td>Clean TensorFlow 2 reimplementation of the 2018 paper for Project 1.</td></tr><tr><td>Meta AI, “V-JEPA 2: A World Model for Planning and Robotics” (blog + paper, 2025)</td><td>Primary source for V-JEPA 2 and Project 3; includes links to the IntPhys 2, MVPBench, and CausalVQA benchmarks.</td></tr><tr><td>facebook/vjepa-2 model collection (Hugging Face)</td><td>Pretrained checkpoints used directly in Project 3.</td></tr><tr><td>DeepMind, Genie 3 research blog post (2025)</td><td>Primary source for Genie 3; no open weights, but the technical report is worth reading in full.</td></tr><tr><td>NVIDIA Cosmos documentation and model cards</td><td>Primary source for NVIDIA Cosmos and the Project 4 extension.</td></tr><tr><td>Schrittwieser et al., MuZero (2019); Ye et al., EfficientZero (2021)</td><td>Primary sources for MuZero; best read after you are comfortable with basic MCTS.</td></tr></tbody></table></div>

### Glossary

<dl><dt>Latent state</dt><dd>A compressed, learned numerical representation of an observation, typically far smaller than the raw pixels it was derived from.</dd><dt>Dynamics / transition model</dt><dd>The learned function that predicts how the latent state changes over time, usually conditioned on an action.</dd><dt>RSSM</dt><dd>Recurrent State-Space Model; a latent-dynamics architecture combining a deterministic recurrent path with a stochastic latent variable, used in PlaNet and the Dreamer family.</dd><dt>Imagination / rollout</dt><dd>A sequence of predicted future states generated entirely by a world model, without touching the real environment, used to train or evaluate a policy cheaply.</dd><dt>JEPA</dt><dd>Joint Embedding Predictive Architecture; a family of models trained to predict a target’s latent embedding from a context’s latent embedding, avoiding pixel-level reconstruction.</dd><dt>EMA target encoder</dt><dd>An encoder whose weights are an exponential moving average of another encoder’s weights, updated without direct gradient descent; used in JEPA-style architectures to provide a stable prediction target.</dd><dt>Autoregressive generation</dt><dd>Generating a sequence (frames, tokens) one step at a time, each conditioned on everything generated so far, and, in interactive world models, on the user’s action as well.</dd><dt>World Foundation Model (WFM)</dt><dd>A large, broadly pretrained world model (as in NVIDIA Cosmos) intended to be fine-tuned for many specific downstream robotics or simulation tasks rather than used as-is.</dd><dt>Inverse Dynamics Model</dt><dd>A model that maps a desired state transition back to the concrete low-level action (e.g., motor torques) that would cause it; pairs with a world model in the “imagine-then-act” pattern.</dd></dl>
