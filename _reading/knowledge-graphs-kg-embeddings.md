---
layout: post
title: "Knowledge Graphs & KG Embeddings"
date: 2026-09-06
order: 10
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Knowledge Graphs & KG Embeddings

### What a knowledge graph is, and why plain embeddings aren't always enough

A knowledge graph represents information as (subject, relation, object) triples — e.g. (invoice_123, issued_by, vendor_A), (vendor_A, located_in, Singapore). Unlike a flat document corpus, a KG makes structured, multi-hop relationships explicit and traversable. The intuition for why this matters beyond plain embeddings: vector similarity search is fundamentally about “what's semantically close to my query,” which handles single-hop factual lookup well but struggles with genuinely multi-hop reasoning — “which vendor's invoices reference a product that's also flagged in a different vendor's dispute” isn't a similarity question, it's a graph traversal question. No single chunk of text likely contains that answer; it emerges from connecting facts across multiple entities and relations.

### KG embedding methods — representing structure as vectors

The goal of KG embedding: represent entities and relations as vectors such that the graph's structure (which triples are true, which are false, which relationships share patterns) is captured geometrically — enabling similarity search, link prediction (is this plausible-but-missing edge likely true?), and reasoning over the graph via vector arithmetic..

<div class="table-scroll"><table><thead><tr><th>Method</th><th>Core idea</th><th>Handles well</th><th>Struggles with</th></tr></thead><tbody><tr><td>TransE</td><td>Relation as a vector translation: subject_vec + relation_vec = object_vec</td><td>Simple 1-to-1 relationships, fast to train and score</td><td>1-to-many / many-to-many relationships</td></tr><tr><td>RotatE</td><td>Relation as a rotation in complex vector space</td><td>Symmetric, antisymmetric, inverse, and compositional relations</td><td>More complex to train and interpret than TransE</td></tr><tr><td>ComplEx</td><td>Complex-valued embeddings scored via a Hermitian (conjugate) dot product</td><td>Asymmetric relations; competitive with RotatE</td><td>Less geometrically intuitive than RotatE</td></tr><tr><td>GNN-based (e.g. R-GCN)</td><td>Iterative relation-type-aware message passing</td><td>Rich, dense graphs with complex multi-hop structure</td><td>Higher compute cost; more complex to train</td></tr></tbody></table></div>

Say this if asked to explain TransE's core weakness intuitively: “TransE says subject + relation object, which is a clean, simple idea for one-to-one facts — `Paris is capital of France' has exactly one right answer..

But for a relation like `wrote,' where one author wrote many books, TransE would need author_vec + wrote_vec to simultaneously be close to every one of that author's books' vectors — which just isn't geometrically possible for a single fixed translation vector..

RotatE fixes this by representing the relation as a rotation instead of a translation, which has more geometric flexibility to represent these richer relationship patterns.”

### GraphRAG — the direct link between knowledge graphs and RAG

Rather than (or in addition to) chunk-based vector retrieval, GraphRAG builds a knowledge graph over a corpus — typically by using an LLM to extract entities and relations from documents — and retrieves by graph traversal (walking from query-relevant entities outward through their relationships) rather than pure similarity search. Why this is a genuinely better fit for multi-hop questions: a plain vector search retrieves chunks that are individually similar to the query, but has no mechanism for “connect fact A from document 1 to fact B from document 3 through their shared relationship to entity C” — that's exactly what graph traversal is built for. The tradeoff: building and maintaining a knowledge graph (entity extraction, relation extraction, deduplication/entity resolution across mentions) is real upfront and ongoing engineering cost that plain chunk-and-embed RAG doesn't require.

### The direct tie to your own schema/NL2SQL work

A relational database schema — tables, columns, and foreign-key relationships — is already a knowledge graph. Tables are entities, foreign keys are relations, and the problem of figuring out “which tables does this natural-language question actually refer to, and how do they join together” is structurally a graph traversal / entity-linking problem, not a pure text-similarity problem. This is a genuinely strong, honest talking point: KG embeddings are one legitimate technique for fuzzy schema-element matching (when a user's wording doesn't literally match a column name), complementing — not replacing — the RAG-based business-glossary lookup already in the design.

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> When would you reach for a knowledge graph approach instead of just adding more retrieval/re-ranking to a standard RAG pipeline?</p>
    <p class="interview-qa__answer"><strong>A.</strong> When the failure mode is specifically multi-hop — the model needs to connect facts across multiple documents or entities that no single chunk contains together, and no amount of better single-chunk retrieval fixes that, because the answer genuinely doesn&#39;t live in any one chunk. If failures instead look like “the right chunk exists but didn&#39;t get retrieved” or “the right chunk was retrieved but ranked too low,” that&#39;s a retrieval/reranking problem (the earlier discussion), not a graph-structure problem, and is usually cheaper to fix than standing up a knowledge graph pipeline.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you evaluate whether a KG-embedding-based link-prediction approach is actually working, versus just producing plausible-looking noise?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Standard practice is held-out link prediction: remove a known-true subset of triples from the graph, have the model rank candidate objects for the remaining (subject, relation, ?) queries, and measure whether the true removed object ranks highly — using metrics like Mean Reciprocal Rank (MRR) or Hits@k (is the true answer in the top-k predictions). This gives a concrete, checkable signal rather than just eyeballing whether predicted links look reasonable.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the biggest practical risk in building a GraphRAG pipeline for an enterprise document corpus?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Entity resolution — the same real-world entity (“Acme Corp,” “Acme Corporation,” “Acme”) appearing under different surface forms across documents, and getting extracted as separate, disconnected graph nodes unless explicitly deduplicated. If entity resolution is weak, the graph fragments into many small disconnected pieces that don&#39;t actually capture the crossdocument relationships GraphRAG is supposed to provide, largely defeating the purpose while still carrying the full engineering cost of building and maintaining the graph. I&#39;d treat entity resolution quality as the key metric to validate before trusting the graph&#39;s traversal results, not an afterthought to the extraction pipeline.</p>
  </div>
</section>
