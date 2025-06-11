// Wrapper for react-dom/server to handle ESM/CommonJS compatibility
import * as ReactDOMServerModule from 'react-dom/server';

// Handle both ESM and CommonJS module formats
const ReactDOMServer = ReactDOMServerModule.default || ReactDOMServerModule;

// Extract the methods we need with proper fallbacks
export const renderToReadableStream =
  ReactDOMServer.renderToReadableStream || ReactDOMServerModule.renderToReadableStream;

export const renderToString = ReactDOMServer.renderToString || ReactDOMServerModule.renderToString;

export const renderToStaticMarkup = ReactDOMServer.renderToStaticMarkup || ReactDOMServerModule.renderToStaticMarkup;

export const renderToPipeableStream =
  ReactDOMServer.renderToPipeableStream || ReactDOMServerModule.renderToPipeableStream;

// Export default as well
export default ReactDOMServer;
