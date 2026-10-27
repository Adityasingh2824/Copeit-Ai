# Copeit AI RAG pilot kickoff

Date: 27 October 2026

## Scope and source gate

The pilot remains generic electronics for India-to-EU preparation; no product-specific market-access conclusion is in scope. Retrievable source types are: official EU legal/guidance sources, harmonised-standard metadata or licensed text where permitted, notified-body guidance, and customer uploads that a qualified reviewer explicitly approves. Draft requirement documents are planning inputs, not regulatory truth.

The six expected requirement documents are represented by role until the files are supplied: product requirements, technical architecture, user journey, UI/UX specification, backend specification, and implementation plan. Required metadata: tenant, product (optional), title, document role, source type, jurisdiction, language, owner, canonical URL, version label, SHA-256, media type, size, effective date, superseded version, storage path, extraction status, approval status/reviewer/time/rationale.

## Data model

`documents` holds identity and provenance. `document_versions` is immutable and checksum-addressed. `document_chunks` stores ordered text plus heading path, page span, table/row coordinates, token count, and checksum. `chunk_embeddings` records model, dimension, and vector separately to permit re-embedding. `ingestion_jobs` records idempotency, state, progress, attempts, and safe errors. `source_approvals` gates retrieval by immutable version. `answer_citations` binds an answer to exact chunks, scores, and retrieval time.

## Extraction and citation rules

- PDF: preserve printed page number when available and always retain 1-based physical PDF page; remove repeated headers/footers only after detecting them on at least three pages. OCR pages are flagged. Never join chunks across pages when page citation would become ambiguous.
- DOCX: split on Heading 1–3, preserve paragraph order and tables. Page citations are allowed only when a page map comes from a stable PDF rendering; otherwise cite section and paragraph range.
- Tables: repeat table title and header in every chunk; split only between rows; store table ID and row range. Do not flatten a row across chunks.
- Text: target about 800 tokens, hard maximum about 1,050, with 100-token overlap inside the same section. Keep lists with their lead sentence.
- Citation display: title, immutable version, page or section, table/rows when applicable, canonical URL, and retrieval timestamp.

## Embeddings and ingestion

Use `gemini-embedding-2`, 768 dimensions, with document text formatted as `title: {title} | text: {chunk}` and queries as `task: question answering | query: {question}`. `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL` are Supabase Edge Function secrets; neither may use a `VITE_` prefix. The first implemented adapter accepts UTF-8 TXT/Markdown/CSV up to 25 MB, uploads to a private quarantine bucket, checks tenant editor access, deduplicates by SHA-256, chunks, embeds server-side, records progress, and leaves approval `pending`. PDF/DOCX parsing is specified but blocked until the parser/OCR choice is approved.

Retrieval filters tenant and approved current versions before vector matching, uses a provisional cosine threshold of 0.72, returns up to six chunks, and must return exactly “Insufficient approved evidence to answer this question.” when nothing passes. Threshold calibration requires a golden question set.

## Blockers

1. The six source files are not present in this workspace, so checksums, page counts, formats, owners, and effective dates cannot be inventoried.
2. The owning Supabase project is not connected here; schema, storage bucket, RLS, and Edge Function cannot be applied or verified live.
3. No Gemini key is available; only the secret contract can be prepared.
4. A qualified regulatory reviewer and approved source catalog are not named.
5. PDF/DOCX extraction, OCR, malware scanning, retention region, and licensed-standard handling need owner decisions.
