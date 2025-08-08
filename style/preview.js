// preview.js — robust preview panel (auto-creates modal, uses delegation)
(function () {
  // Create modal HTML if missing
  function ensureModal() {
    if (document.getElementById('preview-modal')) return;

    const modalHtml = `
      <div id="preview-modal" class="preview-modal" aria-hidden="true" style="display:none;">
        <div id="preview-backdrop" class="preview-backdrop"></div>
        <aside class="preview-panel" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <button id="preview-close" class="preview-close" aria-label="Close preview">✕</button>
          <h3 id="preview-title" class="preview-title">Preview</h3>
          <div id="preview-content" class="preview-content" aria-live="polite"></div>
          <div class="preview-actions">
            <a id="preview-open-full" class="preview-open-full" href="#" target="_blank" rel="noopener">Open full page</a>
          </div>
        </aside>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    // append modal to body
    document.body.appendChild(div.firstElementChild);
  }

  // Utility to show the modal (and set accessible attributes)
  function showModal() {
    const modal = document.getElementById('preview-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // trap focus lightly: focus close button
    const closeBtn = document.getElementById('preview-close');
    if (closeBtn) closeBtn.focus();
  }

  function hideModal() {
    const modal = document.getElementById('preview-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const content = document.getElementById('preview-content');
    if (content) content.innerHTML = '';
    const openFull = document.getElementById('preview-open-full');
    if (openFull) openFull.href = '#';
  }

  // Sanitize minimal: remove scripts/styles and disallow event attributes
  function sanitizeElement(el) {
    if (!el) return;
    el.querySelectorAll('script, style, link').forEach(n => n.remove());
    // remove on* attributes
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, null, false);
    const toStrip = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      [...node.attributes].forEach(attr => {
        if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      });
    }
  }

  // Extract first meaningful <p>, convert relative img/links to absolute
  function extractFirstParagraphFromHtml(baseUrl, doc) {
    // try common containers
    let p = doc.querySelector('main p') || doc.querySelector('article p') || doc.querySelector('body p') || doc.querySelector('p');
    if (!p) return null;

    // clone to avoid manipulating original doc
    const clone = p.cloneNode(true);

    // fix relative src/href
    clone.querySelectorAll('img').forEach(img => {
      const s = img.getAttribute('src');
      if (s) img.src = new URL(s, baseUrl).href;
    });
    clone.querySelectorAll('a').forEach(a => {
      const h = a.getAttribute('href');
      if (h) a.href = new URL(h, baseUrl).href;
      a.target = '_blank';
      a.rel = 'noopener';
    });

    // sanitize clone
    sanitizeElement(clone);
    return clone;
  }

  // Main preview loader
  async function openPreview(url, titleText = 'Preview') {
    try {
      url = new URL(url, window.location.href).href;
    } catch (err) {
      console.error('Preview: invalid URL', url, err);
      return;
    }

    ensureModal();
    const titleEl = document.getElementById('preview-title');
    const contentEl = document.getElementById('preview-content');
    const openFull = document.getElementById('preview-open-full');
    if (!contentEl || !openFull) {
      console.error('Preview: modal elements missing');
      return;
    }

    titleEl && (titleEl.textContent = titleText);
    contentEl.textContent = 'Loading preview…';
    openFull.href = url;

    showModal();

    try {
      const resp = await fetch(url, { method: 'GET', credentials: 'same-origin' });
      if (!resp.ok) {
        throw new Error('Fetch failed: ' + resp.status);
      }
      const htmlText = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // remove potentially dangerous nodes early
      doc.querySelectorAll('script, style, iframe, noscript').forEach(n => n.remove());

      const pClone = extractFirstParagraphFromHtml(url, doc);
      if (pClone) {
        // show paragraph HTML but fallback to textContent if empty
        const inner = pClone.innerHTML && pClone.innerHTML.trim();
        if (inner) {
          contentEl.innerHTML = inner;
        } else {
          contentEl.textContent = pClone.textContent.trim();
        }
      } else {
        // fallback excerpt from body text
        const bodyText = doc.body ? doc.body.textContent.replace(/\s+/g, ' ').trim() : '';
        contentEl.textContent = bodyText ? (bodyText.slice(0, 400) + (bodyText.length > 400 ? '…' : '')) : 'No preview available.';
      }
    } catch (err) {
      console.error('Preview fetch error:', err);
      contentEl.textContent = 'Could not load preview.';
    }
  }

  // attach global click handler (delegation) for .preview-btn and .post-link
  function attachDelegation() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.preview-btn');
      if (btn) {
        e.preventDefault();
        const url = btn.dataset.url || btn.getAttribute('data-url') || btn.getAttribute('href');
        let title = btn.dataset.title || btn.getAttribute('aria-label') || btn.textContent.trim();
        if (!title) {
          const a = btn.closest('td')?.querySelector('a');
          if (a) title = a.textContent.trim() || a.getAttribute('href');
        }
        if (!url) {
          console.warn('Preview: no data-url on preview-btn', btn);
          return;
        }
        openPreview(url, title || 'Preview');
        return;
      }

      // optionally allow clicking the file link itself to preview (uncomment if desired)
      const link = e.target.closest && e.target.closest('a.post-link');
      if (link) {
        // allow ctrl/cmd/middle click to bypass preview and open in new tab
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        const url = link.href;
        const title = link.textContent.trim() || link.getAttribute('href');
        openPreview(url, title);
        return;
      }
    }, { passive: false });
  }

  // modal close handlers (delegated)
  function attachModalCloseHandlers() {
    document.addEventListener('click', (e) => {
      const close = e.target.closest && e.target.closest('#preview-close, #preview-backdrop');
      if (close) {
        hideModal();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });
  }

  // Init once DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureModal();
      attachDelegation();
      attachModalCloseHandlers();
    });
  } else {
    ensureModal();
    attachDelegation();
    attachModalCloseHandlers();
  }

  // Expose for debugging (optional)
  window.__previewOpen = openPreview;
})();
