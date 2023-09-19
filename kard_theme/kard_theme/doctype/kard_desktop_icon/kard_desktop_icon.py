# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe
from frappe import _
import json
from frappe.model.document import Document
from frappe.boot import get_allowed_pages, get_allowed_reports
from six import iteritems, string_types

class KardDesktopIcon(Document):
	def on_trash(self):
		clear_desktop_icons_cache()
		
	# def after_doctype_insert():
		# frappe.db.add_unique("Kard Desktop Icon", ("label", "owner", "standard"))

def get_desktop_icons(user=None, enable_links_by_module = False):
	'''Return desktop icons for user'''
	if not user:
		user = frappe.session.user

	all_icons = frappe.cache().hget('desktop_icons', user)
	set_cache = False
		
	if not all_icons:
		all_icons = {}
		all_icons["user_icons"] = []
		all_icons["standard_icons"] = []
		set_cache = True
		
		fields = ['name','reference','link_to','doc_view','hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		user_icons = frappe.db.get_all('Kard Desktop Icon', fields=fields,
			filters={'standard': 0, 'owner': user})
			
		active_domains = frappe.get_active_domains()
		blocked_doctypes = frappe.get_all("DocType", filters={
			"ifnull(restrict_to_domain, '')": ("not in", ",".join(active_domains))
		}, fields=["name"])
		blocked_doctypes = [ d.get("name") for d in blocked_doctypes ]
		domain_blocked_modules	= frappe.get_all("Module Def", filters={
			"ifnull(restrict_to_domain, '')": ("not in", ",".join(active_domains))
		}, fields=["name"])
		domain_blocked_modules = [ d.get("name") for d in domain_blocked_modules ]
		user_blocked_modules = frappe.get_doc('User', user).get_blocked_modules()
		blocked_modules = domain_blocked_modules + user_blocked_modules
		allowed_pages = get_allowed_pages()
		allowed_reports = get_allowed_reports()
		
		from kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings import get
		
		for icon in user_icons:
			if is_icon_blocked(icon,blocked_modules,blocked_doctypes,allowed_pages,allowed_reports):
				icon.hidden = 1
				icon.blocked = icon.hidden
	
			if icon.blocked == 0:
				if icon.type == 'module' and enable_links_by_module:
					module_items = get(icon.reference)
					if len(module_items) == 0:
						icon.hidden = 1
						icon.hidden_in_standard = 1
					icon["items"] = module_items
					
			if icon.get('category') == '' or icon.get('category') == None:
				icon.category = "Uncategorized"
			
			# translate
			if icon.label: icon.label = _(icon.label)

		standard_icons = frappe.db.get_all('Kard Desktop Icon', fields=fields,
			filters={'standard': 1})
			
		for icon in standard_icons:
			if is_icon_blocked(icon,blocked_modules,blocked_doctypes,allowed_pages,allowed_reports):
				icon.hidden = 1
				icon.blocked = icon.hidden
	
			if icon.blocked == 0:
				if icon.type == 'module' and enable_links_by_module:
					module_items = get(icon.reference)
					if len(module_items) == 0:
						icon.hidden = 1
						icon.hidden_in_standard = 1
					icon["items"] = module_items
					
			if icon.get('category') == '' or icon.get('category') == None:
				icon.category = "Uncategorized"
				
			# translate
			if icon.label: icon.label = _(icon.label)

		# sort by idx
		user_icons.sort(key = lambda a: a.idx)
		# sort by label
		standard_icons.sort(key = lambda a: a.label)		
		
		# categories = frappe.db.get_all('Kard Desktop Category',
			# fields=["name"], filters={}, order_by='name')		
		# module_categories = [m.name for m in categories]
			
		# from collections import OrderedDict 
		# user_modules_by_category = OrderedDict() 		
		# for category in module_categories:
			# user_modules_by_category[category] = [m for m in user_icons if m.get('category') == category]
		# user_modules_by_category["Uncategorized"] = [m for m in user_icons if m.get('category') == 'Uncategorized']

		all_icons["user_icons"] = user_icons
		all_icons["standard_icons"] = standard_icons
						
	if set_cache:
		frappe.cache().hset('desktop_icons', user, all_icons)
		
	return all_icons

def is_icon_blocked(icon,blocked_modules,blocked_doctypes,allowed_pages,allowed_reports):
	# if not frappe.db.get_value("Module Def", module):
	if ((icon.type == "Module" and icon.reference in blocked_modules)
		or (icon.type == "DocType" and icon.reference in blocked_doctypes)
		or (icon.type == "Page" and icon.reference not in allowed_pages)
		or (icon.type == "Report" and icon.reference not in allowed_reports)
	):
		return True
	
	return False

@frappe.whitelist()
def add_user_icon(args=None):
	'''Add a new user Kard Desktop Icon to the desktop'''
	import json
	args = json.loads(args)
	reference = args.get("reference")
	workspace = args.get("workspace")
	link_to = reference
	doc_view = args.get("doc_view")
	_doctype = args.get("doctype")
	_report = args.get("report")
	label = args.get("label")
	link = args.get("link")
	type = args.get("type")
	icon = args.get("icon")
	color = args.get("color")
	remove = args.get("remove")
	standard = 0
	
	icon_name = frappe.db.exists('Kard Desktop Icon', {'standard': standard, 'reference': reference,
		'owner': frappe.session.user,'type':type,'doc_view':doc_view})
	
	if icon_name:
		if remove == '1' or remove == 1:
			frappe.delete_doc("Kard Desktop Icon", icon_name, ignore_permissions=True)
			return icon_name
	
		if label:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'label', label)
	
		if icon:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'icon', icon)

		if color:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'color', color)
	
		clear_desktop_icons_cache()

	elif remove == '0' or remove  == 0:
		if not label: label = reference

		idx = frappe.db.sql('select max(idx) from `tabKard Desktop Icon` where owner=%s',
			frappe.session.user)[0][0] or \
			frappe.db.sql('select count(*) from `tabKard Desktop Icon` where standard=1')[0][0]
		
		userdefined_icon = None
		if _report:
			userdefined_icon = frappe.db.get_value('Report', _report, ['module'], as_dict=True)
		elif _doctype:
			userdefined_icon = frappe.db.get_value('DocType', _doctype, ['module'], as_dict=True)
			_report = None
		
		fields = ["icon"]
		order_by = "name"
		workspace_meta = frappe.get_meta("Workspace")
		if workspace_meta.has_field('kard_theme_color'):
			fields += ["kard_theme_color"]
		
		workspace_icon = None
		
		if userdefined_icon:
			# workspace_icon = frappe.db.get_value('Workspace', {'module': userdefined_icon.module}, fields, as_dict=True)
			workspace_icon = frappe.get_value('Workspace', {'module':userdefined_icon.module}, 
				fields, as_dict=True)

		module_icon = frappe._dict()
		module_icon.color = color or (workspace_icon and workspace_icon.get("kard_theme_color")) or '#FFE8CD'
		module_icon.reverse = 0
		module_icon.icon = icon or (workspace_icon and workspace_icon.get("icon")) or 'folder-normal'
		
		try:
			new_icon = frappe.get_doc({
				'doctype': 'Kard Desktop Icon',
				'label': label,
				'workspace': workspace,
				'module_name': reference,
				'link': link,
				'type': type,
				'link_to': link_to,
				'doc_view': doc_view,
				'_doctype': _doctype,
				'_report': _report,
				'icon': module_icon.icon,
				'color': module_icon.color,
				'reverse': module_icon.reverse,
				'idx': idx + 1,
				'custom': 1,
				'standard': standard,
				'reference':reference
			}).insert(ignore_permissions=True)
			clear_desktop_icons_cache()
			icon_name = new_icon.name

		except frappe.UniqueValidationError as e:
			raise e
		except Exception as e:
			raise e
	return icon_name
	
@frappe.whitelist()
def set_order(new_order, user=None):
	'''set new order by duplicating user icons (if user is set) or set global order'''
	if isinstance(new_order, string_types):
		new_order = json.loads(new_order)
	for i, name in enumerate(new_order):
		icon = None
		if user:
			icon = get_user_copy_by_name(name, user)

		if icon:
			icon.db_set('idx', i)

	clear_desktop_icons_cache()


def clear_desktop_icons_cache(user=None):
	frappe.cache().hdel('desktop_icons', user or frappe.session.user)
	frappe.cache().hdel('bootinfo', user or frappe.session.user)

def get_user_copy_by_name(name, user=None):
	if not user:
		user = frappe.session.user

	desktop_icon = frappe.db.get_value('Kard Desktop Icon', name, ['name'], as_dict=True)

	if desktop_icon:
		return frappe.get_doc('Kard Desktop Icon', desktop_icon.name)
	
	return None

@frappe.whitelist()
def hide(name=None, user = None):
	if not user:
		user = frappe.session.user
	try:
		if name:
			frappe.delete_doc("Kard Desktop Icon", name, ignore_permissions=True)
		
		clear_desktop_icons_cache()
	except Exception:
		return False

	return True
