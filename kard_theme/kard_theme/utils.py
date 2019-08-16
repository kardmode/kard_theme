# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from six import iteritems
import frappe
from frappe import _
from frappe.desk.doctype.desktop_icon.desktop_icon import get_desktop_icons

@frappe.whitelist()
def get_theme_info():
	user_icons = get_desktop_icons()
	
	settings = frappe.get_single('Kard Theme Settings')
	
	standard_icons = get_standard_icons()
	return user_icons,settings,standard_icons

@frappe.whitelist()
def get_standard_icons(user=None):
	'''Return standard icons for user'''
	if not user:
		user = frappe.session.user

	standard_icons = frappe.cache().hget('standard_icons', user)

	if not standard_icons:
		fields = ['module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		active_domains = frappe.get_active_domains()

		blocked_doctypes = frappe.get_all("DocType", filters={
			"ifnull(restrict_to_domain, '')": ("not in", ",".join(active_domains))
		}, fields=["name"])

		blocked_doctypes = [ d.get("name") for d in blocked_doctypes ]

		standard_icons = frappe.db.get_all('Desktop Icon',
			fields=fields, filters={'standard': 1,'type':'module'})

		for icon in standard_icons:
			if icon._doctype in blocked_doctypes:
				icon.blocked = 1

		user_blocked_modules = frappe.get_doc('User', user).get_blocked_modules()
		for icon in standard_icons:
			if icon.module_name in user_blocked_modules:
				icon.hidden = 1

		# translate
		for d in standard_icons:
			if d.label: d.label = _(d.label)

		# sort by label
		standard_icons.sort(key = lambda a: a.label)
		# standard_icons = sorted(standard_icons, key=lambda k: k['label'])
				

		frappe.cache().hset('standard_icons', user, standard_icons)

	
	return standard_icons