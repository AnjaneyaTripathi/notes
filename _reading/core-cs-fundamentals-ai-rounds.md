---
layout: post
title: "Core CS Fundamentals for “AI” Rounds — Design Patterns (Singleton et al.), OOP, Easy Coding"
date: 2026-08-29
order: 2
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Core CS Fundamentals for “AI” Rounds — Design Patterns (Singleton et al.), OOP, Easy Coding

Patterns (Singleton et al.), OOP, Easy Coding

### Why this shows up in an “AI Engineer” interview at all

Worth understanding the framing so you're not caught off guard: an “AI Engineer” role at a consulting firm is still fundamentally a software engineering role that happens to work with LLMs/GenAI components. You'll be writing production Python/full-stack code (many such JDs explicitly mention Java/React/Node too), integrating with APIs, managing state, and shipping deployable systems — so baseline CS fundamentals get sanity-checked alongside the GenAI-specific material. Don't let a whole prep cycle on RAG/agents make you rusty here — this is reportedly an easy, low-effort place to lose points if neglected.

### Singleton Pattern — the specifically flagged one, know it cold

What it is: a creational design pattern that restricts a class to having exactly one instance for the lifetime of the application, and provides a single, well-known global access point to that instance. Why/when you'd actually use it (this “why” matters more than reciting the definition):

<ul>
  <li>When you need exactly one shared resource coordinating access across your whole application — e.g., a database connection pool, a configuration/settings object, a logging service, or (very relevant to your AI role) a loaded ML model or embedding model instance — model loading is expensive (memory + time), so you want to load it once and reuse the same instance everywhere rather than re-instantiating it per request.</li>
  <li>When global state consistency matters — e.g., a single cache instance that all parts of the app read/write to, so they&#39;re never out of sync with each other. Python implementation (be ready to write this on a whiteboard or live): class ModelSingleton: _instance = None def __new__(cls, *args, **kwargs): if cls._instance is None: cls._instance = super().__new__(cls) cls._instance._initialized = False return cls._instance def __init__(self, model_path=None): if self._initialized: return # avoid re-running expensive init on repeat calls self.model_path = model_path self.model = self._load_model(model_path) # expensive — only happens once self._initialized = True</li>
</ul>

def _load_model(self, path): print(f"Loading model from {path}... (expensive operation)") return f"model_object_from_{path}" # usage m1 = ModelSingleton("embeddings-v1") m2 = ModelSingleton("embeddings-v2") # note: path is ignored — same instance returned print(m1 is m2) # True — same object, model only loaded once Key mechanics to explain if asked “how does this work”:

<ul>
  <li>__new__ is what actually controls object creation in Python (unlike __init__, which only initializes an already-created object) — overriding __new__ to return the existing _instance if one exists is the actual enforcement mechanism.</li>
  <li>The _initialized guard prevents __init__ from re-running expensive setup logic every time the class is “instantiated” again (since Python still calls __init__ after __new__ returns, even for an existing instance). A simpler, more Pythonic alternative worth mentioning (shows depth beyond textbook GoF pattern): “In Python specifically, you often don&#39;t need the classic __new__-based singleton — a module itself is a singleton by nature (Python only imports/executes a module once, caching it), so a simple module-level instance, or using functools.lru_cache/@cache on a factory function, achieves the same effect more idiomatically. I&#39;d only reach for the explicit class-based pattern if I needed it to work in a context where that idiom doesn&#39;t fit, like matching a specific interface.” Known criticisms of singleton (good to proactively mention — shows balanced judgment, not just pattern-memorization):</li>
  <li>Testing dificulty: global shared state makes unit tests harder to isolate — tests can leak state into each other unless you explicitly reset the singleton between tests.</li>
  <li>Hidden dependencies: code that relies on a singleton doesn&#39;t declare that dependency explicitly (vs. dependency injection, where a class&#39;s constructor makes its dependencies visible) — this can make code harder to reason about and refactor.</li>
  <li>Concurrency concerns: in multi-threaded contexts, naive singleton implementations have race conditions during first-time creation (two threads could both see _instance is None simultaneously) — production implementations need thread-safety (e.g., a lock around the creation check, or Python&#39;s GIL-adjacent nuances if relevant to the language). Because of these downsides, many modern codebases prefer dependency injection (explicitly passing a shared instance into whatever needs it) over the classic singleton pattern, while still achieving the “one shared instance” goal. Good full answer if simply asked “what&#39;s the singleton pattern and when would you use it”: “Singleton restricts a class to a single instance, accessed globally. I&#39;ve used the pattern conceptually for things like a shared configuration object or a loaded ML model — you don&#39;t want to reload an embedding model on every request, so you load it once and reuse the instance. In Python I&#39;d lean toward simpler idioms like a module-level instance or lru_cache over the classic __new__-based implementation unless I specifically needed to match an interface. It&#39;s worth knowing the pattern has real downsides — it introduces global state, which complicates testing and creates</li>
</ul>

hidden dependencies — so in a larger production codebase I'd often prefer dependency injection to get the same `one shared instance' benefit more explicitly and testably.”

### Other design patterns worth having ready (brief — you likely won't need

deep detail on these, but recognize and place them) Pattern Category One-line idea Where it shows up in AI/backend work Factory Creational A method/class that creates objects without exposing the exact instantiation logic to the caller Creating the right LLM client (OpenAI vs. Anthropic vs. Azure) based on config, without the calling code needing to know which Builder Creational Constructs a complex object step-by-step via chained method calls, instead of one giant constructor Building up a complex prompt, a multi-step pipeline config, or a request object with many optional parameters Strategy Behavioral Encapsulates interchangeable algorithms behind a common interface, swappable at runtime Swapping chunking strategies, retrieval strategies (BM25 vs. dense vs. hybrid — the earlier discussion!), or decoding strategies (greedy vs. sampling — the earlier discussion!) behind one consistent interface Observer Behavioral Subscribers get notified automatically when a subject's state changes Event-driven pipelines — e.g., notifying downstream steps/logging/monitoring when an agent completes a step Decorator Structural Wraps an object to add behavior without modifying its underlying class Adding retry logic, caching, or logging around an LLM API call without changing the call itself — Python decorators (@retry, @cache) are a direct, literal example

Pattern Category One-line idea Where it shows up in AI/backend work Adapter Structural Converts one interface into another expected interface Wrapping different LLM providers' differing APIs behind one common interface your app code calls consistently Noticing the pattern here is itself a good interview insight to voice: “A lot of these map naturally onto things I'd already do in an AI pipeline — Strategy pattern is basically how I'd think about making retrieval or decoding methods swappable, and Adapter is how I'd normalize different LLM providers behind one interface.” Connecting patterns back to concrete AI-pipeline examples (rather than reciting textbook definitions) is what makes this land as engineering judgment, not memorization.

### OOP fundamentals (quick refresher — unlikely to be grilled deeply, but

should be instant recall)

<ul>
  <li>Encapsulation: bundling data and the methods that operate on it together, and restricting direct external access to internal state (e.g., private attributes accessed via methods/properties).</li>
  <li>Abstraction: exposing only relevant/necessary interfaces while hiding implementation complexity (e.g., calling .generate() on an LLM client without needing to know the HTTP/auth details underneath).</li>
  <li>Inheritance: a class deriving shared structure/behavior from a parent class, specializing/overriding as needed.</li>
  <li>Polymorphism: different classes being usable through a common interface, each providing its own specific behavior (e.g., different tool classes all implementing a common .run() method so an agent&#39;s orchestration code doesn&#39;t need to know which specific tool it&#39;s calling).</li>
</ul>

### SOLID principles (brief — good to name-drop if design quality comes up)

<ul>
  <li>Single Responsibility — a class/module should have one reason to change.</li>
  <li>Open/Closed — open for extension, closed for modification (add new behavior without editing existing tested code — Strategy/Decorator patterns support this directly).</li>
  <li>Liskov Substitution — subclasses should be substitutable for their base class without breaking correctness.</li>
  <li>Interface Segregation — prefer several small, specific interfaces over one large, generalpurpose one.</li>
  <li>Dependency Inversion — depend on abstractions, not concrete implementations (this is the principle behind preferring dependency injection over singletons, from the earlier discussion).</li>
</ul>

### Easy coding — the style of problems reported (LeetCode-easy, problemsolving

check, not deep DSA) Candidate reports mention things like “missing number” and basic array manipulation — the bar here is demonstrating clean, correct problem-solving, not algorithmic sophistication. A couple of

patterns worth having fresh: Missing number in an array (1 to n, one missing): def find_missing_number(nums, n): expected_sum = n * (n + 1) // 2 actual_sum = sum(nums) return expected_sum - actual_sum Talk through it: “Sum of 1 to n has a closed form, so the missing number is just that expected total minus the actual sum of what's present — O(n) time, O(1) space.” (Also mention the XOR alternative if asked for a second approach: XOR-ing all numbers 1..n with all array elements cancels out every pair, leaving only the missing number — useful if avoiding overflow matters more than readability.) General posture for easy coding questions:

<ol>
  <li>Clarify constraints out loud first (can the array be empty? duplicates allowed? sorted?) — this alone signals engineering maturity.</li>
  <li>State the brute-force approach first, then optimize — don&#39;t jump straight to the clever solution silently.</li>
  <li>Narrate time/space complexity explicitly once you land on an approach.</li>
  <li>Write clean, readable code over “clever” code — variable names, no unnecessary one-liners.</li>
</ol>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between __new__ and __init__ in Python?</p>
    <p class="interview-qa__answer"><strong>A.</strong> __new__ is responsible for actually creating and returning a new instance (it&#39;s a static-like method called before the object exists); __init__ initializes an already-created instance&#39;s attributes and doesn&#39;t return anything. Singleton implementations override __new__ specifically because that&#39;s the step that controls whether a genuinely new object gets created or an existing one gets returned.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Is singleton thread-safe by default?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — a naive implementation has a race condition where two threads can both pass the “does an instance exist?” check simultaneously before either creates one, resulting in two instances. Thread-safe versions add locking around the creation check (or use language/framework-specific safe patterns).</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why might you avoid singleton in favor of dependency injection?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Singleton introduces implicit global state and hidden dependencies, which makes unit testing harder (state can leak between tests) and makes a class&#39;s true dependencies less visible from its constructor. Dependency injection achieves the same “shared single instance” outcome while keeping dependencies explicit and each component more independently testable.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Time/space complexity of the missing-number solution above?</p>
    <p class="interview-qa__answer"><strong>A.</strong> O(n) time (one pass to sum the array), O(1) extra space (just a running sum and the closed-form calculation) — no auxiliary data structures needed.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What design pattern would you use to support swapping between different LLM providers (OpenAI, Anthropic, Azure) behind one interface?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Adapter pattern (normalize each provider&#39;s distinct API into one common interface my application code calls) combined with Factory (a creation function that returns the right adapter instance based on config) — this is

a very natural real answer since it&#39;s exactly the kind of abstraction a multi-provider GenAI system needs.</p>
  </div>
</section>
