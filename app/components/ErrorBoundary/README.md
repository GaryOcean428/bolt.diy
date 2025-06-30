# ErrorBoundary Component

A robust React Error Boundary component that provides comprehensive error handling, user-friendly fallback UI, and automatic retry functionality.

## Overview

The ErrorBoundary component is a class-based React component that catches JavaScript errors anywhere in the child component tree, logs those errors, and displays a fallback UI instead of letting the component tree crash.

## Design Decisions

### 1. Class-based Component

- **Why**: React requires error boundaries to be class components with `componentDidCatch` lifecycle method
- **Trade-off**: While the rest of the app uses functional components, error boundaries must be classes

### 2. Retry Mechanism

- **Why**: Many errors are transient (network issues, race conditions) and can be resolved by retrying
- **Implementation**: Configurable retry count with exponential backoff to prevent infinite loops
- **Safety**: Maximum retry limits prevent infinite error-retry cycles

### 3. Comprehensive Logging

- **Why**: Error tracking is crucial for debugging and monitoring
- **Integration**: Uses the existing `logStore` system for consistency
- **Fallback**: If logging fails, falls back to console logging to ensure errors are never silently lost

### 4. Development vs Production Behavior

- **Development**: Shows detailed error information including stack traces and component stacks
- **Production**: Shows user-friendly messages while still logging detailed information
- **Configurable**: `showErrorDetails` prop allows manual override

### 5. Accessibility First

- **ARIA attributes**: Proper `role="alert"`, `aria-labelledby`, and `aria-describedby`
- **Screen reader support**: Hidden descriptions for buttons and actions
- **Keyboard navigation**: All interactive elements are properly focusable

### 6. Theme Integration

- **CSS Custom Properties**: Uses the app's existing CSS custom properties for consistent theming
- **Responsive Design**: Works well on both desktop and mobile devices

### 7. Error Categorization

- **Error IDs**: Unique identifiers for tracking specific error instances
- **Boundary IDs**: Identifies which error boundary caught the error (useful for multiple boundaries)
- **Enhanced Error Info**: Includes URL, user agent, timestamp for debugging

## API Reference

### ErrorBoundary Props

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  id?: string; // Unique identifier for this boundary
  maxRetries?: number; // Maximum retry attempts (default: 3)
  showErrorDetails?: boolean; // Show detailed error info (default: DEV mode)
  onError?: ErrorReportCallback; // Custom error handler
  onRetry?: RetryCallback; // Custom retry handler
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps> | React.ReactElement;
}
```

### Error Types

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorInfo {
  componentStack: string;
}
```

## Usage Examples

### Basic Usage

```tsx
import { ErrorBoundary } from '~/components/ErrorBoundary';

function MyComponent() {
  return (
    <ErrorBoundary>
      <SomeComponentThatMightFail />
    </ErrorBoundary>
  );
}
```

### Advanced Configuration

```tsx
import { ErrorBoundary } from '~/components/ErrorBoundary';

function MyComponent() {
  return (
    <ErrorBoundary
      id="feature-boundary"
      maxRetries={5}
      showErrorDetails={true}
      onError={(error, errorInfo, errorId) => {
        // Send to external error tracking service
        analytics.track('error_boundary_triggered', {
          errorId,
          message: error.message,
          stack: error.stack,
        });
      }}
      onRetry={() => {
        // Clear any cached data that might be causing issues
        clearFeatureCache();
      }}
    >
      <ComplexFeatureComponent />
    </ErrorBoundary>
  );
}
```

### Custom Fallback Component

```tsx
import { ErrorBoundary, ErrorBoundaryFallbackProps } from '~/components/ErrorBoundary';

const CustomErrorFallback: React.FC<ErrorBoundaryFallbackProps> = ({ error, resetError, canRetry }) => (
  <div className="custom-error-ui">
    <h2>Oops! Something went wrong in this feature</h2>
    <p>Error: {error.message}</p>
    {canRetry && <button onClick={resetError}>Try Again</button>}
  </div>
);

function MyComponent() {
  return (
    <ErrorBoundary fallback={CustomErrorFallback}>
      <FeatureComponent />
    </ErrorBoundary>
  );
}
```

### Multiple Error Boundaries

```tsx
function App() {
  return (
    <ErrorBoundary id="app-root" maxRetries={3}>
      <Header />

      <main>
        <ErrorBoundary id="sidebar" maxRetries={2}>
          <Sidebar />
        </ErrorBoundary>

        <ErrorBoundary id="content" maxRetries={1}>
          <MainContent />
        </ErrorBoundary>
      </main>

      <Footer />
    </ErrorBoundary>
  );
}
```

## Integration with Existing Systems

### Logging Integration

The ErrorBoundary automatically integrates with the app's existing logging system:

```typescript
// Automatically logged on error
logStore.logError('React Error Boundary caught an error', enhancedError, {
  errorId,
  boundaryId,
  componentStack,
  retryCount,
});

// Automatically logged on retry
logStore.logUserAction('Error boundary retry attempted', {
  boundaryId,
  retryCount,
  maxRetries,
  errorId,
});
```

### Theme System Integration

Uses the app's existing CSS custom properties:

```css
/* Automatically inherits theme colors */
.error-container {
  background: var(--bolt-elements-background-depth-1);
  color: var(--bolt-elements-textPrimary);
  border: var(--bolt-elements-borderColor);
}
```

## Differences from Remix ErrorBoundary

This ErrorBoundary complements (doesn't replace) the Remix ErrorBoundary:

| Feature  | React ErrorBoundary             | Remix ErrorBoundary         |
| -------- | ------------------------------- | --------------------------- |
| Catches  | JavaScript errors in components | Route loading/action errors |
| Scope    | Component tree                  | Route level                 |
| Retry    | Configurable retry logic        | Page reload only            |
| Logging  | Integrated with app logging     | Basic console logging       |
| Fallback | Customizable component          | Route-level error page      |

## Best Practices

### 1. Granular Boundaries

Place error boundaries around logical feature areas, not just at the root:

```tsx
// Good: Granular boundaries
<ErrorBoundary id="chat-feature">
  <ChatInterface />
</ErrorBoundary>

<ErrorBoundary id="file-explorer">
  <FileExplorer />
</ErrorBoundary>

// Avoid: Only root boundary (one error crashes everything)
<ErrorBoundary id="app-root">
  <ChatInterface />
  <FileExplorer />
  <Editor />
</ErrorBoundary>
```

### 2. Meaningful IDs

Use descriptive boundary IDs for easier debugging:

```tsx
// Good
<ErrorBoundary id="user-profile-form">
<ErrorBoundary id="payment-processor">
<ErrorBoundary id="code-editor-main">

// Avoid
<ErrorBoundary id="boundary1">
<ErrorBoundary id="comp">
```

### 3. Context-Specific Error Handling

```tsx
// Provide context-specific error handling
<ErrorBoundary
  id="api-form"
  onError={(error, errorInfo, errorId) => {
    if (error.message.includes('network')) {
      // Handle network errors specifically
      notifyUser('Network connection issue');
    } else if (error.message.includes('validation')) {
      // Handle validation errors specifically
      highlightInvalidFields();
    }
  }}
>
  <ApiForm />
</ErrorBoundary>
```

### 4. Error Recovery

```tsx
<ErrorBoundary
  id="data-dashboard"
  onRetry={() => {
    // Clear stale data on retry
    clearDashboardCache();
    refreshUserData();
  }}
>
  <Dashboard />
</ErrorBoundary>
```

## Testing

The ErrorBoundary includes comprehensive tests covering:

- Error catching and fallback UI rendering
- Retry functionality and limits
- Logging integration
- Custom error handlers
- Accessibility features
- Error recovery scenarios

Run tests with:

```bash
npm test ErrorBoundary
```

## Performance Considerations

### Memory Management

- Cleans up timers in `componentWillUnmount`
- Limits retry attempts to prevent memory leaks
- Throttles error logging to prevent spam

### Bundle Size

- Tree-shakeable exports
- Optional fallback components
- Minimal dependencies

### Runtime Performance

- Efficient error state management
- Lazy error ID generation
- Optimized re-renders

## Troubleshooting

### Common Issues

1. **Error boundaries don't catch async errors**

   - Solution: Use the global error handlers in App.tsx for unhandled promises

2. **Error boundary doesn't catch event handler errors**

   - Solution: Wrap event handlers in try-catch blocks

3. **Development error overlay conflicts**
   - Solution: Disable React DevTools error overlay in development if needed

### Debugging

Check the browser console for:

- Error boundary activation logs
- Retry attempt logs
- Fallback logging if logStore fails

Check the app's log store for:

- Structured error information
- Retry history
- User actions

## Contributing

When modifying the ErrorBoundary:

1. Ensure backward compatibility
2. Add tests for new functionality
3. Update documentation
4. Consider accessibility impact
5. Test in both development and production modes
