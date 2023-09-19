# Kard Theme v14 *Work In Progress*

Custom App for Frappe V14 that modifies the desktop as well as some other css changes.
Has a settings page called Kard Theme Settings that customizes the theme. 

* Option to add User Desktop Shortcuts as in v11. With the ability to sort and delete. (Bookmarks)
	* Shortcuts can be of type doctype or report.
* Option to add a list menu for doctypes and reports to each workspace. (Workspace Links Menu)
	* Uses a DocType field called document_type (Show in Module Section) to determine if shown in menu (may change).
 	* Can change settings to ignore this field.
  	* Can use a DocType called Module View Link to add custom links to these menus. 
* Option to add a global menu sidebar that shows all the workspaces available to the user. (Workspace Menu)
* Adds a “Bookmark” link in the standard actions menu dropdown. Adds a bookmark to the Home workspace.
	* Only shows on lists(doctypes) and reports(when viewing not editing).
* Adds a “Pin” link in the standard actions menu dropdown. Pins entries found in the Workspace Links Menu.
 	* Only shows on lists(doctypes) and reports(when viewing not editing).


## Notes

Frappe v11 used a doctype called desktop_icon to store user shortcuts, their order and standard shortcuts(modules) as well as icon appearance information.

This theme stores bookmark info in a custom doctype called kard_desktop_icon.

Frappe v14 now uses workspaces. The plan is to either take icon information from the workspace (workspace doesn't have a field for color. Might add a custom field.) or allow a custom label, icon and color to be set per bookmark.

## Installation

bench get-app kard_theme https://github.com/kardmode/kard_theme.git

bench --site sitename install-app kard_theme

## Initial Setup

The theme is disabled by default.
Go to Kard Theme Settings using search to enable.
There are other settings availabe here that can customize the theme.
