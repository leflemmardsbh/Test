import DOMPurify from "dompurify";

export function isHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(text || "");
}

export function toSafeHtml(text) {
  if (!text) return "";
  const html = isHtml(text)
    ? text
    : text.split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join("");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function stripHtml(text) {
  const el = document.createElement("div");
  el.innerHTML = toSafeHtml(text);
  return el.textContent || "";
}

function escape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
