/**
 *
 * @param {string} imageSrc
 * @param {string} name
 * @param {string} quantity
 *
 */
export const makeRewardData = (imageSrcOrLocalPath, name, quantity) => {
  // imageSrcOrLocalPath might be a remote URL or a saved local path (archive/...)
  const src = imageSrcOrLocalPath || ""; // use empty if missing
  const fallback = "https://via.placeholder.com/25?text=?";

  // If src is relative (starts with archive/ or ./), keep it as-is.
  // Use onerror to fallback to placeholder if still invalid when rendered.
  return `<img src="${src}" height="25" alt="${escapeHtml(name)}" onerror="this.src='${fallback}'" /> ${escapeHtml(name)} ${escapeHtml(quantity)}`;
};

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
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
