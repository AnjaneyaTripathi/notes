---
layout: post
title: "BM25 / TF-IDF vs. Dense Retrieval"
date: 2026-09-07
order: 11
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## BM25 / TF-IDF vs. Dense Retrieval

### The big picture: two fundamentally different ways to find relevant documents

<ul>
  <li>Sparse/lexical retrieval (TF-IDF, BM25): matches based on exact term overlap — does the document literally contain the query&#39;s words?</li>
  <li>Dense retrieval (embedding-based similarity search, the earlier discussion): matches based on semantic similarity in vector space — does the document mean the same thing, even with different words? This distinction, and knowing when to use which (or combine them), is one of the most practically important things you can demonstrate in the interview — it directly connects to the “simple vs. complex RAG” tradeoff discussion this interviewer&#39;s team is known to probe.</li>
</ul>

### TF-IDF (Term Frequency – Inverse Document Frequency)

What it measures: how important a word is to a specific document, relative to a collection of documents.

<ul>
  <li>TF (Term Frequency): how often a term appears in a document — more occurrences = more relevant to that doc (often log-scaled to avoid over-rewarding repetition).</li>
  <li>IDF (Inverse Document Frequency): downweights terms that appear in many documents (like “the”, “is”) and upweights rare, more discriminative terms. Formula: IDF(t) = log(N / df(t)), where N = total documents, df(t) = number of documents containing term t.</li>
  <li>TF-IDF score = TF(t, d) ×IDF(t) — high when a term is frequent in this document but rare across the collection (i.e., distinctive).</li>
  <li>Documents and queries become sparse vectors over the vocabulary, and similarity is computed via cosine similarity between these TF-IDF vectors. Say this if asked to define it: “TF-IDF scores how important a word is to a document by combining how often it appears in that document with how rare it is across the whole corpus — common words like `the&#39; get downweighted, distinctive terms get upweighted, and documents get represented as sparse vectors you can compare with cosine similarity.”</li>
</ul>

### BM25 (Best Matching 25) — the industry-standard evolution of TF-IDF

BM25 is what production lexical search engines (Elasticsearch, OpenSearch, Lucene/Solr) actually use by default — it's TF-IDF with two crucial refinements:

<ol>
  <li>Term frequency saturation: In TF-IDF, a term appearing 10x contributes ~10x the score. That&#39;s unrealistic — the 10th occurrence of “cat” shouldn&#39;t matter nearly as much as the 1st. BM25 applies a saturation function (controlled by parameter k1) so TF&#39;s contribution to the score plateaus rather than growing linearly.</li>
  <li>Document length normalization: Longer documents naturally contain more term occurrences just by virtue of being longer, which can unfairly inflate their score. BM25 explicitly</li>
</ol>

normalizes for document length relative to the average document length in the collection (controlled by parameter b), penalizing long documents that “win” purely on length rather than relevance. Formula intuition (don't need to memorize exactly, but know the shape): BM25(D, Q) = IDF(q) × [ (f(q, D) × (k1 + 1)) / (f(q, D) + k1 × (1 b + b × |D|/avgdl)) ] — IDF term (same spirit as TF-IDF) multiplied by a saturating, length-normalized TF term. Say this if asked “what's the difference between TF-IDF and BM25?”: “BM25 builds on TF-IDF's core idea but fixes two practical issues: it saturates term-frequency scoring so repeated terms give diminishing returns instead of linear growth, and it normalizes for document length so long documents don't win purely by containing more words. That's why BM25, not raw TF-IDF, is the default in production search engines like Elasticsearch.”

### Dense retrieval (the embedding-based approach)

<ul>
  <li>Query and documents are both encoded into dense embedding vectors (the earlier discussion) using the same embedding model.</li>
  <li>Similarity is computed via cosine similarity or dot product (the earlier discussion), typically retrieved via ANN search (HNSW/IVF) over a vector DB.</li>
  <li>Key advantage: captures semantic similarity, not just lexical overlap. A query for “how to reduce staff attrition” can retrieve a document about “improving employee retention” even though they share almost no exact words — BM25 would completely miss this.</li>
  <li>Key weakness: can struggle with exact-match needs — rare identifiers, product codes, acronyms, names, numbers, or precise legal/technical terminology, where lexical matching is actually what you want. Dense models can also “hallucinate” similarity for texts that are topically related but not actually relevant to answer the query.</li>
</ul>

### Side-by-side comparison (have this table mentally ready)

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">BM25 / TF-IDF<br>(sparse/lexical)</th><th scope="col">Dense retrieval (embeddings)</th></tr></thead>
<tbody>
<tr><td>Matches on</td><td>Exact term overlap</td><td>Semantic meaning</td></tr>
<tr><td>Handles synonyms/paraphrase</td><td>Poorly (no overlap = no match)</td><td>Well</td></tr>
<tr><td>Handles exact IDs, codes, rare terms, names</td><td>Well (exact match is its strength)</td><td>Poorly (embeddings can blur precise details)</td></tr>
<tr><td>Interpretability</td><td>High — easy to see why a doc matched</td><td>Low — similarity score doesn't explain itself</td></tr>
<tr><td>Compute at index time</td><td>Cheap (just term statistics)</td><td>Expensive (needs a trained embedding model + inference for every doc)</td></tr>
<tr><td>Compute at query time</td><td>Very fast (inverted index lookup)</td><td>Fast with ANN, but requires vector infra</td></tr>
<tr><td>Needs training data</td><td>No</td><td>Depends — pretrained models work zero-shot but fine-tuning helps domain fit</td></tr>
<tr><td>Out-of-domain robustness</td><td>Robust (pure statistics, no learned bias)</td><td>Can degrade if domain differs a lot from training data</td></tr>
</tbody>
</table>
</div>



### Hybrid search — the production-grade answer (this is the “smart” thing to

say) In practice, the strongest production RAG systems don't pick one — they combine both, because their failure modes are complementary:

<ul>
  <li>Run BM25 and dense retrieval in parallel, then merge/re-rank the combined results.</li>
  <li>Reciprocal Rank Fusion (RRF) is the common, simple merging technique: combine rankings from each method by summing 1 / (rank + k) scores across methods, rather than trying to normalize and blend raw incomparable scores directly.</li>
  <li>Often followed by a re-ranking stage — a more expensive cross-encoder model that jointly scores (query, candidate) pairs for final precision on just the top ~20-50 candidates from the first-stage hybrid retrieval (a classic “retrieve cheap &amp; broad, then rerank expensive &amp; precise” two-stage pattern). Say this if asked “would you use BM25 or embeddings for retrieval?”: “In production I&#39;d lean toward hybrid search rather than picking one — BM25 is strong on exact terms, codes, and rare vocabulary where embeddings tend to blur precision, while dense retrieval captures semantic/paraphrase matches that BM25 completely misses. Running both and merging results, commonly with reciprocal rank fusion, and then optionally re-ranking the top candidates with a cross-encoder, tends to outperform either approach alone. Which one to weight more heavily depends on the domain — highly technical/legal content with precise terminology leans more on lexical search, open-ended conversational queries lean more on dense.”</li>
</ul>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why would dense retrieval fail on a query like “invoice number INV-2024-88213”?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Embedding models are trained to capture semantic/topical similarity, not to preserve exact character-level precision — a specific alphanumeric ID doesn&#39;t carry “meaning” in the way words do, so the embedding may not distinguish it well from similar-looking IDs. BM25/exact-match lexical search handles this case naturally since it&#39;s just looking for literal term overlap.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between TF-IDF and BM25 in one sentence?</p>
    <p class="interview-qa__answer"><strong>A.</strong> BM25 is TF- IDF with term-frequency saturation and document-length normalization added, making it more robust in practice — which is why it&#39;s the production default over raw TF-IDF.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you combine BM25 and dense retrieval scores, given they&#39;re on completely different scales?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Don&#39;t try to normalize and add raw scores directly — use rank-based fusion like Reciprocal Rank Fusion, which combines the rankings each method produces rather than their incomparable raw scores.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What is re-ranking, and why not just do it at the first retrieval stage?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Re-ranking uses a more expensive, higher-precision model (typically a cross-encoder that jointly encodes the

query and candidate together, rather than encoding them separately like a bi-encoder/embedding model does) to re-score a small candidate set for final precision. It&#39;s too expensive to run over the entire corpus, so the pipeline first uses cheap, fast retrieval (BM25/dense/hybrid) to narrow millions of documents down to a handful, then applies the expensive re-ranker only to those.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Bi-encoder vs. cross-encoder — what&#39;s the difference?</p>
    <p class="interview-qa__answer"><strong>A.</strong> A bi-encoder (standard embedding model) encodes the query and each document independently into vectors, allowing precomputation and fast ANN search at scale, but loses some precision since the two texts never directly interact. A cross-encoder feeds the query and document together into the model in one pass, letting attention directly compare them, giving much higher accuracy but making it too slow to run over an entire corpus — hence its use only in the re-ranking stage on a small candidate set.</p>
  </div>
</section>
