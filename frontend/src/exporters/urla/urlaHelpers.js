/**
 * Shared helpers for URLA export modules
 */

/**
 * Trigger a browser file download from a string blob
 */
export const downloadBlobAsFile = (content, filename, mimeType = 'application/xml') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * XML declaration header
 */
export const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';
