---
layout: post
title: "Embeddings, Vector Representation, and Vector Size"
date: 2026-09-11
order: 15
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Embeddings, Vector Representation, and Vector Size

### What is an embedding? (Your 30-second answer)

An embedding is a way of representing a piece of data — a word, sentence, document, image, or even a user/product — as a fixed-length vector of real numbers in a continuous vector space, such that semantically similar items end up close together in that space (by some distance metric) and dissimilar items end up far apart. The key idea: raw data (text, pixels) isn't something a model can do math on directly. Embeddings convert it into a numeric form that preserves meaning — geometrically. “King” and “Queen” aren't just close in space; the relationship between them (a direction/offset) can also carry meaning (the classic king man + woman queen example from word2vec). Say this if asked to define it simply: “An embedding maps an object to a point in a highdimensional numeric space, designed so that distance in that space reflects semantic or functional similarity in the real world.”

### Why do we need embeddings at all?

Neural networks and similarity search operate on numbers, not raw text. One-hot encoding (each word = a giant sparse vector with a single 1) is:

<ul>
  <li>Extremely high-dimensional (vocab size can be 50k–100k+)</li>
  <li>Sparse (mostly zeros) →wasteful</li>
  <li>Carries no semantic information — “cat” and “dog” are exactly as “different” as “cat” and “airplane” in one-hot space (cosine similarity = 0 for any two distinct one-hot vectors) Embeddings solve this by learning a dense, low(er)-dimensional representation where distance = meaning. This “sparse vs dense” framing is a very common interview follow-up: “Why not just use one-hot encoding?”</li>
</ul>

### How is text converted into a vector? (End-to-end mental model)

This is the pipeline you should be able to narrate fluently — interviewers (per candidate reports) explicitly ask for this end-to-end flow:

<ol>
  <li>Tokenization — split raw text into tokens (words, subwords via BPE/WordPiece/SentencePiece, or characters). Modern LLMs use subword tokenization so rare/unseen words can still be represented as combinations of known subword pieces.</li>
  <li>Token ID lookup — each token maps to an integer ID via a vocabulary.</li>
</ol>

<ol>
  <li>Embedding lookup / encoding — each token ID is mapped to a vector via an embedding matrix (shape: vocab_size × embedding_dim). This matrix is learned during training.</li>
  <li>Contextualization (for modern models) — the token embeddings pass through transformer layers (self-attention) so each token&#39;s vector becomes context-aware. This is the key difference from older static embeddings (as discussed below).</li>
  <li>Pooling (for sentence/document embeddings) — if you need a single vector for a whole sentence/paragraph, you pool the contextualized token vectors: mean pooling, [CLS] token, or a dedicated pooling head trained specifically for this (e.g., Sentence-BERT).</li>
  <li>Output: a fixed-size dense vector, e.g., 384, 768, 1536, or 3072 numbers (floats), regardless of how long the input text was. Say this if asked “walk me through how a sentence becomes an embedding”: “Preprocess and tokenize the text into subwords, look up initial embeddings from the model&#39;s embedding matrix, pass them through the transformer&#39;s self-attention layers so each token&#39;s representation captures context, then pool across tokens — commonly mean-pooling or a CLS token — to get one fixed-size vector representing the whole input.”</li>
</ol>

### Vector size (dimensionality) — what determines it, and why it varies

This is the exact phrase from your prep list, so be precise here. The core answer: Vector size is an architectural choice baked into the embedding model at training time — it's a fixed hyperparameter of that specific model, not something you choose at inference time (with one exception — see Matryoshka embeddings below). You cannot mix-and-match dimensions across different models; a 768-dim BERT vector and a 1536-dim OpenAI vector are not comparable or interchangeable. What actually determines the size, when the model is being designed: Factor Effect Model capacity / hidden size Larger transformer hidden dimension → typically larger output embedding size. Embedding dim is often tied to (or a projection from) the model's internal hidden state size. Expressiveness vs. cost tradeoff More dimensions = more capacity to encode fine-grained semantic distinctions, but higher memory, storage, and compute cost for similarity search (especially at scale). Training objective Models trained with contrastive learning objectives (e.g., Sentence-BERT, OpenAI's embedding models) are specifically optimized so a chosen fixed dimension captures sentence-level semantics well — this is a deliberate design decision, not incidental.

Factor Effect Downstream use case Search/retrieval systems often prefer smaller dims (faster, cheaper at scale — millions/billions of vectors); tasks needing very fine semantic resolution (e.g., legal/medical retrieval) may justify larger dims. Storage/latency constraints Real production systems explicitly trade off recall quality vs. index size vs. query latency when picking (or picking a model with) a given dimensionality. Common real-world sizes to know cold (interviewers like when you know actual numbers): Model Typical embedding dimension word2vec / GloVe (classic, static) 100–300 BERT-base 768 BERT-large 1024 Sentence-BERT (all-MiniLM-L6-v2) 384 Sentence-BERT (all-mpnet-base-v2) 768 OpenAI text-embedding-3-small 1536 (configurable down via Matryoshka) OpenAI text-embedding-3-large 3072 (configurable down via Matryoshka) Cohere embed-v3 1024 Google text-embedding-004 / Gecko 768 Matryoshka Representation Learning (worth name-dropping): Newer models (OpenAI v3, Nomic, some Cohere models) are trained so that truncating the vector (e.g., taking just the first 256 of 1536 dimensions) still yields a valid, usably-good embedding, with graceful quality degradation. This lets you trade off storage/speed vs. accuracy without retraining or re-embedding — you just slice the vector. This is a great “I know something recent” answer if the topic of dimensionality tradeoffs comes up. One-liner if asked “how is vector size determined?”: “It's fixed by the embedding model's architecture — set during training, usually tied to the model's hidden layer size and the capacity/cost tradeoff the model creators chose. You pick a model, and the dimensionality comes with it. Some newer models like OpenAI's text-embedding-3 use Matryoshka training so you can truncate the vector post-hoc to trade accuracy for speed/storage.”

### Static vs. Contextual embeddings (common conceptual trap question)

<ul>
  <li>Static embeddings (word2vec, GloVe): one fixed vector per word, regardless of context. “Bank” (river) and “bank” (money) get the same vector. Trained via co-occurrence statistics or shallow prediction tasks (skip-gram/CBOW for word2vec).</li>
  <li>Contextual embeddings (BERT, GPT, modern sentence transformers): the vector for a word/token changes depending on surrounding context, because it&#39;s produced by passing through self-attention layers. “Bank” in “river bank” vs. “bank account” gets different vectors.</li>
</ul>

Interviewers may ask you to explain why this matters for RAG: contextual embeddings let a retrieval system disambiguate meaning that a bag-of-words or static-embedding system would conflate.

### How the “vector value” is actually learned (calculation, at a conceptual level)

You don't need to derive backprop math, but you should be able to say:

<ul>
  <li>Embeddings are learned parameters, optimized via gradient descent like any other neural network weight, driven by a training objective.</li>
  <li>For word2vec-style models: the objective is predicting context words from a target word (skipgram) or vice versa (CBOW) — words that appear in similar contexts end up with similar vectors (“distributional hypothesis”: a word is characterized by the company it keeps).</li>
  <li>For modern sentence/document embedding models: the dominant approach is contrastive learning — the model is trained on pairs/triplets of (similar, dissimilar) examples, with a loss function (e.g., InfoNCE, triplet loss) that pulls similar-pair embeddings closer together and pushes dissimilar pairs apart in vector space.</li>
  <li>For LLM-derived embeddings: often the embedding is taken from an intermediate or final hidden layer of a transformer that was trained on a language modeling objective (next-token prediction) or specifically fine-tuned afterward for retrieval/similarity tasks.</li>
</ul>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between an embedding and a one-hot vector?</p>
    <p class="interview-qa__answer"><strong>A.</strong> One-hot is sparse, dimension = vocab size, and carries no similarity information — every pair of distinct words is equidistant. An embedding is dense, much lower-dimensional, and learned so that distance encodes semantic similarity.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Does a longer sentence produce a longer embedding vector?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — that&#39;s a common misconception to correct confidently. The embedding dimensionality is fixed by the model regardless of input length (a word, a sentence, or a whole paragraph all produce e.g. a 768-dim vector). What changes with longer input is the amount of information compressed into that fixed-size vector, and the intermediate per-token representations before pooling.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Can you compare embeddings from two different models directly (e.g., a 768-dim BERT vector to a 1536-dim OpenAI vector)?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — different models live in different, incompatible vector spaces even if dimensions matched by coincidence. You must use the same embedding model consistently for both your indexed data and your queries.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If you had to pick an embedding model for a production RAG system, what would you consider?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Retrieval quality (benchmarked e.g. on MTEB), embedding dimension (cost/latency at your expected index size), context window (how much text can be embedded in one call), domain fit (general vs. domain-specific like legal/medical/code), and whether you need multilingual support. This is a good moment to mention the RAG tradeoff discussion this interviewer&#39;s team is known to probe.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the “curse of dimensionality” as it relates to embeddings?</p>
    <p class="interview-qa__answer"><strong>A.</strong> As dimensionality grows very high, distance metrics can become less discriminative (points tend to become more equidistant from each other), and storage/compute cost for similarity search grows. This is part of why practical embedding models converge on the few-hundred-to-few-thousand dimension range

rather than going arbitrarily large, and why techniques like Matryoshka/dimensionality reduction (PCA, quantization) matter in production.</p>
  </div>
</section>
