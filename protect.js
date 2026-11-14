// Deterrents against casual copying: no drag, no selection, no context menu,
// no view-source / devtools / save-page shortcuts. Form fields keep working.
(() => {
  const editable = (el) => !!(el && el.closest && el.closest("input, textarea, select, [contenteditable], .out-big"));

  ["dragstart", "selectstart", "copy", "cut"].forEach((type) =>
    document.addEventListener(type, (e) => { if (!editable(e.target)) e.preventDefault(); }, true));

  document.addEventListener("contextmenu", (e) => { if (!editable(e.target)) e.preventDefault(); }, true);

  document.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const blocked =
      k === "f12" ||
      (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) ||   // devtools (Win/Linux, Firefox)
      (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(k)) || // devtools / source (Mac)
      (mod && ["u", "s"].includes(k)) ||                             // view source, save page
      (mod && ["a", "c", "x"].includes(k) && !editable(e.target));   // select-all / copy outside fields
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
