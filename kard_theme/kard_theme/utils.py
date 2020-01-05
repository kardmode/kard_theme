# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt"
from __future__ import unicode_literals
import frappe
from frappe.utils import cint
from kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings import get_theme_info, get_theme_settings

def boot_session(bootinfo):

	settings = get_theme_settings()
	
	if settings.use_custom_home_page == True:
		add_home_page(bootinfo)
	# if frappe.session['user']!='Guest':
		# bootinfo.kard_user_icons,bootinfo.kard_settings,bootinfo.kard_standard_icons = get_theme_info()
		
def add_home_page(bootinfo):
	"""load home page"""
	if frappe.session.user=="Guest":
		return
	home_page = frappe.db.get_default("desktop:home_page")

	if not home_page == "setup-wizard":
		bootinfo['home_page'] = "kard-desktop"

