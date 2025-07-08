# Custom Document Retrieval (Vector Store RAG)

## 1 · User Value / Problem
Server owners frequently want the bot to answer questions about proprietary docs (wikis, PDFs, code). A Retrieval-Augmented Generation (RAG) pipeline with a vector store enables:
* Accurate, source-grounded answers on uploaded content.
* Private data remains in the guild’s DB – not baked into model fine-tune.

## 2 · Technical Requirements
1. **Embedding Generation** – Use Gemini embeddings API or OpenAI `text-embedding-3-small`.
2. **Vector Database** – Self-hosted PGVector (fits SQLite origin) *or* managed Pinecone.
3. **File Ingestion** – Slash command `/upload_docs` (accept PDF, txt, md, docx).
4. **Chunking & Cleaning** – Split into ~1-2k token segments; store chunk text + metadata.
5. **Query Flow** – On user prompt, embed, similarity search top-k, inject into prompt.
6. **Citations & Highlights** – Provide page / section references.

## 3 · Dependencies
* `@pinecone-database/pinecone` **or** `pgvector-node`.
* `pdf-parse`, `mammoth` for doc extraction.
* Migration to Postgres if PGVector chosen.

## 4 · Implementation Plan
| Phase | Steps |
|-------|-------|
| MVP     |1. Add `services/embeddings.ts`.<br>2. Integrate free tier PGVector hosted on Supabase.<br>3. Slash command `/rag` queries vector store.|
| Upload |4. `/upload_docs` stores files in S3 or local `data/docs`.<br>5. Background worker ingests & indexes.|
| UX     |6. Auto-ground `/gemini` when matching confidence high.<br>7. Show citations inline.|
| Scale  |8. Batched upserts, LRU cache, and deletion API.|

## 5 · Risks & Mitigations
* **Cost** – Vector DB storage; compress & age-off chunks.
* **Security** – Uploaded docs may be sensitive; encrypt at rest.
* **Latency** – Limit k & use approximate search. 
