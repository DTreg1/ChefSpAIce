/**
 * Debug mode to trace the source of the "Unexpected text node" error.
 * This will log the full stack trace when the error occurs.
 */

if (typeof window !== 'undefined') {
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (firstArg.includes('Unexpected text node')) {
      errorCount++;
      const stack = new Error().stack;
      const stackLines = stack ? stack.split('\n').slice(0, 20) : [];
      console.log('[DEBUG] Error count:', errorCount);
      console.log('[DEBUG] Stack lines:');
      stackLines.forEach((line, i) => console.log(`[STACK ${i}]:`, line));
    }
    return originalError.apply(console, args);
  };
}
