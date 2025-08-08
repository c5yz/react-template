import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SelectedElement } from '../../types/element';

interface AnalyzerOverlayProps {
  isActive: boolean;
  targetElement: SelectedElement | null;
  onComplete: () => void;
}

/**
 * AnalyzerOverlay - Provides visual feedback during API analyzer processing
 * 
 * This component:
 * - Renders a 3-second scanning laser animation
 * - Shows "Target element found" message positioned next to selected element
 * - Shows "Passing final details to LLM..." message positioned contextually
 * - Manages user expectations during API processing
 * - Uses existing overlay infrastructure from SelectionManager
 */
export default function AnalyzerOverlay({ isActive, targetElement, onComplete }: AnalyzerOverlayProps) {
  const [scanPhase, setScanPhase] = useState<'down' | 'up' | 'down2' | 'up2' | 'target-found' | 'context-enhancing' | 'complete'>('down');
  const [laserPosition, setLaserPosition] = useState(0);
  const [showTargetFound, setShowTargetFound] = useState(false);
  const [showContextEnhancing, setShowContextEnhancing] = useState(false);
  const [targetElementRef, setTargetElementRef] = useState<HTMLElement | null>(null);

  // Convert selectedElement data to DOM element reference
  useEffect(() => {
    if (!targetElement) {
      setTargetElementRef(null);
      return;
    }

    // Find matching DOM element (reuse logic from SelectionManager)
    const elements = document.querySelectorAll(targetElement.tagName.toLowerCase());
    const matchingElement = Array.from(elements).find(el => {
      const htmlEl = el as HTMLElement;
      return htmlEl.className === targetElement.className && 
             htmlEl.id === targetElement.id &&
             htmlEl.textContent === targetElement.textContent;
    }) as HTMLElement | undefined;

    setTargetElementRef(matchingElement || null);
  }, [targetElement]);

  // 5.5-second animation sequence with enhanced messaging
  useEffect(() => {
    if (!isActive) return;

    
    const runAnalyzerSequence = async () => {
      // Phase 1: Down (750ms)
      await animateLaser('down', 750);
      setScanPhase('up');
      
      // Phase 2: Up (750ms)
      await animateLaser('up', 750);
      setScanPhase('down2');
      
      // Phase 3: Down again (750ms)
      await animateLaser('down', 750);
      setScanPhase('up2');
      
      // Phase 4: Up again (750ms)
      await animateLaser('up', 750);
      setScanPhase('target-found');
      
      // Show "Target element found" if element exists
      if (targetElementRef) {
        setShowTargetFound(true);
        setTimeout(() => {
          setScanPhase('context-enhancing');
          setShowTargetFound(false);
          setShowContextEnhancing(true);
          
          // Show context enhancing message for 1.5 seconds
          setTimeout(() => {
            setShowContextEnhancing(false);
            setScanPhase('complete');
            onComplete();
          }, 1500);
        }, 1000);
      } else {
        setScanPhase('complete');
        onComplete();
      }
    };
    
    runAnalyzerSequence();
  }, [isActive, targetElementRef, onComplete]);

  const animateLaser = (direction: 'up' | 'down', duration: number) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const startPos = direction === 'down' ? 0 : window.innerHeight;
      const endPos = direction === 'down' ? window.innerHeight : 0;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        setLaserPosition(startPos + (endPos - startPos) * easeProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  };

  if (!isActive) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10001, // Above selection overlays
        background: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Laser scanning line */}
      <div
        style={{
          position: 'absolute',
          top: laserPosition,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)',
          boxShadow: '0 0 20px #22d3ee, 0 0 40px #22d3ee',
          opacity: scanPhase === 'complete' || scanPhase === 'target-found' || scanPhase === 'context-enhancing' ? 0 : 1,
          transition: 'opacity 0.5s',
        }}
      />
      
      {/* Subtle scan lines background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.03) 2px, rgba(34, 211, 238, 0.03) 4px)',
          opacity: 0.5,
        }}
      />

      {/* Target found message */}
      {showTargetFound && targetElementRef && (
        <TargetFoundMessage element={targetElementRef} />
      )}

      {/* Context enhancing message - positioned next to target element */}
      {showContextEnhancing && targetElementRef && (
        <ContextEnhancingMessage element={targetElementRef} />
      )}
    </div>,
    document.body
  );
}

// Target found message component
const TargetFoundMessage = ({ element }: { element: HTMLElement }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!element) return;
    
    const updateRect = () => setRect(element.getBoundingClientRect());
    updateRect();
    
    // Show message after brief delay
    const timer = setTimeout(() => setVisible(true), 200);
    
    return () => clearTimeout(timer);
  }, [element]);

  if (!rect || !visible) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.top + rect.height / 2 - 20,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        background: '#22d3ee',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: 10002,
        boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)',
        animation: 'fadeInScale 0.3s ease-out',
      }}
    >
      🎯 Target element found
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

// Context enhancing message component - positioned next to target element
const ContextEnhancingMessage = ({ element }: { element: HTMLElement }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!element) return;
    
    const updateRect = () => setRect(element.getBoundingClientRect());
    updateRect();
    
    // Update on scroll/resize to follow element
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [element]);

  if (!rect) return null;

  // Position message to the right of element, or below if no space
  const hasSpaceRight = rect.right + 300 < window.innerWidth;
  const messageTop = hasSpaceRight ? rect.top + rect.height / 2 - 20 : rect.bottom + 12;
  const messageLeft = hasSpaceRight ? rect.right + 12 : rect.left;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: messageTop,
        left: messageLeft,
        background: 'rgba(30, 41, 59, 0.95)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 10003,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(34, 211, 238, 0.3)',
        animation: 'analyzerMessageSlideIn 0.3s ease-out forwards',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(34, 211, 238, 0.2)',
        maxWidth: '280px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#22d3ee',
          boxShadow: '0 0 6px #22d3ee',
          animation: 'analyzerPulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span>Passing final details to LLM...</span>
      </div>
      <style>{`
        @keyframes analyzerMessageSlideIn {
          from {
            opacity: 0;
            transform: ${hasSpaceRight ? 'translateX(-8px)' : 'translateY(-8px)'} scale(0.95);
          }
          to {
            opacity: 1;
            transform: ${hasSpaceRight ? 'translateX(0)' : 'translateY(0)'} scale(1);
          }
        }
        @keyframes analyzerPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};