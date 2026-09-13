// Article-only behavior: Mermaid rendering, diagram crop/scale, the
// reading-progress bar, and code-block copy buttons. Loaded with `defer`
// after the article DOM exists.

import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    background: '#0c0a0f',
    primaryColor: '#100d14',
    primaryTextColor: '#f5f3f7',
    primaryBorderColor: '#5a296f',
    lineColor: '#79558a',
    secondaryColor: '#0c0a0f',
    tertiaryColor: '#080709',
    clusterBkg: '#0c0a0f',
    clusterBorder: '#352a3d',
    edgeLabelBackground: '#0c0a0f',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '14px'
  },
  flowchart: {
    curve: 'basis',
    padding: 14,
    useMaxWidth: true,
    htmlLabels: true
  },
  sequence: {
    useMaxWidth: true,
    actorBkg: '#100d14',
    actorBorder: '#5a296f',
    actorTextColor: '#f5f3f7',
    signalColor: '#b8a2c2',
    signalTextColor: '#dcd4df',
    noteBkgColor: '#151019',
    noteBorderColor: '#5a296f',
    noteTextColor: '#ded5e2'
  }
});

await mermaid.run({ querySelector: '.mermaid' });

const cropAndScaleDiagrams = () => {
  const desktop = window.innerWidth > 760;

  document.querySelectorAll('.diagram').forEach((diagram) => {
    const host = diagram.querySelector('.mermaid');
    const svg = diagram.querySelector('svg');
    if (!host || !svg) return;

    host.style.display = 'grid';
    host.style.placeItems = 'center';
    host.style.width = '100%';
    host.style.marginInline = 'auto';

    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.display = 'block';
    svg.style.float = 'none';
    svg.style.marginInline = 'auto';
    svg.style.height = 'auto';

    // Sequence diagrams can draw actor boxes, notes and lifelines outside
    // Mermaid's first content group. Cropping to getBBox() can therefore
    // cut valid content. Keep Mermaid's original viewBox for these.
    if (diagram.classList.contains('diagram-native-viewbox')) {
      svg.style.setProperty('width', desktop ? 'min(100%, 820px)' : '100%', 'important');
      svg.style.setProperty('max-width', '100%', 'important');
      svg.style.setProperty('overflow', 'visible', 'important');
      return;
    }

    const content =
      svg.querySelector('g.root') ||
      svg.querySelector('g.output') ||
      svg.querySelector(':scope > g') ||
      svg.querySelector('g');

    if (content && typeof content.getBBox === 'function') {
      try {
        const box = content.getBBox();
        if (box.width > 0 && box.height > 0) {
          const pad = 20;
          const w = box.width + pad * 2;
          const h = box.height + pad * 2;
          svg.setAttribute('viewBox', `${box.x - pad} ${box.y - pad} ${w} ${h}`);
          svg.removeAttribute('width');
          svg.removeAttribute('height');

          if (desktop) {
            // One visual envelope for every diagram.
            // Tall diagrams are constrained by height; wide ones by width.
            const maxW = 780;
            const maxH = 500;
            const scale = Math.min(1, maxW / w, maxH / h);
            const displayW = Math.max(1, Math.round(w * scale));

            svg.style.setProperty('width', `${displayW}px`, 'important');
            svg.style.setProperty('max-width', '100%', 'important');
          } else {
            svg.style.setProperty('width', '100%', 'important');
            svg.style.setProperty('max-width', '100%', 'important');
          }
        }
      } catch (_) {
        svg.style.setProperty('max-width', '100%', 'important');
      }
    }
  });
};

await new Promise((resolve) =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))
);

cropAndScaleDiagrams();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(cropAndScaleDiagrams, 120);
}, { passive: true });

// ── reading progress bar ────────────────────────────────────────────────

const progress = document.getElementById('progress');

if (progress) {
  const updateProgress = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    progress.style.width = (height > 0 ? (scrollTop / height) * 100 : 0) + '%';
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ── copy-to-clipboard buttons ────────────────────────────────────────────

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

document.querySelectorAll('.copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const code = button.parentElement.querySelector('code');
    if (!code) return;

    try {
      await copyText(code.innerText);
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = original), 1000);
    } catch (_) {
      button.textContent = 'Copy failed';
      setTimeout(() => (button.textContent = 'Copy'), 1200);
    }
  });
});
