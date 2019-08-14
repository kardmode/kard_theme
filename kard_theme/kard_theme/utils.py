# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from six import iteritems
import frappe
from frappe import _
from frappe.desk.doctype.desktop_icon.desktop_icon import get_desktop_icons

@frappe.whitelist()
def get_theme_info():
	icons = get_desktop_icons()
	
	settings = frappe.get_single('Kard Theme Settings')
	return icons,settings
