(function () {
	var theme = localStorage.getItem("artmate_theme") || "forest";
	document.documentElement.setAttribute("data-theme", theme);
})();
