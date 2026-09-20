(function () {
  'use strict';

  var STORAGE_KEY = 'lephemereAdminTheme';
  var root = document.documentElement;
  var toggle = document.getElementById('adminThemeToggle');
  var label = document.getElementById('adminThemeLabel');
  var icon = document.getElementById('adminThemeIcon');

  function readTheme() {
    return root.dataset.adminTheme === 'dark' ? 'dark' : 'light';
  }

  function render(theme) {
    var isDark = theme === 'dark';
    root.dataset.adminTheme = isDark ? 'dark' : 'light';
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? '切換為日間模式' : '切換為夜間模式');
    if (label) label.textContent = isDark ? '日間模式' : '夜間模式';
    if (icon) icon.textContent = isDark ? '☀' : '☾';
  }

  render(readTheme());

  if (toggle) {
    toggle.addEventListener('click', function () {
      var nextTheme = readTheme() === 'dark' ? 'light' : 'dark';
      render(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (error) {
        // 瀏覽器停用儲存時仍可在本頁切換，不影響後台操作。
      }
    });
  }
})();
