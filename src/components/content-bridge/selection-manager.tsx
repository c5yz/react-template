/**
 * SelectionManager - Element selection with dev-tools-like UI
 * 
 * This component provides browser dev-tools-like element selection within an iframe:
 * - Blue hover highlights for element discovery
 * - Cyan selection highlights with element info tooltips
 * - Escape key support for clearing selection
 * - Automatic cleanup and state management
 * 
 * Used in combination with ContentBridge for parent-iframe communication
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SelectedElement } from '../../types/element';

interface SelectionManagerProps {
  isSelectMode: boolean;
  selectedElement: SelectedElement | null;
  onElementSelect: (elementData: SelectedElement) => void;
}

/**
 * Visual overlay component that highlights elements during selection
 * Uses dev-tools-like styling for hover and selection states
 */
const ElementOverlay = ({ element, selected = false }: { element: HTMLElement; selected?: boolean }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!element) return;
    
    const updateRect = () => setRect(element.getBoundingClientRect());
    updateRect();
    
    // Update overlay position on scroll/resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [element]);

  if (!rect) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 9999,
        border: selected ? '2px solid #22d3ee' : '2px solid #60a5fa',
        background: selected ? 'rgba(34,211,238,0.15)' : 'rgba(96,165,250,0.10)',
        transition: 'all 0.08s',
        boxSizing: 'border-box',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute',
          top: -24,
          left: 0,
          background: '#22d3ee',
          color: 'white',
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          {element.tagName.toLowerCase()}
          {element.className && (
            <span style={{ marginLeft: 4, opacity: 0.75 }}>
              .{element.className.split(' ')[0]}
            </span>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

/**
 * SelectionManager handles element selection within the iframe
 * 
 * Features:
 * - Hover highlighting with dev-tools-like UI
 * - Click selection with persistent highlighting
 * - Escape key to clear selection
 * - Automatic cleanup when selection mode is disabled
 */
export default function SelectionManager({ isSelectMode, selectedElement, onElementSelect }: SelectionManagerProps) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElementRef, setSelectedElementRef] = useState<HTMLElement | null>(null);

  // Track mouse movement for hover effects
  useEffect(() => {
    if (!isSelectMode) {
      setHoveredElement(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (element && element !== hoveredElement) {
        setHoveredElement(element);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isSelectMode, hoveredElement]);

  // Handle element selection on click
  useEffect(() => {
    if (!isSelectMode) return;

    const handleClick = (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (element) {
        // Prepare element data for parent
        const elementData: SelectedElement = {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          textContent: element.textContent, // Allow null as per DOM API
          innerHTML: element.innerHTML,
          outerHTML: element.outerHTML
        };
        
        onElementSelect(elementData);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isSelectMode, onElementSelect]);

  // Handle escape key to clear selection
  useEffect(() => {
    if (!isSelectMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredElement(null);
        // Note: selectedElement is now managed by parent, so we send a clear selection message
        onElementSelect(null as any); // This will clear the parent's selection
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, onElementSelect]);

  // Convert selectedElement data to DOM element reference for highlighting
  useEffect(() => {
    if (!selectedElement) {
      setSelectedElementRef(null);
      return;
    }

    // Find the DOM element that matches the selectedElement data
    // This is a simple approach - in production you might want more sophisticated matching
    const elements = document.querySelectorAll(selectedElement.tagName.toLowerCase());
    const matchingElement = Array.from(elements).find(el => {
      const htmlEl = el as HTMLElement;
      return htmlEl.className === selectedElement.className && 
             htmlEl.id === selectedElement.id &&
             htmlEl.textContent === selectedElement.textContent;
    }) as HTMLElement | undefined;

    setSelectedElementRef(matchingElement || null);
  }, [selectedElement]);

  if (!isSelectMode) return null;

  return (
    <>
      {/* Body style override for select mode */}
      <style>{`
        body {
          cursor: ${isSelectMode ? 'crosshair' : 'default'} !important;
        }
      `}</style>

      {/* Select mode indicator */}
      <div 
        style={{
          position: 'fixed',
          top: 8,
          left: 8,
          background: 'rgba(37, 99, 235, 0.9)',
          color: 'white',
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 4,
          zIndex: 10000,
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}
      >
        Click to select elements • Esc to exit
      </div>

      {/* Element overlays */}
      {hoveredElement && hoveredElement !== selectedElementRef && (
        <ElementOverlay element={hoveredElement} />
      )}
      {selectedElementRef && (
        <ElementOverlay element={selectedElementRef} selected />
      )}
    </>
  );
}