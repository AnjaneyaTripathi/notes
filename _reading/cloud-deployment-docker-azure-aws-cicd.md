---
layout: post
title: "Cloud/Deployment — Docker, Azure/AWS, CI/CD (Final Topic on the Original List)"
date: 2026-08-28
order: 1
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Cloud/Deployment — Docker, Azure/AWS, CI/CD (Final Topic on the Original List)

CI/CD (Final Topic on the Original List) This is where everything from the earlier discussion becomes an actual running system a client can use. The bar here isn't deep infra expertise for a junior/associate role — it's demonstrating you understand why these tools exist and how they specifically apply to deploying GenAI/RAG/agentic systems, not just generic web apps.

### Docker / Containerization — the fundamentals

<div class="table-scroll">
<table>
<thead><tr><th scope="col"></th><th scope="col">Container</th><th scope="col">VM</th></tr></thead>
<tbody>
<tr><td>Virtualization</td><td>Application/process level; shares the host OS kernel</td><td>Entire hardware/OS stack</td></tr>
<tr><td>Footprint</td><td>Much lighter (MBs)</td><td>Heavier</td></tr>
<tr><td>Startup</td><td>Starts in seconds</td><td>Slower to start</td></tr>
<tr><td>Isolation</td><td>Less isolated than a VM but sufficient for most application-packaging needs</td><td>Stronger isolation</td></tr>
</tbody>
</table>
</div>

What a container actually is, and why it matters: a container packages an application together with everything it needs to run — code, dependencies, runtime, system libraries, config — into a single, portable unit that runs consistently regardless of the underlying host environment. This solves the classic “it works on my machine” problem. Container vs. VM (a very common comparison question):

<ul>
  <li>A VM virtualizes an entire machine, including its own OS kernel — heavier (GBs), slower to start (minutes), fully isolated.</li>
  <li>A container shares the host OS kernel and only virtualizes at the application/process level — much lighter (MBs), starts in seconds, less isolated than a VM but sufficient for most application-packaging needs. Say this if asked directly: “Containers virtualize at the OS/process level and share the host kernel, making them much lighter and faster to start than VMs, which virtualize the entire hardware/OS stack. The tradeoff is slightly weaker isolation, but for packaging and deploying applications consistently across environments, that tradeoff is almost always worth it.” Why containerization specifically matters for GenAI/ML systems (this is the “so what” that makes this answer land as relevant to your role, not generic DevOps trivia):</li>
  <li>Dependency hell is worse in ML/GenAI than typical web apps — specific versions of Py- Torch/CUDA, transformers libraries, embedding model dependencies, and GPU driver compatibility are notoriously fragile; a container pins the exact working combination once, and that becomes reproducible everywhere (dev, staging, prod).</li>
  <li>Reproducibility for models/pipelines: packaging a specific model version + its exact inference code + dependencies together means you can be confident the model behaving in a client&#39;s production environment is the exact same as what you tested.</li>
  <li>Scaling retrieval/inference services independently: in a RAG system, you&#39;d typically containerize the retrieval service, the embedding service, and the LLM-calling/orchestration service as separate containers, so each can be scaled independently based on its own load pattern (e.g., embedding-heavy ingestion jobs vs. steady-state query traffic). Dockerfile basics — be able to sketch one for a simple Python GenAI service:</li>
</ul>

FROM python:3.11-slim WORKDIR /app COPY requirements.txt . RUN pip install --no-cache-dir -r requirements.txt COPY . . EXPOSE 8000 CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] Talk through it as: base image → set working directory → install dependencies (copying requirements.txt before the rest of the code is a deliberate layer-caching optimization — dependencies rarely change, so Docker can reuse that cached layer and skip reinstalling on every code change) →copy application code →expose the port →define the startup command. Docker Compose (worth mentioning for local multi-service dev): a way to define and run multicontainer applications (e.g., your API service + a vector DB like pgvector/Qdrant + a Redis cache) together with one config file and one command — useful for local development environments that mirror production's multi-service architecture.

### Azure vs. AWS — cloud fundamentals, with an Azure lean for Microsoftshop

clients Given a job description that lists Azure first, and an enterprise consulting client base that skews heavily Microsoft-shop, lead with Azure familiarity, but know the AWS equivalents since interviewers often ask “what's the equivalent service on X.” Need Azure AWS LLM access (managed) Azure OpenAI Service Amazon Bedrock Compute (containers) Azure Container Apps / AKS (Kubernetes) ECS / EKS (Kubernetes) Serverless functions Azure Functions AWS Lambda Vector search Azure AI Search (vector support) OpenSearch (kNN) / Kendra Object storage Blob Storage S3 CI/CD Azure DevOps / GitHub Actions AWS CodePipeline / GitHub Actions Managed relational DB (e.g., for pgvector) Azure Database for PostgreSQL Amazon RDS for PostgreSQL Secrets management Azure Key Vault AWS Secrets Manager Monitoring/observability Azure Monitor / Application Insights CloudWatch Identity/access control Microsoft Entra ID (Azure AD) IAM Why Azure specifically matters for an enterprise consulting client context (good to articulate proactively): enterprise clients — especially regulated industries a consulting firm serves (finance, healthcare, government) — often already run on Microsoft 365/Azure AD for identity

and governance, so building on Azure means native integration with existing enterprise security/compliance boundaries rather than introducing a new vendor and a new set of access-control policies. This is a genuinely consulting-relevant point, not just a technical preference. Key GenAI-specific Azure service to know by name: Azure OpenAI Service — gives access to OpenAI models (GPT-4 class, embeddings) but hosted within Azure's compliance/security boundary (data residency, private networking, enterprise SLAs) — this is usually the reason enterprise clients use it over calling OpenAI's API directly.

### CI/CD — Continuous Integration / Continuous Deployment

<ul>
  <li>CI (Continuous Integration): automatically building and testing code every time it&#39;s pushed/merged — catches integration bugs early instead of at a big, risky release.</li>
  <li>CD (Continuous Deployment/Delivery): automatically (or with a controlled approval gate) deploying code that passes CI to staging/production — reduces manual deployment risk/toil, enables fast, frequent, reliable releases. A typical pipeline for a GenAI service, stage by stage:</li>
</ul>

<ul>
  <li>Lint/format check — code style consistency (e.g., black, flake8 for Python).</li>
</ul>

<ol>
  <li>Unit tests — test individual functions/components in isolation.</li>
  <li>Integration tests — test that components work together (e.g., does the retrieval pipeline actually return expected chunks for a known query).</li>
  <li>GenAI-specific evaluation gate (the part that&#39;s genuinely different from typical CI/CD, worth mentioning to show you understand what&#39;s unique here) — running an eval suite (e.g., RAGAS metrics from the earlier discussion, or a fixed set of test prompts with expected-quality checks) as part of the pipeline, so a change to a prompt, retrieval config, or model version can&#39;t silently degrade output quality without being caught before deployment. This is the ML/GenAIspecific evolution of traditional CI/CD&#39;s “tests must pass” gate.</li>
  <li>Build &amp; containerize — build the Docker image.</li>
  <li>Deploy to staging — automated deployment to a staging environment for further validation.</li>
  <li>Deploy to production — often gated by manual approval for production-impacting changes, especially in a regulated/enterprise consulting context, plus a rollback plan if something goes wrong post-deploy. Good answer if asked “how would CI/CD differ for a GenAI application vs. a typical web app?”: “The core CI/CD mechanics are the same — automated build, test, deploy — but GenAI systems need an additional evaluation gate that traditional software doesn&#39;t: because model/prompt/retrieval changes can degrade output quality in ways unit tests won&#39;t catch, I&#39;d run a fixed evaluation suite — something like RAGAS metrics against known test cases — as part of the pipeline, so a prompt tweak or a model version bump can&#39;t silently ship a quality regression. I&#39;d also want to version and track things unit-test-based CI doesn&#39;t usually need to: which embedding model version indexed the current vector store, which prompt template version is live, which base LLM version — so issues are traceable to a specific change.”</li>
</ol>

### A concrete deployment architecture to have ready (ties the earlier discussion together

into one system) If asked to sketch a production RAG/agentic system's deployment, a clean answer:

“I'd containerize the system as a few separable services: an ingestion/indexing service (chunking, embedding, writing to the vector DB — likely Azure AI Search or pgvector on Azure Postgres), a retrieval + orchestration service (the LangGraph agent logic, tool calling, calling Azure OpenAI for generation), and a thin API layer in front. Each is a Docker container, deployed via Azure Container Apps or AKS depending on scaling needs, with secrets (API keys) in Azure Key Vault, not hardcoded. CI/CD would run unit/integration tests plus a RAGAS-style eval gate before promoting to production, and I'd use Application Insights for observability — tracing individual requests through retrieval and generation so I can debug quality issues down to which stage failed, similar to the diagnostic framing from the RAG evaluation discussion.” This kind of answer is valuable specifically because it references your own earlier answers (RAGAS, LangGraph, the retrieval-diagnosis framing) — it shows the interviewer you're not reciting isolated facts but actually holding a coherent mental model of a real system, which is exactly what a seniorsounding junior candidate demonstrates.

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why containerize an ML/GenAI service instead of just deploying it directly on a VM?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Reproducibility (pinning exact dependency versions, which is especially fragile in ML stacks), portability across dev/staging/prod, and the ability to scale individual services (retrieval vs. generation vs. ingestion) independently rather than as one monolith.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between continuous delivery and continuous deployment?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Continuous delivery means code is always in a deployable state and could be released at any time, typically with a manual approval gate before production. Continuous deployment goes further — every change that passes the pipeline is deployed automatically with no manual gate. Most enterprise/regulated contexts (like a typical consulting client base) favor delivery with a manual production gate over fully automatic deployment.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why would you choose Azure OpenAI Service over calling OpenAI&#39;s API directly for an enterprise client?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Azure OpenAI provides the same underlying models but within Azure&#39;s compliance and security boundary — private networking, data residency guarantees, enterprise SLAs, and integration with the client&#39;s existing Azure AD/identity and governance setup — which matters a great deal for regulated-industry clients where data handling and compliance are as important as raw model capability.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What would you add to a standard CI/CD pipeline specifically for a RAG/GenAI application?</p>
    <p class="interview-qa__answer"><strong>A.</strong> An automated evaluation gate — running a fixed suite of test queries through RAGAS-style metrics (faithfulness, context precision/recall) — so changes to prompts, retrieval configuration, chunking, or the underlying model can&#39;t silently regress output quality the way they could slip past standard unit/integration tests alone.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you handle secrets like API keys in a containerized deployment — hardcode them in the Docker image?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — secrets should never be baked into the image or committed to source control. Use a managed secrets service (Azure Key Vault / AWS Secrets Manager) and inject them into the container at runtime via environment variables or a mounted secret store, so the image itself stays portable and safe to share/rebuild without leaking credentials. 51You&#39;ve now covered the full original topic list All ten topics from your interview-prep breakdown are documented above with definitions, deeper mechanics, tradeoff framings, and ready-to-say answers. A few suggestions for how to use this document from here:

&lt;ol&gt;
  &lt;li&gt;Do a full read-through once, then switch to active recall — cover the “likely questions” sections and try answering from memory before checking.&lt;/li&gt;
  &lt;li&gt;Rehearse the “one-liner” and “say this if asked” blocks out loud — these are written to be spoken naturally, not read.&lt;/li&gt;
  &lt;li&gt;Practice connecting topics to each other, the way the preceding section does — interviewers reward candidates who show a coherent system-level mental model, not isolated fact recall.&lt;/li&gt;
  &lt;li&gt;If you want, I can also put together: a condensed one-page cheat-sheet version of this whole document for last-minute review, a mock Q&amp;A drill where I play interviewer and react to your answers, or dig deeper into any sub-topic (e.g., a closer look at LangGraph&#39;s actual API/syntax, or more RAG evaluation detail) if you want to go beyond what&#39;s here.&lt;/li&gt;
&lt;/ol&gt;</p>
  </div>
</section>
