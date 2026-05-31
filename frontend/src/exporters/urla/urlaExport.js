/**
 * URLA (Uniform Residential Loan Application) Export Utilities
 *
 * Thin orchestrator — delegates to section-specific modules:
 *   - mismoClosingExport.js  — MISMO 3.4 Closing XML
 *   - mismoFnmExport.js      — MISMO 3.4 FNM (Fannie Mae) XML
 *   - urlaHtmlExport.js       — URLA HTML print view
 *   - urlaHelpers.js          — shared download / formatting helpers
 */

import { downloadMISMO34Closing } from './mismoClosingExport';
import { downloadMISMO34FNM } from './mismoFnmExport';

// MISMO 3.4 Closing
export { exportToMISMO34Closing, downloadMISMO34Closing } from './mismoClosingExport';

// MISMO 3.4 FNM (Fannie Mae)
export { exportToMISMO34FNM, downloadMISMO34FNM } from './mismoFnmExport';

// URLA HTML print
export { printURLAFormat } from './urlaHtmlExport';

// Legacy download helper — kept for backwards compatibility
export const downloadXML = (formData, format = 'closing') => {
  if (format === 'fnm') {
    downloadMISMO34FNM(formData);
  } else {
    downloadMISMO34Closing(formData);
  }
};
