const fs = require('fs');
const path = require('path');

/**
   * Levenshtein Distance Calculator for Variable Suggestions
   */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Extracts lines around the error
 */
function getCodeContext(filePath, line, contextLines = 3) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const start = Math.max(0, line - contextLines - 1);
    const end = Math.min(lines.length, line + contextLines);

    const context = [];
    for (let i = start; i < end; i++) {
      const marker = (i + 1 === line) ? ' >>> ' : '     ';
      context.push(`${marker}${i + 1}: ${lines[i]}`);
    }
    return context.join('\n');
  } catch (err) {
    return null;
  }
}

/**
 * Search file contents for local variables and suggest close matches
 */
function findSimilarVariables(filePath, varName) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Match variables (const, let, var, parameters, properties)
    const matches = content.matchAll(/\b(const|let|var)\s+(\w+)\b/g);
    const variables = new Set();
    for (const match of matches) {
      variables.add(match[2]);
    }

    const similar = [];
    for (const v of variables) {
      const dist = levenshtein(varName, v);
      if (dist <= 2 && dist > 0) {
        similar.push(v);
      }
    }
    return similar;
  } catch (err) {
    return [];
  }
}

/**
 * Enhanced Intelligent Error Handler Middleware
 */
module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isApi = req.xhr || req.headers.accept?.indexOf('json') > -1 || req.path.startsWith('/api/');

  // Parse file and line number from error stack trace
  let errorFile = 'Unknown';
  let errorLine = 0;
  
  if (err.stack) {
    // Regex matching standard Node stack frames e.g., "at HomeController.index (d:\nodejs\express-js\app\controllers\HomeController.js:12:9)"
    const match = err.stack.match(/at\s+.*?\((.*?):(\d+):(\d+)\)/) || err.stack.match(/at\s+(.*?):(\d+):(\d+)/);
    if (match) {
      errorFile = match[1];
      errorLine = parseInt(match[2]);
    }
  }

  const error = {
    type: err.name || 'Runtime Error',
    message: err.message || 'An unexpected error occurred.',
    file: errorFile,
    line: errorLine,
    severity: err.status >= 500 ? 'critical' : 'high',
    stack: err.stack || ''
  };

  // 1. Return API JSON payload if applicable
  if (isApi) {
    return res.status(err.status || 500).json({
      status: 'error',
      success: false,
      error: {
        type: error.type,
        message: error.message,
        file: path.basename(error.file),
        line: error.line
      }
    });
  }

  // 2. Perform Intelligent Suggestions & Code View Analysis
  const codeContext = getCodeContext(error.file, error.line);
  const possibleCauses = [];
  let autoFix = null;

  // Analyze variable typos
  if (error.message.includes('is not defined')) {
    const match = error.message.match(/(\w+)\s+is\s+not\s+defined/);
    if (match) {
      const varName = match[1];
      possibleCauses.push(`Referenced variable '${varName}' is not declared in this scope.`);
      possibleCauses.push(`Spelling typo or variable scoping issue.`);
      
      const similar = findSimilarVariables(error.file, varName);
      if (similar.length > 0) {
        autoFix = {
          type: 'variable_name',
          suggestion: `Did you mean: ${similar.join(', ')}?`,
          items: similar
        };
      }
    }
  }

  // Analyze database issues
  if (error.message.toLowerCase().includes('sql') || error.message.toLowerCase().includes('database') || error.message.toLowerCase().includes('connection')) {
    possibleCauses.push('Database credentials in .env are mismatching.');
    possibleCauses.push('Requested database, table, or column does not exist.');
    possibleCauses.push('SQL syntax error.');
  }

  const searchLinks = {
    google: `https://www.google.com/search?q=${encodeURIComponent('NodeJS ' + error.message)}`,
    stackoverflow: `https://stackoverflow.com/search?q=${encodeURIComponent('NodeJS ' + error.message)}`
  };

  // Render a highly aesthetic terminal-styled debug block
  res.status(err.status || 500);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NodeFlow Debugger — Error Caught</title>
      <style>
        body { background: #0f172a; color: #f8fafc; font-family: monospace; padding: 40px; margin: 0; line-height: 1.6; }
        .error-container { max-width: 1000px; margin: 0 auto; background: rgba(30, 41, 59, 0.7); border: 2px solid #ef4444; border-radius: 12px; padding: 30px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 20px; }
        .error-type { font-size: 24px; color: #ef4444; margin: 0; font-weight: bold; }
        .search-btn { display: inline-flex; align-items: center; text-decoration: none; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; margin-left: 8px; transition: opacity 0.2s; }
        .search-btn:hover { opacity: 0.9; }
        .meta-info { margin-bottom: 25px; font-size: 15px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; }
        .code-box { background: #0b0f19; color: #dfe0e0; padding: 20px; border-radius: 8px; border-left: 8px solid #ef4444; overflow-x: auto; margin-bottom: 25px; font-size: 14px; }
        .code-highlight { color: #f43f5e; font-weight: bold; }
        .suggestions-box { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-left: 8px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
        .suggestions-title { color: #10b981; font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 10px; }
        .suggestions-list { margin: 0; padding-left: 20px; }
        .stack-trace { background: rgba(0,0,0,0.4); padding: 20px; border-radius: 8px; font-size: 12px; overflow-y: auto; max-height: 300px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); }
        .stack-title { font-weight: bold; color: #cbd5e1; margin-bottom: 10px; display: block; }
        .env-snapshot { margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        .env-title { font-weight: bold; font-size: 15px; color: #cbd5e1; margin-bottom: 12px; display: block; }
        .env-details { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); }
        summary { cursor: pointer; color: #94a3b8; font-weight: bold; outline: none; }
      </style>
    </head>
    <body>
      <div class="error-container">
        
        <div class="header">
          <h2 class="error-type">🚨 ${error.type} Caught</h2>
          <div>
            <a href="${searchLinks.google}" target="_blank" class="search-btn" style="background: #4285F4;">🔍 Search Google</a>
            <a href="${searchLinks.stackoverflow}" target="_blank" class="search-btn" style="background: #F48024;">🥞 Stack Overflow</a>
          </div>
        </div>

        <div class="meta-info">
          <strong>Message:</strong> ${error.message}<br>
          <strong>File:</strong> ${error.file} (Line ${error.line})
        </div>

        ${codeContext ? `
          <div class="code-box">
            <strong style="color: #cbd5e1; display: block; margin-bottom: 10px;">💻 Code Preview:</strong>
            <pre style="margin: 0; white-space: pre-wrap;">${codeContext.replace(/>>>\s*(\d+):(.*)/g, (m, lineNum, code) => `<span class="code-highlight"> >>> ${lineNum}:${code}</span>`)}</pre>
          </div>
        ` : ''}

        ${(possibleCauses.length > 0 || autoFix) ? `
          <div class="suggestions-box">
            <h3 class="suggestions-title">💡 NodeFlow Intelligent Suggestions:</h3>
            <ul class="suggestions-list">
              ${autoFix ? `<li style="color: #f43f5e; font-weight: bold; margin-bottom: 10px; list-style-type: '🚀 ';">${autoFix.suggestion}</li>` : ''}
              ${possibleCauses.map(cause => `<li>${cause}</li>`).join('')}
              <li>Verify variable scoping, imports, or SQL schemas in config files.</li>
            </ul>
          </div>
        ` : ''}

        <div class="stack-trace">
          <span class="stack-title">📋 Backtrace:</span>
          <pre style="margin: 0; white-space: pre-wrap;">${error.stack}</pre>
        </div>

        <div class="env-snapshot">
          <span class="env-title">🌐 Server Environment Snapshot</span>
          
          <details class="env-details">
            <summary>HTTP Headers (${Object.keys(req.headers).length})</summary>
            <pre style="margin-top: 10px; color: #94a3b8; font-size: 12px;">${JSON.stringify(req.headers, null, 2)}</pre>
          </details>

          <details class="env-details">
            <summary>Query Parameters (${Object.keys(req.query).length})</summary>
            <pre style="margin-top: 10px; color: #94a3b8; font-size: 12px;">${JSON.stringify(req.query, null, 2)}</pre>
          </details>

          <details class="env-details">
            <summary>Request Body (${Object.keys(req.body || {}).length})</summary>
            <pre style="margin-top: 10px; color: #94a3b8; font-size: 12px;">${JSON.stringify(req.body || {}, null, 2)}</pre>
          </details>
        </div>

      </div>
    </body>
    </html>
  `);
};
