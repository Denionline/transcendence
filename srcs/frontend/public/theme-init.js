// Applies the saved daisyUI theme to <html> before the app paints, so a
// reload never flashes the default theme first. Kept as a static file rather
// than an inline <script> so it satisfies the `script-src 'self'` CSP without
// needing a hash or 'unsafe-inline'. Must stay a classic, non-deferred script
// in <head> so it runs before the body renders.
(function () {
	var theme = localStorage.getItem("artmate_theme") || "forest";
	document.documentElement.setAttribute("data-theme", theme);
})();
(function () {
	var theme = localStorage.getItem("artmate_theme") || "forest";
	document.documentElement.setAttribute("data-theme", theme);
})();
