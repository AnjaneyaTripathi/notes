---
layout: post
title: "Vector Indexing at Scale — HNSW, IVF, and Product Quantization"
date: 2026-09-08
order: 12
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Vector Indexing at Scale — HNSW, IVF, and Product Quantization

ProductQuantization

### Why brute-force search doesn't scale

Comparing a query embedding against every document embedding (brute-force cosine similarity) is O(N) per query, where N is corpus size — perfectly fine for thousands of documents, but becomes untenable at millions or billions of vectors, especially under production latency constraints. Approximate Nearest Neighbor (ANN) algorithms trade a small amount of recall (occasionally missing the true nearest neighbor) for dramatically better speed at scale — the standard practical tradeoff in this space.

### HNSW — the current default

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Aspect</th><th scope="col">Detail</th></tr></thead>
<tbody>
<tr><td>Structure</td><td>A multi-layer graph — each vector is a node, connected to its approximate nearest neighbors; higher layers are sparser “highways,” lower layers are denser</td></tr>
<tr><td>Search process</td><td>Start at the sparse top layer, greedily move toward the query's region, descend layer by layer, narrowing in on the true nearest neighbors at the bottom, densest layer</td></tr>
<tr><td>Intuition</td><td>Like a skip-list generalized to vector space — coarse jumps first, fine-grained search only near the end, so most of the graph is never touched per query</td></tr>
<tr><td>Used by</td><td>Chroma, FAISS's HNSW index, pgvector's HNSW index, and most production vector databases as their default</td></tr>
<tr><td>Tradeoff</td><td>Excellent recall/latency balance; the graph itself takes meaningful memory to store, and build time is nontrivial</td></tr>
</tbody>
</table>
</div>



### IVF (Inverted File Index)

Cluster the entire vector space in advance (typically via k-means) into a set of cells, each with a centroid. At query time, compute the query's distance to each cell centroid, then only search within the nearest few cells rather than the whole corpus. Intuition: it's like sorting a library into sections before searching, so you only browse the sections your query is actually likely to be in, instead of every shelf in the building. The tradeoff: if the true nearest neighbor happens to sit in a cell whose centroid wasn't among the few searched, it's missed entirely — controllable by increasing how many cells you search (nprobe), trading recall for speed.

### Product Quantization (PQ) — compressing the vectors themselves

Rather than changing which vectors are compared, PQ compresses each individual vector into a much smaller code: split the vector into subvectors, and quantize each subvector independently against a small learned codebook, storing just the codebook indices instead of the full-precision values. Why this matters: PQ is primarily a memory optimization (fitting a corpus too large to hold in full precision in memory), often combined with IVF (as “IVF-PQ”) so you get both the search-space pruning of IVF and the memory savings of PQ — the standard combination for truly massive vector datasets that wouldn't otherwise fit on available hardware at all.

### The framing to hold onto

All of these are answers to the same underlying tradeoff triangle: recall vs. latency vs. memory. There's no universally “best” index — the right choice depends on corpus size, latency budget, and available memory, and most vector databases let you tune these parameters (HNSW's ef_search, IVF's nprobe) rather than forcing a single fixed choice.

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Your RAG system&#39;s retrieval quality looks good in testing but degrades once the corpus grows to millions of documents — what would you check?</p>
    <p class="interview-qa__answer"><strong>A.</strong> First, whether the index configuration actually scaled with the corpus — an HNSW or IVF index tuned (or left at default settings) for a small corpus can have materially lower recall once the corpus is much larger, since the same ef_search/nprobe values that were more than sufficient at small scale may now be searching too narrow a slice of a much bigger space. I&#39;d re-tune those parameters against a recall benchmark at the new scale rather than assuming settings transfer. Second, I&#39;d check whether chunking or embedding quality issues that were masked by a small, relatively easy corpus are now surfacing — a larger corpus has more near-duplicate or superficially-similar content competing for the same top-k slots, which raises the bar on embedding precision and makes re-ranking (the earlier discussion) more valuable than it was at small scale.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> When would you choose IVF-PQ over HNSW?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Primarily when the corpus is large enough that HNSW&#39;s graph structure itself doesn&#39;t comfortably fit in available memory — PQ&#39;s vector compression directly addresses that constraint in a way HNSW alone doesn&#39;t. I&#39;d reach for HNSW by default for most production RAG use cases, since it generally has better recall/latency characteristics at a given memory budget for corpora that do fit comfortably, and only move to IVF- PQ when memory becomes the binding constraint at very large scale — which is a real, common situation for enterprise-wide document corpora, but not the typical starting point.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Is ANN search ever the wrong choice — would you ever want exact search?</p>
    <p class="interview-qa__answer"><strong>A.</strong> For most RAG-scale corpora (up to a few million vectors) with reasonable latency requirements, ANN&#39;s small recall cost is well worth the speed gain, and exact search is usually unnecessary. Exact/brute-force search remains reasonable for genuinely small corpora (a few thousand documents) where the cost difference barely matters, or for situations where you specifically need guaranteed, deterministic top-k results for audit/compliance reasons rather than an approximate result — a legitimate consideration in a regulated-industry consulting context, worth naming if the conversation goes there.</p>
  </div>
</section>
