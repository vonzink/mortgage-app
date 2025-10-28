/**
 * Document Checklist Component
 * 
 * Displays a mortgage document checklist based on loan application data
 */

import React, { useMemo } from 'react';
import { generateDocChecklist } from '../utils/docRules';
import { LoanApplication, DocRequest } from '../utils/docRules/types';
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

interface DocumentChecklistProps {
  application: LoanApplication;
  onDocumentClick?: (doc: DocRequest) => void;
  showExplanations?: boolean;
}

const DocumentChecklist: React.FC<DocumentChecklistProps> = ({
  application,
  onDocumentClick,
  showExplanations = true,
}) => {
  const result = useMemo(() => generateDocChecklist(application), [application]);

  const renderDocument = (doc: DocRequest) => (
    <div
      key={doc.id}
      className={`document-item ${doc.conditional ? 'conditional' : ''}`}
      onClick={() => onDocumentClick?.(doc)}
      style={{
        padding: '1rem',
        marginBottom: '0.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        background: doc.conditional ? '#fff9e6' : 'white',
        cursor: onDocumentClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ marginTop: '0.25rem' }}>
          {doc.conditional ? (
            <FaExclamationTriangle style={{ color: '#ff9800' }} />
          ) : (
            <FaCheckCircle style={{ color: 'var(--primary-color)' }} />
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '600', 
            marginBottom: '0.25rem',
            color: doc.conditional ? '#666' : 'var(--text-primary)',
          }}>
            {doc.label}
          </div>
          
          {showExplanations && (
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#666',
              marginBottom: '0.25rem',
            }}>
              {doc.reason}
            </div>
          )}
          
          {doc.ruleHits.length > 0 && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#999',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              {doc.ruleHits.map((ruleId, idx) => (
                <span key={idx} style={{
                  background: '#f0f0f0',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '4px',
                }}>
                  {ruleId}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="document-checklist">
      {result.clarifications.length > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#856404',
          }}>
            <FaInfoCircle />
            Clarifications Needed
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#856404' }}>
            {result.clarifications.map((clarification, idx) => (
              <li key={idx}>{clarification}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <FaCheckCircle style={{ color: 'var(--primary-color)' }} />
          Required Documents ({result.required.length})
        </h3>
        
        {result.required.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No required documents at this time.
          </p>
        ) : (
          <div className="document-list">
            {result.required.map(renderDocument)}
          </div>
        )}
      </div>

      {result.niceToHave.length > 0 && (
        <div>
          <h3 style={{ 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <FaInfoCircle style={{ color: '#ff9800' }} />
            Optional Documents ({result.niceToHave.length})
          </h3>
          
          <div className="document-list">
            {result.niceToHave.map(renderDocument)}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentChecklist;








