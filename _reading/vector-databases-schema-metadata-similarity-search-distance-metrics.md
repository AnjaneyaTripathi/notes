---
layout: post
title: "Vector Databases, Schema/Metadata Design, Similarity Search, Distance Metrics"
date: 2026-09-09
order: 13
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Vector Databases, Schema/Metadata Design, Similarity Search, Distance Metrics

Similarity Search, Distance Metrics

### What is a vector database, and why not just use a normal DB?

A vector database is a data store purpose-built to hold high-dimensional embedding vectors and answer “find me the k most similar vectors to this query vector” efficiently at scale — this operation is called Approximate Nearest Neighbor (ANN) search. Why a normal relational/NoSQL DB doesn't work well here:

<ul>
  <li>Traditional indexes (B-trees, hash indexes) are built for exact-match or range queries on scalar fields — they don&#39;t help you find “closest” vectors in high-dimensional space.</li>
  <li>Exact nearest-neighbor search (brute-force compare query vector to every stored vector) is O(n ×d) per query — fine for thousands of vectors, unusable at millions/billions.</li>
  <li>Vector DBs solve this with ANN indexing algorithms that trade a small amount of recall for massive speed gains. Say this if asked to define it: “A vector database stores embeddings alongside metadata and provides fast approximate nearest-neighbor search over them, using specialized indexing structures like HNSW or IVF, rather than the exact-match indexing a relational database uses.”</li>
</ul>

### How ANN search actually works — the indexing algorithms to know

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Algorithm</th><th scope="col">Idea</th><th scope="col">Tradeoff</th></tr></thead>
<tbody>
<tr><td>Flat / brute-force</td><td>Compare query to every vector, exactly</td><td>100% recall, but slow — only viable for small collections or as a ground-truth baseline</td></tr>
<tr><td>HNSW (Hierarchical Navigable Small World)</td><td>Builds a multi-layer graph where nodes are vectors and edges connect “nearby” vectors; search hops through layers, coarse to fine</td><td>Excellent recall/speed tradeoff, most common default in production — but memory-hungry since the whole graph lives largely in RAM</td></tr>
<tr><td>IVF (Inverted File Index)</td><td>Clusters vectors into buckets; at query time, only search the nearest few clusters instead of everything</td><td>Faster and more memory-efficient than flat, but recall depends on how many clusters you probe (nprobe)</td></tr>
<tr><td>IVF + PQ (Product Quantization)</td><td>Combines IVF clustering with compressing each vector into a small quantized code</td><td>Much lower memory footprint, some accuracy loss — used at very large scale</td></tr>
<tr><td>ScaNN / DiskANN</td><td>Variants optimized for either extreme speed or on-disk indexing at huge scale</td><td>Used when the full index cannot fit in memory</td></tr>
</tbody>
</table>
</div>



Algorithm Idea Tradeoff IVF + PQ (Product Quantization) Combines IVF clustering with compressing each vector into a small quantized code Much lower memory footprint, some accuracy loss — used at very large (billion+) scale, e.g., FAISS ScaNN / DiskANN Google/Microsoft variants optimized for either extreme speed or on-disk (not all-in-RAM) indexing at huge scale Used when the full index can't fit in memory Good tradeoff answer if asked “how would you choose an ANN index?”: “It comes down to scale, recall requirement, and memory budget. HNSW gives the best recall/latency tradeoff for most production sizes and is the default in most managed vector DBs. If I'm at billion-scale and memory-constrained, I'd look at IVF+PQ or disk-based indexes like DiskANN, accepting some recall loss for feasibility.”

### Popular vector databases to know by name

<ul>
  <li>Managed/dedicated: Pinecone, Weaviate, Qdrant, Milvus/Zilliz</li>
  <li>Bolt-on to existing DBs: pgvector (Postgres extension), Redis (RediSearch vector support), MongoDB Atlas Vector Search, Elasticsearch/OpenSearch (kNN plugin)</li>
  <li>Library-level (not a full DB, just the ANN algorithm): FAISS (Meta), ScaNN (Google) — you&#39;d wrap these yourself with persistence/metadata handling</li>
  <li>Cloud-native: Azure AI Search (vector support), AWS OpenSearch/Kendra, Google Vertex AI Vector Search Given a job description that explicitly mentions Azure/AWS, it&#39;s worth being able to say you&#39;d likely reach for Azure AI Search or pgvector on Azure Postgres in an Azure-shop context, and explain why (native integration, governance/compliance fit for enterprise clients, avoiding a new vendor for a consulting environment where client data governance matters a lot).</li>
</ul>

### Schema / metadata design — this is a real production skill, not just theory

A vector DB record is typically: { id, vector, metadata (structured fields), optionally raw text/chunk } Good schema design principles to articulate:

<ol>
  <li>Separate the searchable vector from filterable metadata. Metadata fields (e.g., document_type, date, department, access_level, source_url, chunk_index, language) let you do hybrid queries: “find semantically similar chunks, but only within HR policy docs from 2024, that this user is authorized to see.” This is often the difference between a toy RAG demo and something enterprise-usable.</li>
  <li>Pre-filtering vs. post-filtering: Good vector DBs let you filter on metadata before or during the ANN search (pushed into the index traversal), not just after retrieving top-k. Postfiltering can silently return fewer than k results if many top matches get filtered out — a</li>
</ol>

subtle bug worth mentioning if asked about pitfalls.

<ol>
  <li>Chunk-level metadata for RAG specifically: store document_id, chunk_index, parent_document_title, page_number, source_url so you can (a) reconstruct context/citations, and (b) deduplicate or fetch neighboring chunks at query time.</li>
  <li>Access control / multi-tenancy metadata: for an enterprise consulting client context, tagging vectors with client_id / tenant_id / permission_level is often mandatory — this is a good thing to proactively mention given a consulting firm&#39;s client-confidentiality-heavy environment.</li>
  <li>Namespace/collection separation: many vector DBs let you partition data into namespaces/collections (e.g., per client, per document type) to isolate data and speed up search by shrinking the search space.</li>
  <li>Versioning: store an embedding_model_version field — if you ever change embedding models, old and new vectors are not comparable (as discussed below), so you need to know which vectors need re-embedding. Good answer if asked “how would you design a VectorDB schema for a RAG system”: “I&#39;d store the embedding vector alongside the raw chunk text, and metadata like document ID, chunk index, source, page number, and access-control tags. I&#39;d design for hybrid search — combining the ANN vector search with metadata filters like client ID or document type — and make sure filtering happens at the index level, not just after retrieval, so I don&#39;t lose recall. I&#39;d also tag each vector with the embedding model version, since embeddings from different models aren&#39;t comparable.”</li>
</ol>

### Similarity search — how “find similar” actually works

Once vectors are indexed, similarity search means: given a query vector, return the top-k stored vectors that are “closest” by some distance/similarity metric. The choice of metric matters and is a very likely direct interview question.

### Cosine Similarity vs. Euclidean Distance (the flagged topic — know this cold)

Cosine Similarity

<ul>
  <li>Measures the angle between two vectors, ignoring their magnitude.</li>
  <li>Formula: cos() = (A · B) / (||A|| × ||B||)</li>
  <li>Range: -1 (opposite) to 1 (identical direction); 0 = orthogonal/unrelated.</li>
  <li>Why it&#39;s the default for text embeddings: in NLP, vector magnitude often correlates with things like text length or word frequency rather than meaning — two documents about the same topic, one long and one short, can point in a similar direction but have very different magnitudes. Cosine similarity cares only about direction, so it naturally normalizes this out.</li>
  <li>Most sentence-embedding models (Sentence-BERT, OpenAI embeddings) are explicitly trained using cosine similarity as the objective, so using it at retrieval time matches the training signal — using a different metric can actually give worse results even though it seems like “just a different formula.” Euclidean Distance (L2 distance)</li>
  <li>Measures straight-line distance between two points in the vector space.</li>
  <li>Formula: ( (A B)²)</li>
</ul>

<ul>
  <li>Range: 0 (identical) to .</li>
  <li>Cares about magnitude — two vectors pointing the same direction but different lengths will have nonzero Euclidean distance.</li>
  <li>Common in domains where magnitude is meaningful: image embeddings, sensor/numeric feature vectors, clustering (k-means uses Euclidean by definition). Dot Product (worth mentioning as a third option)</li>
  <li>A ·B — like cosine but without normalizing by magnitude.</li>
  <li>Faster to compute (no division/sqrt), and some models (e.g., certain OpenAI/retrieval-tuned models) are trained so magnitude does carry useful signal (e.g., encoding confidence or salience) — in those cases dot product outperforms cosine.</li>
  <li>Rule of thumb: use whatever metric the embedding model was trained/optimized with — check the model card. This is a subtlety a lot of candidates miss and a good way to stand out. The one-liner interview answer: “Cosine similarity measures the angle between vectors and ignores magnitude, which is why it&#39;s the standard for text embeddings — semantic direction matters more than vector length, and most embedding models are trained with cosine similarity as the objective, so using it at query time matches training. Euclidean distance measures absolute distance and is magnitude-sensitive, which makes it more natural for things like image embeddings or numeric feature spaces where scale carries meaning. In practice, I&#39;d default to cosine for text retrieval unless the specific embedding model&#39;s documentation says it was optimized for dot product or L2.”</li>
</ul>

### A worked mini-example (good for demonstrating real understanding, not just

definitions) If pushed to be concrete: imagine two documents about “electric vehicles” — one is a 50-word snippet, the other a 5,000-word article. If both are embedded and the article's vector has a much larger magnitude just because it's longer/denser text, Euclidean distance would judge them as dissimilar (far apart) purely due to length, even though topically they're near-identical. Cosine similarity would correctly judge them as similar, because it only looks at direction. This is the intuition for why cosine dominates in text retrieval.

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between exact and approximate nearest neighbor search, and why does it matter?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Exact NN guarantees the true top-k closest vectors but requires comparing the query against every stored vector — infeasible at scale. Approximate NN (via HNSW, IVF, etc.) trades a small, tunable amount of recall for orders-of-magnitude speedup, which is necessary once you&#39;re indexing millions+ of vectors.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> When would you use Euclidean distance over cosine similarity?</p>
    <p class="interview-qa__answer"><strong>A.</strong> When vector magnitude carries meaningful signal — e.g., image embeddings, numeric/sensor feature vectors, or clustering algorithms like k-means that are defined in terms of Euclidean distance. For text embeddings specifically, I&#39;d default to cosine unless the model card says otherwise.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you handle access control in a multi-tenant RAG system using a vector DB?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Tag each vector with tenant/client/permission metadata at ingestion time, and enforce

filtering on that metadata as part of the ANN query itself (pre-filter, not post-filter), so unauthorized documents are never returned even approximately.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What happens if you switch embedding models on an existing vector index?</p>
    <p class="interview-qa__answer"><strong>A.</strong> The old and new embeddings live in different, incomparable vector spaces — you can&#39;t mix them in one index. You need to re-embed and re-index the entire corpus, which is why versioning your embedding model in metadata matters operationally.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Normal database index vs vector index — what&#39;s fundamentally different?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Traditional indexes (B-tree, hash) are built for exact match/range queries on scalar values, with logarithmic or constant lookup. Vector indexes solve a geometric nearest-neighbor problem in highdimensional space, where exact search is expensive, so they use approximate graphor cluster-based structures (HNSW, IVF) that trade recall for speed.</p>
  </div>
</section>
