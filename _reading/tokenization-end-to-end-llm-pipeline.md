---
layout: post
title: "Tokenization & the End-to-End LLM Pipeline"
date: 2026-09-14
order: 18
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Tokenization & the End-to-End LLM Pipeline

(Preprocess → Tokenize → Embed → Inference → Postprocess)

### What is tokenization, and why not just split on spaces?

Tokenization is the process of breaking raw text into smaller units (“tokens”) that a model's vocabulary can map to integer IDs. It's the very first step that turns human text into something a neural network can consume. Why not just split on whitespace/words?

<ul>
  <li>Vocabulary explosion: every inflection (run, running, runs, ran) and every typo/rare word becomes its own vocabulary entry — vocab size balloons, most words are seen too rarely to learn good representations for, and the model can&#39;t handle any word it hasn&#39;t seen before (out-of-vocabulary problem).</li>
  <li>Doesn&#39;t generalize across languages well — some languages (Chinese, Japanese, Thai) don&#39;t use spaces to separate words at all. Say this if asked to define it: “Tokenization converts raw text into a sequence of discrete units — words, subwords, or characters — that map to IDs in the model&#39;s vocabulary. Modern LLMs use subword tokenization so any string, including unseen or rare words, can still be represented as a sequence of known pieces, avoiding the out-of-vocabulary problem entirely.”</li>
</ul>

### Tokenization strategies — the spectrum, and why subword won

Level Example (“unbelievable”) Pros Cons Character-level u, n, b, e, l, . . . Tiny vocab (~100 chars), zero OOV issues Very long sequences →expensive; loses word-level meaning, harder for the model to learn Word-level unbelievable (one token) Intuitive, short sequences Huge vocab, OOV problem, doesn't share structure between related words (believe, believable, unbelievable are unrelated tokens)

Level Example (“unbelievable”) Pros Cons Subword-level (the modern standard) un, believ, able Balances vocab size and sequence length; shares subword structure across related/rare words; virtually no OOV (falls back to smaller pieces or bytes) Slightly more complex to implement/train Subword algorithms to know by name:

<ul>
  <li>BPE (Byte-Pair Encoding) — used by GPT-family models. Starts from characters/bytes, iteratively merges the most frequent adjacent pair into a new token, repeated until reaching target vocab size. Purely frequency-driven.</li>
  <li>WordPiece — used by BERT. Similar iterative merging to BPE, but merges are chosen to maximize the likelihood of the training data under a unigram language model, not just raw frequency.</li>
  <li>SentencePiece / Unigram LM — used by T5, LLaMA, many multilingual models. Treats tokenization as a probabilistic model over subword units, and importantly operates directly on raw text including whitespace as a symbol, so it&#39;s language-agnostic (works for languages without spaces, like Japanese) and doesn&#39;t require pre-splitting on whitespace at all. Good tradeoff answer if asked “why do LLMs use subword tokenization instead of words?”: “It&#39;s the best middle ground — you get a manageable, fixed vocabulary size (typically 30k–100k+ tokens) while still being able to represent any input, including rare words, typos, or new terms, by decomposing them into familiar subword pieces. It also lets the model share statistical strength across related words that share subwords, like `token&#39;, `tokenize&#39;, and `tokenization&#39;.”</li>
</ul>

### A concrete mechanical example (BPE, simplified)

Good to have a mini-example ready to narrate: Start with a corpus split into characters, with word-boundary markers, e.g. l o w e r, l o w e s t, n e w e s t, w i d e s t.

<ol>
  <li>Count all adjacent character pairs across the corpus.</li>
  <li>Merge the most frequent pair (say e + s →es) into a new token.</li>
  <li>Re-count, merge the next most frequent pair (say es + t →est).</li>
  <li>Repeat until you hit your target vocabulary size. End result: common suffixes like est become single tokens, while rare/unseen words just get chopped into more, smaller pieces — the model never truly “fails” on new input, it just tokenizes it less efficiently (more tokens = more compute, but never an outright error).</li>
</ol>

### Special tokens (small detail, frequently glossed over — don't skip it)

<ul>
  <li>[CLS] / &lt;s&gt; — a special token prepended to input, often used (in BERT-style models) as the aggregate sequence representation for classification tasks.</li>
  <li>[SEP] / &lt;/s&gt; — separates two segments (e.g., question vs. context) or marks end-of-sequence.</li>
  <li>[PAD] — padding token, used to make all sequences in a batch the same length; models use an attention mask to ignore padding positions during computation.</li>
  <li>[UNK] — fallback for truly unrepresentable tokens (rare with subword tokenization, but still exists as a safety net in some schemes).</li>
  <li>[MASK] — used specifically in masked-language-model pretraining (BERT) — a token is hidden and the model must predict it.</li>
</ul>

### The full end-to-end pipeline (this is the exact narrative interviewers ask for — have it fluent)

<ol><li><strong>Preprocessing</strong><ul><li>Raw text cleanup: normalize unicode, handle casing (some models lowercase, some are case-sensitive), strip/handle special characters, sometimes remove or normalize whitespace/HTML artifacts.</li><li>For RAG specifically: this is also where chunking happens — splitting long documents into passages that fit the model's context window and make sense as retrievable units (fixed-size chunking, sentence-aware chunking, or semantic chunking based on topic shifts).</li></ul></li><li><strong>Tokenization</strong><ul><li>Text →subword tokens →integer token IDs, using the model's specific tokenizer.</li><li>Add special tokens, truncate or pad to the model's max sequence length / context window.</li></ul></li><li><strong>Embedding</strong><ul><li>Token IDs →dense vectors via the embedding matrix lookup. Positional information is also added so the model knows token order.</li></ul></li><li><strong>Inference</strong><ul><li>Embedded tokens flow through stacked self-attention and feed-forward layers.</li><li>Generative models predict and sample the next token autoregressively; embedding models pool hidden states into one fixed-size vector output.</li></ul></li><li><strong>Post-processing</strong><ul><li>Generated token IDs →detokenization back into human-readable text.</li><li>Application-level post-processing: formatting, filtering, parsing structured output, safety/moderation filtering, citation attachment, or business-logic validation.</li></ul></li></ol>

One clean, fluent version to say out loud in the interview: “Raw text is first cleaned and, for something like RAG, chunked into passages.

It's then tokenized into subwords using the model's tokenizer and converted to token IDs, with special tokens and padding added as needed.

Those IDs are looked up in an embedding matrix and combined with positional encodings, since attention alone doesn't know token order. The embedded sequence goes through the transformer's self-attention and feed-forward layers, producing context-aware representations — for a generative model, the final layer predicts a probability distribution over the next token, which gets sampled via a decoding strategy and fed back in autoregressively; for an embedding model, the hidden states get pooled into one fixed-size vector instead. Finally, output token IDs are detokenized back to text, and any application-level post-processing — formatting, filtering, parsing structured output — happens before it's returned.”

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why can&#39;t you just reuse GPT&#39;s tokenizer with a BERT model, or vice versa?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Each model is trained with its own specific tokenizer/vocabulary as part of its training process — the token IDs only mean something in relation to the embedding matrix that model learned. Mixing tokenizers across model families produces IDs the model was never trained to interpret correctly.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What happens if a word isn&#39;t in the tokenizer&#39;s vocabulary?</p>
    <p class="interview-qa__answer"><strong>A.</strong> With subword tokenization, this is rare — the tokenizer decomposes the unknown word into smaller known subword pieces (or ultimately individual bytes/characters), so there&#39;s almost never a hard failure, just a longer token sequence for unusual words.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why do transformers need positional encoding if they already have embeddings?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Self-attention computes relevance between all token pairs simultaneously and is inherently permutation-invariant — without positional information, “the cat sat on the mat” and “the mat sat on the cat” would look identical to the attention mechanism. Positional encodings (learned or sinusoidal) inject order information into the embeddings before they enter the attention layers.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between greedy decoding and sampling-based decoding (topk/top-p/temperature)?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Greedy decoding always picks the single highest-probability next token, which is deterministic but can produce repetitive/bland text. Sampling methods introduce controlled randomness — top-k restricts sampling to the k most likely tokens, top-p (nucleus sampling) restricts to the smallest set of tokens whose cumulative probability exceeds p, and temperature scales the probability distribution&#39;s sharpness before sampling. These tend to produce more natural, diverse output, at the cost of determinism/reproducibility.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why does chunking matter for RAG, and how does it connect to tokenization?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Chunk size is usually decided in token terms because that&#39;s the model&#39;s real unit of cost and context-window budget — you need chunks small enough to fit alongside the query and other retrieved chunks within the context window, but large enough to preserve coherent meaning. Bad chunking (splitting mid-sentence, losing surrounding context) directly degrades retrieval and generation quality downstream.</p>
  </div>
</section>
