/** Prints with a body[data-print] marker that index.css uses to choose what reaches paper. */
export function printWith(kind: 'badge' | 'report') {
  document.body.dataset.print = kind;
  const clear = () => {
    delete document.body.dataset.print;
    window.removeEventListener('afterprint', clear);
  };
  window.addEventListener('afterprint', clear);
  window.print();
}
