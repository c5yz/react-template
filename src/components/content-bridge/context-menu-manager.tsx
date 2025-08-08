import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SelectedElement } from '../../types/element';
import { Copy, Download, Wand2, FileText } from 'lucide-react';

interface ContextMenuManagerProps {
  isSelectMode: boolean;
  selectedElement: SelectedElement | null;
  onElementSelect: (elementData: SelectedElement) => void;
}

/**
 * ContextMenuManager - Right-click context menu for element interactions
 * 
 * This component provides:
 * - Right-click detection on any element (works independently of select mode)
 * - Automatic element highlighting with amber border and tooltip
 * - Context menu with "Duplicate" and "Export Code" options
 * - Console logging of actions with element data and page context
 * - Integration with existing content-bridge architecture
 * 
 * Used in combination with ContentBridge for iframe-parent communication
 */
export default function ContextMenuManager({ 
  isSelectMode, 
  selectedElement,
  onElementSelect 
}: ContextMenuManagerProps) {
  const [contextMenuElement, setContextMenuElement] = useState<HTMLElement | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update highlight position when element changes or window scrolls/resizes
  useEffect(() => {
    if (!contextMenuElement) return;

    const updateHighlight = () => {
      const rect = contextMenuElement.getBoundingClientRect();
      setHighlightRect(rect);
    };

    updateHighlight();

    // Update on scroll/resize to keep highlight in sync
    window.addEventListener('scroll', updateHighlight, true);
    window.addEventListener('resize', updateHighlight);
    
    return () => {
      window.removeEventListener('scroll', updateHighlight, true);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [contextMenuElement]);

  // Handle right-click context menu - works regardless of select mode
  useEffect(() => {

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (element) {
        setContextMenuElement(element);
        
        // Get element bounds for highlighting
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Calculate position with viewport bounds checking
        let x = e.clientX;
        let y = e.clientY;
        
        const menuWidth = 220;
        const menuHeight = 130; // Approximate height for single section
        
        if (x + menuWidth > window.innerWidth) {
          x = window.innerWidth - menuWidth - 10;
        }
        
        if (y + menuHeight > window.innerHeight) {
          y = window.innerHeight - menuHeight - 10;
        }
        
        setMenuPosition({ x, y });
        setContextMenuOpen(true);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []); // No dependencies - always active

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuOpen(false);
        setContextMenuElement(null);
        setHighlightRect(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuOpen(false);
        setContextMenuElement(null);
        setHighlightRect(null);
      }
    };

    if (contextMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenuOpen]);

  const handleMenuAction = (action: string, scope: 'element') => {
    if (!contextMenuElement) return;

    // Prepare element data matching SelectedElement interface
    const elementData: SelectedElement = {
      tagName: contextMenuElement.tagName,
      className: contextMenuElement.className,
      id: contextMenuElement.id,
      textContent: contextMenuElement.textContent,
      innerHTML: contextMenuElement.innerHTML,
      outerHTML: contextMenuElement.outerHTML
    };

    // Generate logical prompt based on action (only element scope now)
    const generatePrompt = (action: string, scope: 'element') => {
      // Determine if we're in a page or component context based on the current URL path
      const currentPath = window.location.pathname;
      const isComponentContext = currentPath.includes('/components/');
      const toolType = isComponentContext ? '@create_component' : '@create_page';
      
      switch (action) {
        case 'Extract Element':
          return `Please ${toolType} with the selected element.`;
        case 'Generate Variants':
          return `Please create 3 variants of selected element using ${toolType}`;
        default:
          return `Please perform "${action}" on the selected element.`;
      }
    };

    const prompt = generatePrompt(action, scope);

    // Send message to parent window to handle the context menu action
    window.parent.postMessage({
      type: 'CONTEXT_MENU_ACTION',
      action: action,
      scope: scope,
      selectedElement: elementData,
      prompt: prompt,
      currentFile: window.location.pathname,
      currentPage: window.location.href,
      timestamp: new Date().toISOString()
    }, '*');

    // Console log for debugging
    console.log('Context Menu Action:', {
      action: action,
      scope: scope,
      selectedElement: elementData,
      prompt: prompt,
      currentFile: window.location.pathname,
      currentPage: window.location.href,
      timestamp: new Date().toISOString()
    });

    // Close the menu and clear highlight
    setContextMenuOpen(false);
    setContextMenuElement(null);
    setHighlightRect(null);
  };

  // Only render if we have a context menu open
  if (!contextMenuOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" />
      
      {/* Element Highlight Overlay */}
      {highlightRect && (
        <div
          className="fixed pointer-events-none z-[9998] transition-all duration-200"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            border: '2px solid #f59e0b', // amber-500 for context menu highlight
            background: 'rgba(245, 158, 11, 0.15)', // Subtle amber background
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        >
          {/* Element info tooltip */}
          {contextMenuElement && (
            <div 
              className="absolute bg-amber-500 text-black text-xs px-2 py-1 rounded whitespace-nowrap font-medium"
              style={{
                top: -28,
                left: 0,
              }}
            >
              {contextMenuElement.tagName.toLowerCase()}
              {contextMenuElement.className && (
                <span className="ml-1 opacity-75">
                  .{contextMenuElement.className.split(' ')[0]}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Context Menu - Dark Mode Styled with Sections */}
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg py-2 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-100"
        style={{
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`
        }}
      >
        <button
          onClick={() => handleMenuAction('Extract Element', 'element')}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors text-zinc-200 hover:bg-zinc-700 hover:text-white cursor-pointer"
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span>Extract Element</span>
        </button>
        
        <button
          onClick={() => handleMenuAction('Generate Variants', 'element')}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors text-zinc-200 hover:bg-zinc-700 hover:text-white cursor-pointer"
        >
          <Wand2 className="h-4 w-4 flex-shrink-0" />
          <span>Generate Variants</span>
        </button>
      </div>
    </>,
    document.body
  );
}