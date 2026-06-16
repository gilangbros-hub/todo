/**
 * Add extracted_text column to store intermediate results from chunking/extraction phase
 * 
 * This column stores the distilled text after the map-reduce chunking phase,
 * allowing subsequent analysis phases to operate on the processed content.
 */
alter table brd_documents 
add column extracted_text text default '';

comment on column brd_documents.extracted_text is 
  'Distilled text content after map-reduce chunking/extraction phase. Empty if extraction has not run.';