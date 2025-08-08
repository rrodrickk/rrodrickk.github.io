// preview.js
// Opens the preview modal when a .preview-btn is clicked; shows first <p> from the referenced HTML.

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('preview-modal');
  const backdrop = document.getElementById('preview-backdrop');
  const closeBtn = document.getElementById('preview-close');
  const contentEl = document.getElementById('preview-content');
  const openFull = document.getElementById('preview-open-full');
  const titleEl = document.getElementById('preview-title');

  if (!modal || !backdrop || !closeBtn || !contentEl || !openFull || !titleEl) {
    console.warn('preview.js: required modal elements missing');
    return;
  }

  // openPreview(url, titleText)
  async function openPreview(url, titleText = 'Preview') {
    // normalize URL to absolute
    try {
      url = new URL(url, window.location.href).href;
    } catch (err) {
      console.error('Invalid URL', url);
      return;
    }

    contentEl.textContent = 'Loading preview…';
    openFull.href = url;
    titleEl.textContent = titleText;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    try {
      const resp = await fetch(url, { method: 'GET', credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);

      const htmlText = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Remove potentially harmful tags
      doc.querySelectorAll('script, style, link[rel="import"]').forEach(n => n.remove());

      // Prefer main/article p, fallback to first p
      let p = doc.querySelector('main p') || doc.querySelector('article p') || doc.querySelector('body p') || doc.querySelector('p');

      if (p) {
        // Convert relative src/href in img/a inside the paragraph to absolute to avoid broken images/links
        // clone to avoid mutating original
        const clone = p.cloneNode(true);

        // Make images and anchors absolute
        clone.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src');
          if (src) img.src = new URL(src, url).href;
        });
        clone.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href) a.href = new URL(href, url).href;
          a.target = '_blank';
          a.rel = 'noopener';
        });

        // Optional: sanitize — for strict safety use textContent instead of innerHTML:
        contentEl.innerHTML = clone.innerHTML;
      } else {
        // fallback: extract trimmed textual excerpt (first 300 chars)
        const text = (doc.body && doc.body.textContent) ? doc.body.textContent.trim().replace(/\s+/g, ' ') : '';
        contentEl.textContent = text ? text.slice(0, 320) + (text.length > 320 ? '…' : '') : 'No preview available.';
      }
    } catch (err) {
      console.error('Preview fetch error', err);
      contentEl.textContent = 'Could not load preview.';
    }
  }

  function closePreview() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    contentEl.innerHTML = '';
    openFull.href = '#';
  }

  // close handlers
  backdrop.addEventListener('click', closePreview);
  closeBtn.addEventListener('click', closePreview);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closePreview();
  });

  // Bind preview buttons (per-row)
  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.getAttribute('data-url') || btn.dataset.url;
      // derive title: the file name or nearby link text
      let title = btn.getAttribute('aria-label') || btn.dataset.title || '';
      if (!title) {
        const a = btn.closest('td')?.querySelector('a');
        title = a ? (a.textContent.trim() || a.getAttribute('href')) : (url || 'Preview');
      }
      if (url) openPreview(url, title);
    });
  });

  // Optional: If you still want to allow preview by clicking the file link itself (not only button),
  // uncomment the block below to attach the same preview behavior to links with class "post-link".
  /*
  document.querySelectorAll('a.post-link').forEach(a => {
    a.addEventListener('click', (e) => {
      // allow ctrl/cmd/middle-click to open normally
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();
      openPreview(a.href, a.textContent.trim());
    });
  });
  */
});
