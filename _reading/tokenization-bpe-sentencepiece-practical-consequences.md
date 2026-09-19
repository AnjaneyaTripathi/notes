---
layout: post
title: "Tokenization — BPE, SentencePiece, and Practical Consequences"
date: 2026-09-15
order: 19
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Tokenization — BPE, SentencePiece, and Practical Consequences

### Why subword tokenization, not words or characters

<ul>
  <li>Word-level tokenization would need an enormous vocabulary to cover a language&#39;s full vocabulary plus names, typos, and rare terms — and still hits “out of vocabulary” walls on anything unseen.</li>
  <li>Character-level tokenization has a tiny vocabulary and never has an OOV problem, but sequences become very long (a word becomes many tokens), which is expensive given attention&#39;s quadratic cost, and makes it harder for the model to learn word-level meaning directly.</li>
  <li>Subword tokenization is the practical middle ground: common words stay as a single token, rare or unseen words decompose gracefully into meaningful subword pieces (e.g. “unbelievable” →“un” + “believ” + “able”), keeping vocabulary size manageable (tens of thousands of tokens) while avoiding true OOV failures.</li>
</ul>

### Byte-Pair Encoding (BPE) mechanics

<ol>
  <li>Start with a vocabulary of individual characters (or bytes).</li>
  <li>Count all adjacent symbol pairs across the training corpus.</li>
  <li>Merge the single most frequent pair into a new symbol, add it to the vocabulary.</li>
  <li>Repeat steps 2–3 until reaching a target vocabulary size (commonly 32K–150K+ tokens in modern LLMs). Intuition: BPE is essentially a greedy compression algorithm — it learns exactly the subword units that are statistically useful for representing the training corpus efficiently, so genuinely common patterns (common words, common morphological pieces) end up as single tokens, and everything else falls back to smaller, still-meaningful pieces.</li>
</ol>

### SentencePiece and why it matters for multilingual models

SentencePiece is a widely-used implementation that treats the input as a raw stream of Unicode characters (including whitespace as an explicit symbol, rather than assuming whitespace-delimited words the way classic BPE implementations often do) — making it language-agnostic, which is exactly why it's the standard choice for multilingual models like Qwen, where word-boundary assumptions from English don't transfer to languages like Chinese or Thai that don't use whitespace to separate words at all.

### Practical consequences worth knowing cold

<ul>
  <li>Numbers tokenize inconsistently. Depending on the tokenizer, numbers may be split digit-by-digit, grouped into arbitrary chunks (e.g. “1234” as “12” + “34”), or handled specially — and this inconsistency is a real, underappreciated contributor to LLM arithmetic errors, since the model has to reconstruct numeric meaning from whatever arbitrary fragmentation the tokenizer happened to produce, rather than seeing numbers in a consistent, learnable structure. This is directly relevant to the invoice-extraction use case — an LLM misreading or “fixing” a numeric value is partly a tokenization-level phenomenon, not just a reasoning failure.</li>
  <li>Token count word count character count, and this varies by language and tokenizer — a critical detail for context-budget math and for cost estimation, since API pricing is per-token.</li>
  <li>Domain jargon fragments badly if it&#39;s rare in the tokenizer&#39;s training corpus — every occurrence of a heavily-fragmented term wastes context window and inference cost, and weakens the model&#39;s ability to form a coherent representation for that term, since it has to reconstruct meaning from fragments every single time. (The SLM/LLMOps guide&#39;s the earlier discussion covers the fix — tokenizer vocabulary extension — in full mechanical detail.)</li>
  <li>Different models use different tokenizers, so “token count” isn&#39;t directly comparable across model families without re-tokenizing — a common mistake when estimating cost or context usage across providers.</li>
</ul>

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why might a model get simple arithmetic wrong even though it&#39;s excellent at complex reasoning?</p>
    <p class="interview-qa__answer"><strong>A.</strong> A meaningful part of this traces back to tokenization, not pure reasoning capacity — if a tokenizer splits “4827” and “482” + “7” inconsistently across different numbers or contexts, the model never sees numbers in a clean, positionally-consistent representation the way it sees, say, common words. It has to implicitly reconstruct place value and magnitude from whatever arbitrary fragments the tokenizer produced, which is a much harder and less reliable process than the fluent pattern-matching the model does on text. This is part of why some newer tokenizers deliberately special-case digit tokenization (e.g., always splitting into consistent groups) specifically to improve arithmetic reliability.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If you&#39;re building a domain-specific system and notice unusually high token costs, how would you diagnose whether tokenization is the culprit?</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d tokenize a representative sample of domain input with the target tokenizer and measure tokens-per-word or tokens-perconcept specifically for domain-heavy terms, compared to general English text. If domain terms are consistently fragmenting into many more subword pieces than their general-English equivalents, that&#39;s a direct, measurable signal — and the fix (tokenizer vocabulary extension plus a short embedding warm-up phase) is well-established, covered in depth in the SLM/LLMOps guide.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Does a larger vocabulary size always improve a model?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — it&#39;s a real tradeoff, not a free win. A larger vocabulary means fewer tokens per input (good for cost and effective context length) and can represent rare/domain terms more directly, but it also means a larger embedding matrix and output softmax layer, which adds parameters and compute, and each individual token is seen less often during training relative to a smaller vocabulary, which can make rarer tokens&#39; representations weaker if the training corpus isn&#39;t large enough to compensate. Most modern general-purpose LLMs converge in the 30K–150K range as a practical balance point.</p>
  </div>
</section>
