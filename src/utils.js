/**
 *
 * @param {string} imageSrc
 * @param {string} name
 * @param {string} quantity
 *
 */
export const makeRewardData = (imageSrcOrLocalPath, name, quantity) => {
  // If imageSrcOrLocalPath is a remote URL, prefer a local saved path (downloaded)
  const src = imageSrcOrLocalPath || "";
  // Use Markdown image syntax so GitHub renders correctly in tables too
  // If src is empty we show only the name and qty
  const imgMd = src ? `![${escapeAlt(name)}](${src})` : "";
  return `${imgMd} ${escapeHtml(name)} ${escapeHtml(quantity)}`;
};

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function escapeAlt(s = "") {
  return String(s).replace(/[\]\[]/g, '_'); // simple alt text cleanup
}

/**
 *
 * @param {Date} date
 *
 */
export const getArchivedFileName = (date) => {
  if (!(date instanceof Date)) {
    throw new Error("Invalid input, expected a Date object.");
  }
  let year = date.getFullYear();
  let month = date.getMonth(); // 0 - Jan; 11 - Dec
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${String(month).padStart(2, "0")}-${year}`;
};
