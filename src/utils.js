/**
 *
 * @param {string} imageSrc
 * @param {string} name
 * @param {string} quantity
 *
 */
export const makeRewardData = (imageSrcOrLocalPath, name, quantity) => {
  const src = imageSrcOrLocalPath || "";

  // Use HTML image instead of Markdown to control size
  const imgHtml = src
    ? `<img src="${src}" width="90" style="vertical-align:middle; margin-right:6px;" />`
    : "";

  return `${imgHtml}${escapeHtml(name)} ${escapeHtml(quantity)}`;
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
