import { useEffect, useState } from 'react';
import { SelectedElement } from '../../types/element';
import SelectionManager from './selection-manager';
import AnalyzerOverlay from './analyzer-overlay';
import ContextMenuManager from './context-menu-manager';

/**
 * ContentBridge manages communication between the parent window and content components
 * 
 * This component:
 * - Listens for SET_SELECT_MODE messages from parent
 * - Forwards selection results back to parent via ELEMENT_SELECTED messages
 * - Measures and communicates content height to parent
 * - Acts as the communication layer between iframe and parent window
 */
export default function ContentBridge() {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerTarget, setAnalyzerTarget] = useState<SelectedElement | null>(null);


  // Listen for messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SET_SELECT_MODE') {
        setIsSelectMode(event.data.enabled);
      } else if (event.data.type === 'SET_SELECTED_ELEMENT') {
        setSelectedElement(event.data.element);
      } else if (event.data.type === 'START_ANALYZER_ANIMATION') {
        setIsAnalyzing(true);
        setAnalyzerTarget(event.data.targetElement);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Measure and communicate content height to parent
  useEffect(() => {
    const measureAndSendHeight = () => {
      // Wait for content to be fully rendered
      setTimeout(() => {
        // Get the actual content height, accounting for viewport-based heights
        const measuredHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
        
        // Apply maximum height constraint to prevent infinite growth
        const contentHeight = Math.min(measuredHeight, 6400); // Maximum reasonable height for a typical landing page
        
        // Send height to parent with minimum height for iframe context
        window.parent.postMessage({
          type: 'CONTENT_HEIGHT_CHANGED',
          height: Math.max(contentHeight, 800) // Minimum height for iframe
        }, '*');
      }, 100);
    };

    // Measure initially when page loads
    measureAndSendHeight();

    // Re-measure when content changes (e.g., dynamic content loading)
    const resizeObserver = new ResizeObserver(() => {
      measureAndSendHeight();
    });
    
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Forward element selections to parent
  const handleElementSelect = (elementData: SelectedElement) => {
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      element: elementData
    }, '*');
  };

  // Handle analyzer animation completion
  const handleAnalyzerComplete = () => {
    setIsAnalyzing(false);
    setAnalyzerTarget(null);
    window.parent.postMessage({
      type: 'ANALYZER_ANIMATION_COMPLETE',
      success: true
    }, '*');
  };

  return (
    <>
      <SelectionManager 
        isSelectMode={isSelectMode} 
        selectedElement={selectedElement}
        onElementSelect={handleElementSelect}
      />
      <AnalyzerOverlay 
        isActive={isAnalyzing}
        targetElement={analyzerTarget}
        onComplete={handleAnalyzerComplete}
      />
      <ContextMenuManager
        isSelectMode={isSelectMode}
        selectedElement={selectedElement}
        onElementSelect={handleElementSelect}
      />
    </>
  );
}