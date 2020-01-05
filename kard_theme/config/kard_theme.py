from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
        {
			"label": _("Setup"),
			"icon": "fa fa-settings",
			"items": [
				{
					"type": "doctype",
					"name": "Kard Theme Settings",
					"description": _("Change theme settings.)")
				},
				{
					"type": "doctype",
					"name": "Kard Desktop Icon",
					"description": _("Customize User and Standard Icons")
				},
				{
					"type": "doctype",
					"name": "Kard Desktop Category",
					"description": _("Add custom categories for desktop icons.")
				}
			]
		}
	]
