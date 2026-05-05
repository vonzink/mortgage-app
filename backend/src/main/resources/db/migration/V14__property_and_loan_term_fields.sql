-- ============================================================================
-- V14: Additional MISMO-derived fields for the property + loan terms
--
-- These exist in MISMO 3.4 URLA exports but had nowhere to land:
--   properties.purchase_price        SalesContractAmount (purchase loans only)
--   properties.attachment_type       AttachmentType: Attached | Detached
--   properties.project_type          ProjectLegalStructureType: Condominium |
--                                    PUD | Cooperative | None
--   loan_terms.down_payment_amount   computed: propertyValue - baseLoanAmount
--                                    (or stored directly if MISMO supplies it)
-- ============================================================================

ALTER TABLE properties ADD COLUMN purchase_price DECIMAL(15, 2);
ALTER TABLE properties ADD COLUMN attachment_type VARCHAR(50);
ALTER TABLE properties ADD COLUMN project_type VARCHAR(50);

ALTER TABLE loan_terms ADD COLUMN down_payment_amount DECIMAL(15, 2);
