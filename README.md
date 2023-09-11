# Kard Theme v14 *Work In Progress*

Custom App for Frappe V14 that modifies the desktop as well as some other css changes.
Has a settings page that customizes the theme. 



* Option to add User Desktop Shortcuts as in v11. With the ability to sort and hide.
	* Shortcuts can be of type doctype or report or custom link.
* Adds a “Add to Desktop” link in the User Dropdown
    * Only shows for doctypes, pages and reports.


## Notes

Frappe v11 used a doctype called desktop_icon to store user shortcuts, their order and standard shortcuts as well as icon appearance information.

This theme stores this info in a custom doctype called kard_desktop_icon.

Frappe v14 now uses workspaces. The plan is to either take icon information from the workspace (workspace doesn't have a field for color. Might add a custom field.) or allow a custom icon and color to be set per bookmark (might get tedious).

## Installation

bench get-app kard_theme https://github.com/kardmode/kard_theme.git

bench --site sitename install-app kard_theme

## Initial Setup

The theme is disabled by default.
Go to Kard Theme Settings using search to enable.
There are other settings availabe here that can customize the theme.

<img src="Screenshot.png"/>
