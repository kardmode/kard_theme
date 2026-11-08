"""
The Start menu switches moved from site_config.json to Kard Theme Settings > Start Menu.

New fields on an existing Single don't get their defaults, so each one is set here: the site_config
value when there was one, otherwise what the Start menu did before (on, on, alt+q; menu itself off).
"""

import frappe
from frappe.utils import cint

# Kard Theme Settings field -> (old site_config key, value the Start menu used without one)
FIELDS = {
	"enable_start_menu": ("kard_start_menu", 0),
	"start_replace_awesomebar": ("kard_start_replace_awesomebar", 1),
	"start_type_to_search": ("kard_start_type_to_search", 1),
	"start_menu_shortcut": ("kard_start_shortcut", "alt+q"),
}


def execute():
	frappe.reload_doc("kard_theme", "doctype", "kard_theme_settings")
	for field, (conf_key, default) in FIELDS.items():
		# a value already saved in the settings (e.g. set by hand after an earlier run) is kept
		if frappe.db.exists("Singles", {"doctype": "Kard Theme Settings", "field": field}):
			continue
		value = frappe.conf.get(conf_key, default)
		value = str(value).strip().lower() if field == "start_menu_shortcut" else cint(value)
		frappe.db.set_single_value("Kard Theme Settings", field, value)
