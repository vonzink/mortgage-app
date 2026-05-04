-- Documents move from local filesystem to S3.
-- New columns track the S3 object identity, lifecycle state, and original metadata.

ALTER TABLE documents ADD COLUMN doc_uuid VARCHAR(36);
ALTER TABLE documents ADD COLUMN s3_key VARCHAR(1024);
ALTER TABLE documents ADD COLUMN safe_filename VARCHAR(255);
ALTER TABLE documents ADD COLUMN content_type VARCHAR(255);
ALTER TABLE documents ADD COLUMN upload_status VARCHAR(20) DEFAULT 'pending';

CREATE UNIQUE INDEX idx_documents_doc_uuid ON documents(doc_uuid);
CREATE INDEX idx_documents_application ON documents(application_id);
CREATE INDEX idx_documents_upload_status ON documents(upload_status);
