/**
 * Represents a selected HTML element with properties commonly used in dev tools
 * and standard HTML element inspection.
 * 
 * This type is shared between the iframe content and the parent application
 * to ensure consistent element data structure.
 */
export interface SelectedElement {
  /** The HTML tag name (e.g., 'div', 'span', 'p') */
  tagName: string;
  
  /** The CSS class names as a space-separated string */
  className: string;
  
  /** The element's ID attribute */
  id: string;
  
  /** The plain text content of the element */
  textContent: string | null;
  
  /** The HTML content inside the element */
  innerHTML: string;
  
  /** The complete HTML including the element itself */
  outerHTML: string;
}