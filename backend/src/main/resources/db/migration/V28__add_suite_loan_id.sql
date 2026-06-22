-- Store the suite (system-of-record) loan id on the local strangler row.
alter table loan_applications add column suite_loan_id varchar(64) null;
