let katexCssLoaded = false;

export const loadKatexCss = () => {
  if (katexCssLoaded) return;
  
  // Create a link element for KaTeX CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css';
  link.crossOrigin = 'anonymous';
  
  // Add to head
  document.head.appendChild(link);
  katexCssLoaded = true;
};