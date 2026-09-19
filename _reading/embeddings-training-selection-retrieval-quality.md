---
layout: post
title: "Embeddings — Training, Selection, and Retrieval Quality"
date: 2026-09-10
order: 14
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Embeddings — Training, Selection, and Retrieval Quality

### What an embedding actually is, and the geometric intuition

An embedding is a dense vector representation of a piece of content (text, and increasingly images/audio) such that semantically similar content ends up geometrically close in the vector space — measured typically via cosine similarity (the angle between two vectors, ignoring magnitude) or dot product. The core promise: “meaning” becomes something you can compute distances over.

### How embedding models are actually trained — contrastive learning

Embedding models are typically trained via contrastive learning: given a positive pair (e.g., a question and the passage that actually answers it, or two paraphrases of the same sentence) and a batch of negative examples (unrelated content), the training objective — commonly InfoNCE loss — pushes the positive pair's embeddings closer together while pushing negatives apart, across many such pairs. Why this matters practically, not just as trivia: an embedding model's quality on your specific task depends heavily on how well its training pairs resembled your actual use case. A general-purpose embedding model trained mostly on general web-text similarity pairs may not capture that two SQL schema columns with different names but the same underlying business meaning are “similar” — that requires either a domain-tuned embedding model, or compensating with hybrid retrieval (as discussed below) and re-ranking.

### Bi-encoders vs. cross-encoders — the retrieval/re-ranking split

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">Bi-encoder</th><th scope="col">Cross-encoder</th></tr></thead>
<tbody>
<tr><td>How it works</td><td>Encodes query and document independently into vectors, then compares those vectors.</td><td>Feeds the query and document together through the model and scores their interaction directly.</td></tr>
<tr><td>Speed</td><td>Fast; document embeddings can be precomputed and indexed.</td><td>Slow; every query-document pair must be run through the model.</td></tr>
<tr><td>Best use</td><td>First-pass retrieval over a large corpus.</td><td>Re-ranking a small candidate set after retrieval.</td></tr>
<tr><td>Quality</td><td>Good semantic retrieval quality.</td><td>Usually more accurate because token-level interactions are visible to the model.</td></tr>
</tbody>
</table>
</div>

Say this if asked “how would you actually get both speed and accuracy in a retrieval system”: “You don't pick one — you stage them. Use a fast bi-encoder for the first-pass retrieval over the full corpus, since that's the only approach that scales to searching millions of documents in milliseconds. Then run a cross-encoder re-ranker over just the top handful of candidates that first pass returned — maybe top-50 down to top-5 — since a cross-encoder's accuracy advantage matters most exactly there, distinguishing between already-plausible candidates, and its cost is bounded because you're only ever scoring a small candidate set, not the whole corpus.”

### Chunking, drift, and dimensionality — practical embedding pitfalls

<ul>
  <li>Chunking strategy directly affects embedding quality. Too large a chunk averages multiple ideas into one vector, diluting the specific fact a query needs to match against; too small a chunk loses the surrounding context needed to make the chunk meaningful on its own.</li>
  <li>Embedding drift: if you switch embedding models, previously-stored vectors are no longer comparable to new query embeddings from the new model — different embedding models don&#39;t share a common vector space. This means switching embedding models requires reembedding the entire corpus, not just new documents going forward — a real, oftenunderestimated migration cost.</li>
  <li>Dimensionality tradeoffs: higher-dimensional embeddings are generally more expressive but cost more to store and search. Matryoshka-trained embeddings (e.g. OpenAI&#39;s text-embedding-3 family) are trained so that truncating the vector to fewer dimensions still produces a usable, if slightly less accurate, embedding — letting you trade accuracy for storage/speed at query time without needing to re-embed the corpus at a different fixed dimensionality.</li>
</ul>

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> You switched embedding models for better retrieval quality — what&#39;s the actual migration cost, and how would you manage it in production?</p>
    <p class="interview-qa__answer"><strong>A.</strong> The core cost is that every previously-embedded document has to be re-embedded with the new model, since vectors from different embedding models aren&#39;t comparable — there&#39;s no shortcut around this. In production, I&#39;d run this as a background re-embedding job against the full corpus, and use a versioned index (or a parallel “shadow” index) so the new embeddings can be validated against a retrieval eval set before cutting traffic over, rather than swapping the live index atomically and discovering a regression after the fact. I&#39;d also make sure the embedding model version is tracked as part of the system&#39;s overall versioning discipline — the same “version everything together” principle the LLMOps guide applies to model+adapter+prompt+quantization-config tuples extends naturally to the embedding model too.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> When would a general-purpose embedding model be insufficient, and what would you do about it?</p>
    <p class="interview-qa__answer"><strong>A.</strong> When the notion of “similar” that matters for your domain doesn&#39;t match general semantic similarity — for example, in my NL2SQL work, two column names can be semantically related in a business sense (e.g., “cust_id” and “client_reference”) without being lexically or even generally-semantically close, which a general embedding model may not capture well. Options, roughly in order of effort: first try hybrid retrieval (dense + BM25/sparse, fused via reciprocal rank fusion) since lexical matching can compensate for some embedding blind spots cheaply; if that&#39;s insufficient, fine-tune or select a domain-tuned embedding model trained on in-domain contrastive pairs; and for genuinely structured relationships (like schema foreign-key relationships), a knowledge-graph-based approach (the earlier discussion) may be a better fit than embeddings at all, since it&#39;s not fundamentally a “semantic similarity” problem.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why use a cross-encoder re-ranker at all instead of just retrieving more candidates from the bi-encoder and hoping the right one is in there?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Because bi-encoder similarity, while fast and scalable, is a genuinely weaker signal of true relevance — it&#39;s comparing two independently-computed vectors that never actually “saw” each other during encoding, so subtle relevance signals that depend on how the query and document interact can get lost. Retrieving more candidates increases the chance the right document is somewhere in the set, but doesn&#39;t fix the ranking within that set — and if you then just take the top-k from the bi-encoder&#39;s imperfect ranking, weakly-relevant documents can crowd out a genuinely relevant one that scored slightly lower on embedding similarity alone. A cross-encoder re-ranker fixes the ranking itself, precisely where it matters most, at a cost that&#39;s bounded because it only runs on the already-narrowed candidate set.</p>
  </div>
</section>
