# Content Bridge

The Content Bridge component enables iframe-parent communication for the Fursor AI UI Designer. It provides:

- **Element Selection**: Dev-tools-like element selection with visual feedback
- **Context Menu**: Right-click menu for element manipulation
- **Analyzer Overlay**: Visual feedback during AI processing
- **Parent Communication**: Handles postMessage communication with the parent window

## Usage

The ContentBridge is automatically included in the App component:

```tsx
import { ContentBridge } from './components/content-bridge';

export function App() {
  return (
    <>
      <ContentBridge />
      {/* Your app content */}
    </>
  );
}
```

## How it Works

1. **Selection Mode**: When the parent window enables selection mode, users can hover and click elements
2. **Element Data**: Selected element information is sent to the parent window
3. **Context Menu**: Right-click on elements to access AI features
4. **Processing Feedback**: Shows visual feedback while AI processes requests

## Communication Protocol

The component listens for these parent window messages:
- `setSelectMode`: Enable/disable element selection
- `setAnalyzing`: Show/hide analyzer overlay

And sends these messages to the parent:
- `elementSelected`: When an element is clicked
- `contentReady`: When the iframe is loaded
- `heightChanged`: When content height changes

## Components

### `ContentBridge`
- Communication layer between parent window and iframe
- Manages postMessage protocol for selection mode state
- Measures and communicates content height to parent
- Forwards element selections back to parent

### `SelectionManager`
- Core selection logic and UI within iframe
- Handles mouse tracking, click detection, and keyboard shortcuts
- Renders dev-tools-like overlays and tooltips

## Usage

The components are automatically included in the Next.js layout and handle both content measurement and element selection when activated by the parent.

## Architecture

```
Parent Window (content-viewer.tsx)
    ↓ SET_SELECT_MODE
ContentBridge (communication & measurement)
    ↓ isSelectMode + CONTENT_HEIGHT_CHANGED
SelectionManager (UI & logic)
    ↓ ELEMENT_SELECTED
Parent Window (onElementSelect + height updates)
```