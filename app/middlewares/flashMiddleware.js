/**
 * Flash Session Middleware for NodeFlow
 * Automatically maps session flash variables to template locals and deletes them.
 */
function flashMiddleware(req, res, next) {
  if (req.session) {
    // Collect all flash variables
    const flashes = {};
    
    Object.keys(req.session).forEach(key => {
      if (key.startsWith('flash_')) {
        flashes[key] = req.session[key];
        
        // Copy to res.locals so EJS templates can directly access <%= flash_success %>
        res.locals[key] = req.session[key];
        
        // Delete from session so they are only displayed once
        delete req.session[key];
      }
    });

    // Provide a helper object in locals
    res.locals.flashes = flashes;
  } else {
    res.locals.flashes = {};
  }

  next();
}

module.exports = flashMiddleware;
