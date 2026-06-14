-- Rename columns in brd_documents for the BABOK/PMI-PBA advisory overhaul

ALTER TABLE brd_documents 
  RENAME COLUMN architecture_diagram TO context_diagram;

ALTER TABLE brd_documents 
  RENAME COLUMN impacted_systems TO impacted_components;

ALTER TABLE brd_documents 
  RENAME COLUMN fsd_design TO use_case_scenarios;
