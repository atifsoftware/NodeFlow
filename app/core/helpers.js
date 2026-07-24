const requestContext = require('./RequestContext');
const Flash = require('./Flash');

// Bind Core Libraries globally to allow require-free, clean access across controllers & models
global.DB = require('../../config/db');
global.Cache = require('./Cache');
global.Logger = require('./Logger');
global.Flash = Flash;
global.Gate = require('./Gate');
global.ApiResource = require('./ApiResource');
global.Queue = require('./Queue');

/**
 * NodeFlow Global Helper Functions
 * Attaches convenient utility functions to the global scope, modeled after NovaFlow.
 */

// 1. env helper
global.env = function(key, defaultValue = null) {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
};

// 2. base_url, url, and asset helpers
global.base_url = function(path = '') {
  const base = process.env.BASE_URL || '';
  return base + '/' + String(path).replace(/^\/+/, '');
};

global.url = function(path = '') {
  return '/' + String(path).replace(/^\/+/, '');
};

global.asset = function(path = '') {
  return '/assets/' + String(path).replace(/^\/+/, '');
};

// 3. Dump and Die (dd) helper
// Safely halts the active request, rendering a styled debug dump box.
global.dd = function(...vars) {
  const store = requestContext.getStore();
  if (store && store.res) {
    const res = store.res;
    let html = `
      <div style="background: #18171B; color: #FFF; padding: 25px; border-radius: 12px; margin: 20px; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; overflow: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h4 style="margin-top:0; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:10px; color:#0ea5e9; display:flex; align-items:center; gap:8px;">
          <span style="background:#0ea5e9; color:#18171b; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold;">DD</span>
          NodeFlow Dump & Die
        </h4>
    `;

    vars.forEach(v => {
      const type = typeof v;
      let stringified = '';
      try {
        stringified = JSON.stringify(v, null, 2);
      } catch (e) {
        stringified = String(v);
      }

      html += `
        <div style="margin-bottom: 20px;">
          <span style="color: #6edc5f; font-weight: bold;">Type: ${type}</span>
          <pre style="background: #232226; padding: 15px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); overflow-x: auto; color: #f8fafc; margin-top: 8px;">${escapeHtml(stringified)}</pre>
        </div>
      `;
    });

    html += `</div>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(html);
  } else {
    // CLI fallback
    console.log('\x1b[35m=== DUMP ===\x1b[0m');
    vars.forEach(v => console.dir(v, { depth: null, colors: true }));
    process.exit(1);
  }
};

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 4. flash helper (sets message, or outputs Alert HTML if retrieved)
global.flash = function(name = '', message = '', className = 'alert alert-success') {
  const store = requestContext.getStore();
  if (!store || !store.req) return '';

  const req = store.req;

  if (name !== '') {
    if (message !== '') {
      // Set flash
      Flash.set(name, message, className);
    } else {
      // Get flash & output HTML alert
      const flashMsgKey = `flash_${name}`;
      const flashClassKey = `flash_${name}_class`;

      // Check session or res.locals (middleware maps session to locals)
      const msg = req.session[flashMsgKey] || (store.res.locals && store.res.locals[flashMsgKey]);
      const cssClass = req.session[flashClassKey] || (store.res.locals && store.res.locals[flashClassKey]) || className;

      // Consume session keys
      delete req.session[flashMsgKey];
      delete req.session[flashClassKey];

      if (!msg) return '';

      const isError = name === 'error' || cssClass.includes('danger');
      const icon = isError ? 'fa-exclamation-circle' : 'fa-check-circle';

      return `
        <div class="${cssClass} alert-dismissible fade show shadow-sm border-0 rounded-3 mb-3" role="alert" id="msg-flash">
            <div class="d-flex align-items-center">
                <i class="fas ${icon} me-2"></i>
                <div>${msg}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `.trim();
    }
  }
  return '';
};

// 5. str_random helper
global.str_random = function(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 6. slugify helper
global.slugify = function(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// 7. formatDate helper
global.formatDate = function(dateStr, formatPattern = 'YYYY-MM-DD') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return formatPattern
    .replace('YYYY', yyyy)
    .replace('MM', mm)
    .replace('DD', dd)
    .replace('HH', hh)
    .replace('mm', min)
    .replace('ss', ss);
};

// 8. formatCurrency helper
global.formatCurrency = function(amount, currencySymbol = '৳') {
  const val = parseFloat(amount) || 0;
  return `${currencySymbol} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 9. numberToWords helper (transliterating the dictionary-based English conversion)
global.numberToWords = function(num) {
  const hyphen = '-';
  const conjunction = ' and ';
  const separator = ', ';
  const negative = 'negative ';
  const dictionary = {
    0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
    10: 'Ten', 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen',
    17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty', 30: 'Thirty', 40: 'Forty', 50: 'Fifty',
    60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety', 100: 'Hundred', 1000: 'Thousand',
    1000000: 'Million', 1000000000: 'Billion', 1000000000000: 'Trillion'
  };

  if (isNaN(num)) return '';
  num = parseFloat(num);
  if (num < 0) return negative + numberToWords(Math.abs(num));

  let str = '';
  let fraction = null;

  if (String(num).includes('.')) {
    const parts = String(num).split('.');
    num = parseInt(parts[0]);
    fraction = parts[1];
  }

  if (num < 21) {
    str = dictionary[num];
  } else if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const units = num % 10;
    str = dictionary[tens];
    if (units) str += hyphen + dictionary[units];
  } else if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    str = dictionary[hundreds] + ' ' + dictionary[100];
    if (remainder) str += conjunction + numberToWords(remainder);
  } else {
    const baseUnit = Math.pow(1000, Math.floor(Math.log(num) / Math.log(1000)));
    const numBaseUnits = Math.floor(num / baseUnit);
    const remainder = num % baseUnit;
    str = numberToWords(numBaseUnits) + ' ' + dictionary[baseUnit];
    if (remainder) {
      str += remainder < 100 ? conjunction : separator;
      str += numberToWords(remainder);
    }
  }

  return str;
};

// 10. Vite Dev Server status probe and viteAsset helper
let viteDevServerActive = false;
const CHECK_INTERVAL = 10000; // Probe background status every 10 seconds

function checkViteDevServer() {
  try {
    const net = require('net');
    const client = net.connect({ port: 5173, host: '127.0.0.1', timeout: 300 }, () => {
      viteDevServerActive = true;
      client.destroy();
    });

    client.on('error', () => {
      viteDevServerActive = false;
      client.destroy();
    });

    client.on('timeout', () => {
      viteDevServerActive = false;
      client.destroy();
    });
  } catch (e) {
    viteDevServerActive = false;
  }
}

// Initial probe during bootup
checkViteDevServer();

// Periodically probe status in the background
setInterval(checkViteDevServer, CHECK_INTERVAL);

global.isViteDevActive = function() {
  // Returns the cached in-memory flag instantly without blocking or making real-time TCP socket requests
  return viteDevServerActive;
};

let manifestCache = null;
global.viteAsset = function(path = '') {
  const cleanPath = String(path).replace(/^\/+/, '');
  
  if (global.isViteDevActive()) {
    return `http://localhost:5173/${cleanPath}`;
  }
  
  if (!manifestCache) {
    try {
      const fs = require('fs');
      const pathLib = require('path');
      let manifestPath = pathLib.join(__dirname, '../../public/dist/.vite/manifest.json');
      if (!fs.existsSync(manifestPath)) {
        manifestPath = pathLib.join(__dirname, '../../public/dist/manifest.json');
      }
      if (fs.existsSync(manifestPath)) {
        manifestCache = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } else {
        manifestCache = {};
      }
    } catch (e) {
      manifestCache = {};
    }
  }
  
  const mapped = manifestCache[cleanPath];
  const file = mapped ? mapped.file : cleanPath;
  return `/dist/${file}`;
};
