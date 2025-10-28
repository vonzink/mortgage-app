/**
 * useDocumentChecklist Hook
 * 
 * React hook for generating and managing document checklists
 */

import { useMemo } from 'react';
import { generateDocChecklist, explain } from '../utils/docRules';
import { adaptFormToLoanApplication, validateFormForDocumentGeneration } from '../utils/docRules/formAdapter';
import { LoanApplication, DocChecklistResult, Overlays } from '../utils/docRules/types';

interface UseDocumentChecklistOptions {
  overlays?: Partial<Overlays>;
  autoGenerate?: boolean;
}

interface UseDocumentChecklistReturn {
  result: DocChecklistResult;
  explanations: string[];
  isValid: boolean;
  validationErrors: string[];
  generate: () => void;
  regenerate: (newFormData: any) => void;
}

/**
 * Hook to generate document checklist from form data
 */
export function useDocumentChecklist(
  formData: any,
  options: UseDocumentChecklistOptions = {}
): UseDocumentChecklistReturn {
  const { overlays = {}, autoGenerate = true } = options;

  // Validate form data
  const validation = useMemo(() => validateFormForDocumentGeneration(formData), [formData]);

  // Convert form data to LoanApplication format
  const application = useMemo(() => {
    if (!validation.isValid) return null;
    return adaptFormToLoanApplication(formData);
  }, [formData, validation.isValid]);

  // Generate document checklist
  const result = useMemo(() => {
    if (!application) {
      return {
        required: [],
        niceToHave: [],
        clarifications: validation.errors,
      };
    }
    return generateDocChecklist(application, overlays);
  }, [application, overlays, validation.errors]);

  // Generate explanations
  const explanations = useMemo(() => {
    if (!application) return [];
    return explain(application);
  }, [application]);

  const generate = () => {
    // Force regeneration by updating form data
    // This is handled by the form data dependency
  };

  const regenerate = (newFormData: any) => {
    // This would trigger a re-render with new form data
    // Implementation depends on how you manage form state
  };

  return {
    result,
    explanations,
    isValid: validation.isValid,
    validationErrors: validation.errors,
    generate,
    regenerate,
  };
}

/**
 * Hook to track document upload status
 */
export function useDocumentTracking(
  formData: any,
  uploadedDocuments: string[] = []
) {
  const { result } = useDocumentChecklist(formData);

  const tracking = useMemo(() => {
    return result.required.map(doc => ({
      ...doc,
      uploaded: uploadedDocuments.includes(doc.id),
      status: uploadedDocuments.includes(doc.id) ? 'complete' as const : 'pending' as const,
    }));
  }, [result.required, uploadedDocuments]);

  const stats = useMemo(() => {
    const complete = tracking.filter(t => t.uploaded).length;
    const pending = tracking.filter(t => !t.uploaded).length;
    const percentComplete = tracking.length > 0 
      ? Math.round((complete / tracking.length) * 100) 
      : 0;

    return {
      complete,
      pending,
      total: tracking.length,
      percentComplete,
      isComplete: pending === 0,
    };
  }, [tracking]);

  return {
    tracking,
    ...stats,
  };
}

/**
 * Hook to get document recommendations based on form progress
 */
export function useDocumentRecommendations(formData: any) {
  const { result, explanations } = useDocumentChecklist(formData);

  const recommendations = useMemo(() => {
    const recs: Array<{
      priority: 'high' | 'medium' | 'low';
      category: string;
      documents: typeof result.required;
      reason: string;
    }> = [];

    // High priority: Identity and income docs
    const identityDocs = result.required.filter(d => 
      d.id.includes('GOVT_ID') || d.id.includes('SSN') || d.id.includes('GREEN_CARD')
    );
    if (identityDocs.length > 0) {
      recs.push({
        priority: 'high',
        category: 'Identity Verification',
        documents: identityDocs,
        reason: 'Required for all borrowers to verify identity',
      });
    }

    // High priority: Income documentation
    const incomeDocs = result.required.filter(d => 
      d.id.includes('PAYSTUB') || d.id.includes('W2') || d.id.includes('TAX') || d.id.includes('VOE')
    );
    if (incomeDocs.length > 0) {
      recs.push({
        priority: 'high',
        category: 'Income Verification',
        documents: incomeDocs,
        reason: 'Required to verify ability to repay the loan',
      });
    }

    // Medium priority: Asset documentation
    const assetDocs = result.required.filter(d => 
      d.id.includes('BANK') || d.id.includes('BROKERAGE') || d.id.includes('GIFT')
    );
    if (assetDocs.length > 0) {
      recs.push({
        priority: 'medium',
        category: 'Asset Verification',
        documents: assetDocs,
        reason: 'Required to verify funds for down payment and closing costs',
      });
    }

    // Low priority: Property and program-specific docs
    const propertyDocs = result.required.filter(d => 
      d.id.includes('PURCHASE') || d.id.includes('CONDO') || d.id.includes('VA_COE') || d.id.includes('USDA')
    );
    if (propertyDocs.length > 0) {
      recs.push({
        priority: 'low',
        category: 'Property & Program Documentation',
        documents: propertyDocs,
        reason: 'Property-specific and program-specific requirements',
      });
    }

    return recs;
  }, [result.required]);

  return {
    recommendations,
    explanations,
  };
}








