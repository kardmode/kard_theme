# Copyright (c) 2023, kardmode and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.boot import get_allowed_pages, get_allowed_reports

class KardPinnedEntry(Document):
	def validate(self):
		if not self.label:
			self.label = self._doctype or self._report or self.module_name

	def on_trash(self):
		clear_pinned_icons_cache()
		
	# def after_doctype_insert():
		# frappe.db.add_unique("Kard Pinned Entry", ("module_name", "owner", "standard"))


def get_pinned_icons(user=None):
	'''Return desktop icons for user'''
	if not user:
		user = frappe.session.user

	all_icons = frappe.cache().hget('pinned_icons', user)
	
	set_cache = False
	
	fields = ['name','reference','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx','blocked']

	
	if not all_icons:
		all_icons = {}
		all_icons["user_icons"] = []
		
		set_cache = True
		
		user_icons = frappe.db.get_all('Kard Pinned Entry', fields=fields,
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

			if icon.get('category') == '' or icon.get('category') == None:
				icon.category = "Uncategorized"
				
		# translate
		for d in user_icons:
			if d.label: d.label = _(d.label)
		
		# sort by label
		user_icons.sort(key = lambda a: a.label)			
		
		# categories = frappe.db.get_all('Kard Desktop Category',
			# fields=["name"], filters={}, order_by='name')		
		# module_categories = [m.name for m in categories]

			
		# from collections import OrderedDict 
		# user_modules_by_category = OrderedDict() 		
		# for category in module_categories:
			# user_modules_by_category[category] = [m for m in standard_icons if m.get('category') == category]
		
		# user_modules_by_category["Uncategorized"] = [m for m in standard_icons if m.get('category') == 'Uncategorized']

		set_cache = True
		all_icons["user_icons"] = user_icons
		# all_icons["standard_icons"] = user_modules_by_category
						
	if set_cache:
		frappe.cache().hset('pinned_icons', user, all_icons)
		
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
def pin_user_icon(reference=None,_doctype=None, _report=None, label=None, link=None, type='link', standard=0, icon=None,color=None,remove=0):

	icon_name = None
	type = 'link'
	type = str(type).lower() if type else 'link'

	if(not type == 'link' and reference):
		icon_name = frappe.db.exists('Kard Pinned Entry', {'standard': standard, 'reference': reference,
			'owner': frappe.session.user,'type':type})
	elif _report:
		icon_name = frappe.db.exists('Kard Pinned Entry', {'standard': standard, '_report': _report,
			'owner': frappe.session.user})
	elif _doctype:
		icon_name = frappe.db.exists('Kard Pinned Entry', {'standard': standard, '_doctype': _doctype,
			'owner': frappe.session.user,'link':link})


	if icon_name:
		if remove == '1':
			frappe.delete_doc("Kard Desktop Icon", icon_name, ignore_permissions=True)
			return icon_name
	
		if label:
			frappe.db.set_value('Kard Pinned Entry', icon_name, 'label', label)
	
		if icon:
			frappe.db.set_value('Kard Pinned Entry', icon_name, 'icon', icon)

		if color:
			frappe.db.set_value('Kard Pinned Entry', icon_name, 'color', color)
	
		if frappe.db.get_value('Kard Pinned Entry', icon_name, 'hidden'):
			frappe.db.set_value('Kard Pinned Entry', icon_name, 'hidden', 0)

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
				'doctype': 'Kard Pinned Entry',
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
				'reference':reference
			}).insert(ignore_permissions=True)
			clear_pinned_icons_cache()

			icon_name = new_icon.name

		except frappe.UniqueValidationError as e:
			frappe.throw(_('Bookmark already exists'))
		except Exception as e:
			raise e

	return icon_name

def clear_pinned_icons_cache(user=None):
	frappe.cache().hdel('pinned_icons', user or frappe.session.user)
	frappe.cache().hdel('bootinfo', user or frappe.session.user)
