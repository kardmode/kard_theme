# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt"
from __future__ import unicode_literals
import frappe
from frappe.utils import cint
from kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings import get_theme_info

def boot_session(bootinfo):
	if frappe.session['user']!='Guest':

		bootinfo.kard_user_icons,bootinfo.kard_settings,bootinfo.kard_standard_icons = get_theme_info()