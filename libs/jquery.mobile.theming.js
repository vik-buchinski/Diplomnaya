$(document).bind("mobileinit", function () {

    // For Button default theme is "system a"
    $.mobile.button.prototype.options.theme = "a"

    // Navigation
    $.mobile.page.prototype.options.backBtnText  = "Back";
    $.mobile.page.prototype.options.backBtnTheme = "a";

    // Footer and Header
    $.mobile.toolbar.prototype.options.tapToggle = false;

    // Page
    $.mobile.page.prototype.options.headerTheme  = "a";  // Page header only
    $.mobile.page.prototype.options.contentTheme = "a";
    $.mobile.page.prototype.options.footerTheme  = "a";

    // Listviews
    $.mobile.listview.prototype.options.headerTheme  = "a";  // Header for nested lists
    $.mobile.listview.prototype.options.theme        = "b";  // List items / content
    $.mobile.listview.prototype.options.dividerTheme = "a";  // List divider
    $.mobile.listview.prototype.options.splitTheme  = "b";
    $.mobile.listview.prototype.options.countTheme  = "c";
    $.mobile.listview.prototype.options.filterTheme = "a";

    // improvements
    $.mobile.defaultPageTransition   = "none";
    $.mobile.defaultDialogTransition = "none";
    $.mobile.buttonMarkup.hoverDelay = 0;
    
    $.mobile.textinput.prototype.options.theme = "a";
});