# Kard Theme v14 *Work In Progress*

Custom App for Frappe V14 that modifies the desktop as well as some other css changes.
Has a settings page called Kard Theme Settings that enables/disables certain features. 

* Option to add User Desktop Shortcuts as in v11. With the ability to sort and delete. (Bookmarks)
	* Shortcuts can be of type doctype or report (page,dashboard are planned).
* Option to add a list menu for doctypes and reports to each workspace. (Workspace Links Menu)
	* Uses a DocType field called document_type (Show in Module Section) to determine if shown in menu (may change).
 	* Can change settings to ignore this field.
	* Workspaces now have a custom table to add more links to this menu.
  	* Can use a DocType called Kard Module Link to add more links to these menus. 
* Option to add a global menu sidebar that shows all the workspaces available to the user. (Workspace Menu)
* Adds a “Bookmark” link in the standard actions menu dropdown. Adds a bookmark to the Home workspace.
	* Only shows on lists(doctypes) and reports(when viewing not editing).
* Adds a “Pin” link in the standard actions menu dropdown. Pins entries found in the Workspace Links Menu.
 	* Only shows on lists(doctypes) and reports(when viewing not editing).


## Notes

Frappe v11 used a doctype called `Desktop Icon` to store user shortcuts, their order and standard shortcuts(modules) as well as icon appearance information.

This theme stores bookmark info in a custom doctype called `Kard Desktop Icon`.

Icon information such as icon/color/label can be added when bookmarking/pinning or can be taken from the module/workspace.

* Added a custom field to workspace for color information.
* When a bookmark/pin is added without any color or icon user input it finds the module for the doctype/report and then finds the workspace that represents that module. 

## Installation

bench get-app kard_theme https://github.com/kardmode/kard_theme.git

bench --site sitename install-app kard_theme

## Initial Setup

The theme is disabled by default.
Go to Kard Theme Settings using search to enable.
There are other settings available here that can enable/disable certain features.
