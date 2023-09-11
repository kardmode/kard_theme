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
	def validate(self):
		if not self.label:
			self.label = self._doctype or self._report or self.module_name

	def on_trash(self):
		clear_desktop_icons_cache()
		
	# def after_doctype_insert():
		# frappe.db.add_unique("Kard Desktop Icon", ("module_name", "owner", "standard"))


def get_desktop_icons(user=None, enable_links_by_module = False):
	'''Return desktop icons for user'''
	if not user:
		user = frappe.session.user

	all_icons = frappe.cache().hget('desktop_icons', user)
	
	set_cache = False
	
	fields = ['name','reference','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

	
	if not all_icons:
		all_icons = {}
		all_icons["user_icons"] = []
		all_icons["standard_icons"] = []
		set_cache = True
		
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
		
		for icon in user_icons:
			if is_icon_blocked(icon,blocked_modules,blocked_doctypes,allowed_pages,allowed_reports):
				icon.hidden = 1
				icon.blocked = icon.hidden
	
			if icon.blocked == 0 and icon.type == 'module' and enable_links_by_module:
				module_items = get_data(icon.module_name)
				if len(module_items) == 0:
					icon.hidden = 1
					icon.hidden_in_standard = 1
				icon["items"] = module_items
					
			if icon.get('category') == '' or icon.get('category') == None:
				icon.category = "Uncategorized"
				
	
		standard_icons = [m for m in user_icons if m.get('standard') == 1]
		user_icons = [m for m in user_icons if m.get('standard') == 0]
		
		# translate
		for d in user_icons:
			if d.label: d.label = _(d.label)
		
		# sort by idx
		user_icons.sort(key = lambda a: a.idx)	

		# translate
		for d in standard_icons:
			if d.label: d.label = _(d.label)
		
		# sort by label
		standard_icons.sort(key = lambda a: a.label)		
		
		categories = frappe.db.get_all('Kard Desktop Category',
			fields=["name"], filters={}, order_by='name')		
		module_categories = [m.name for m in categories]
			
		from collections import OrderedDict 
		user_modules_by_category = OrderedDict() 		
		for category in module_categories:
			user_modules_by_category[category] = [m for m in standard_icons if m.get('category') == category]
		
		user_modules_by_category["Uncategorized"] = [m for m in standard_icons if m.get('category') == 'Uncategorized']

		all_icons["user_icons"] = user_icons
		all_icons["standard_icons"] = user_modules_by_category
						
	if set_cache:
		frappe.cache().hset('desktop_icons', user, all_icons)
		
	return all_icons

def is_icon_blocked(icon,blocked_modules,blocked_doctypes,allowed_pages,allowed_reports):
	# if not frappe.db.get_value("Module Def", module):
	if ((icon.type == "module" and icon.module_name in blocked_modules)
		or (icon._doctype and icon._doctype in blocked_doctypes)
		or (icon._page and icon._page not in allowed_pages)
		or (icon._report and icon._report not in allowed_reports)
	):
		return True
	
	return False

@frappe.whitelist()
def add_user_icon(reference=None,_doctype=None, _report=None, label=None, link=None, type='link', standard=0, icon=None,color=None,remove=0):
	'''Add a new user Kard Desktop Icon to the desktop'''	
	icon_name = None
	type = 'link'
	type = str(type).lower() if type else 'link'
	
	if(not type == 'link' and reference):
		icon_name = frappe.db.exists('Kard Desktop Icon', {'standard': standard, 'reference': reference,
			'owner': frappe.session.user,'type':type})
	elif _report:
		icon_name = frappe.db.exists('Kard Desktop Icon', {'standard': standard, '_report': _report,
			'owner': frappe.session.user})
	elif _doctype:
		icon_name = frappe.db.exists('Kard Desktop Icon', {'standard': standard, '_doctype': _doctype,
			'owner': frappe.session.user,'link':link})
	if icon_name:
		if remove == '1':
			frappe.delete_doc("Kard Desktop Icon", icon_name, ignore_permissions=True)
			return icon_name
	
		if label:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'label', label)
	
		if icon:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'icon', icon)

		if color:
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'color', color)
	
		if frappe.db.get_value('Kard Desktop Icon', icon_name, 'hidden'):
			frappe.db.set_value('Kard Desktop Icon', icon_name, 'hidden', 0)
		
		clear_desktop_icons_cache()

	elif remove == '0':
		if not label: label = reference or _report or _doctype 

		idx = frappe.db.sql('select max(idx) from `tabKard Desktop Icon` where owner=%s',
			frappe.session.user)[0][0] or \
			frappe.db.sql('select count(*) from `tabKard Desktop Icon` where standard=1')[0][0]
		
		userdefined_icon = None
		if _report:
			userdefined_icon = frappe.db.get_value('Report', _report, ['module'], as_dict=True)
		elif _doctype:
			userdefined_icon = frappe.db.get_value('DocType', _doctype, ['module'], as_dict=True)
			_report = None

		module_name = reference or _report or _doctype or label
		
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
		module_icon.color = color or workspace_icon.get("kard_theme_color") or '#FFE8CD'
		module_icon.reverse = 0
		module_icon.icon = icon or workspace_icon.get("icon") or 'folder-normal'
		
		try:
			new_icon = frappe.get_doc({
				'doctype': 'Kard Desktop Icon',
				'label': label,
				'module_name': module_name,
				'link': link,
				'type': type,
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
			frappe.throw(_('Bookmark already exists'))
		except Exception as e:
			raise e
	return icon_name
	
@frappe.whitelist()
def set_order(new_order, user=None):
	'''set new order by duplicating user icons (if user is set) or set global order'''
	if isinstance(new_order, string_types):
		new_order = json.loads(new_order)
	for i, module_name in enumerate(new_order):
		if user:
			# icon = get_user_copy(module_name, user)
			icon = get_user_copy_by_name(module_name, user)
		else:
			name = frappe.db.get_value('Kard Desktop Icon',
				{'standard': 1, 'module_name': module_name})
			if name:
				icon = frappe.get_doc('Kard Desktop Icon', name)
			else:
				# standard icon missing, create one for DocType
				name = add_user_icon(module_name, standard=1)
				icon = frappe.get_doc('Kard Desktop Icon', name)

		icon.db_set('idx', i)

	clear_desktop_icons_cache()

def set_hidden(module_name, user=None, hidden=1):
	'''Set module hidden property for given user. If user is not specified,
		hide/unhide it globally'''
	if user:
		icon = get_user_copy(module_name, user)

		if icon and icon.custom and hidden:
			frappe.delete_doc(icon.doctype, icon.name, ignore_permissions=True)
			return

		# hidden by user
		# icon.db_set('hidden', hidden)
	else:
		icon = frappe.get_doc('Kard Desktop Icon', {'standard': 1, 'module_name': module_name})

		# blocked is globally hidden
		icon.db_set('blocked', hidden)

def clear_desktop_icons_cache(user=None):
	frappe.cache().hdel('desktop_icons', user or frappe.session.user)
	frappe.cache().hdel('bootinfo', user or frappe.session.user)

def get_user_copy(module_name, user=None):
	'''Return user copy (Kard Desktop Icon) of the given module_name. If user copy does not exist, create one.

	:param module_name: Name of the module
	:param user: User for which the copy is required (optional)
	'''
	if not user:
		user = frappe.session.user

	desktop_icon_name = frappe.db.get_value('Kard Desktop Icon',
		{'module_name': module_name, 'owner': user, 'standard': 0})

	if desktop_icon_name:
		return frappe.get_doc('Kard Desktop Icon', desktop_icon_name)
	else:
		return make_user_copy(module_name, user)

def make_user_copy(module_name, user):
	'''Insert and return the user copy of a standard Kard Desktop Icon'''
	standard_name = frappe.db.get_value('Kard Desktop Icon', {'module_name': module_name, 'standard': 1})

	if not standard_name:
		frappe.throw(_('{0} not found').format(module_name), frappe.DoesNotExistError)

	original = frappe.get_doc('Kard Desktop Icon', standard_name)

	desktop_icon = frappe.get_doc({
		'doctype': 'Kard Desktop Icon',
		'standard': 0,
		'owner': user,
		'module_name': module_name
	})

	for key in ('app', 'label', 'route', 'type', '_doctype','_report','idx', 'reverse', 'force_show', 'link', 'icon', 'color'):
		if original.get(key):
			desktop_icon.set(key, original.get(key))

	desktop_icon.insert(ignore_permissions=True)

	return desktop_icon

def get_user_copy_by_name(name, user=None):
	'''Return user copy (Kard Desktop Icon) of the given module_name.
	:param module_name: name of the shorcut doc
	:param user: User for which the copy is required (optional)
	'''
	if not user:
		user = frappe.session.user

	desktop_icon = frappe.db.get_value('Kard Desktop Icon', name, ['name'], as_dict=True)

	if desktop_icon:
		return frappe.get_doc('Kard Desktop Icon', desktop_icon.name)
	
	return None

@frappe.whitelist()
def hide(module_name, name=None, user = None):
	if not user:
		user = frappe.session.user
	try:
		if name:
			frappe.delete_doc("Kard Desktop Icon", name, ignore_permissions=True)
		else:
			set_hidden(module_name, user, hidden = 1)
		clear_desktop_icons_cache()
	except Exception:
		return False

	return True
