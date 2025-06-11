// Wrapper for react-dom/server to handle ESM/CommonJS compatibility
import ReactDOMServer from 'react-dom/server';

// Extract the methods we need
export const renderToReadableStream =
  ReactDOMServer.renderToReadableStream || ReactDOMServer.default?.renderToReadableStream;
export const renderToString = ReactDOMServer.renderToString || ReactDOMServer.default?.renderToString;
export const renderToStaticMarkup = ReactDOMServer.renderToStaticMarkup || ReactDOMServer.default?.renderToStaticMarkup;

// Export default as well
export default ReactDOMServer;
