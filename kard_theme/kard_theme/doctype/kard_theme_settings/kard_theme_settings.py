# -*- coding: utf-8 -*-
# Copyright (c) 2019, kardmode and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from six import iteritems
import frappe
from frappe import _
from frappe.desk.moduleview import combine_common_sections,apply_permissions
from frappe.model.document import Document

class KardThemeSettings(Document):
	def clear_user_icons(self):
		fields = ['name','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		
		user_icons = frappe.db.get_all('Kard Desktop Icon', fields=fields,
			filters={'standard': 0})
			
		
			
		for icon in user_icons:
			frappe.delete_doc('Kard Desktop Icon', icon.name, ignore_missing=True)

		
	def initialize_standard_icons(self):	
			
		modules_list = frappe.db.get_all('Module Def',
			fields=['name','app_name'], filters={})
			
		
		for i, m in enumerate(modules_list):
			new_icon = frappe.get_doc({
				'doctype': 'Kard Desktop Icon',
				'module_name': m.name,
				'label': m.name,
				'standard': 1,
				'app': m.app_name,
				'color': 'grey',
				'icon': 'octicon octicon-file-directory',
				'idx': i,
			}).insert()
			
	def sync_standard_icons(self):
		
		modules_list = frappe.db.get_all('Module Def',
			fields=[], filters={})
		
		module_names = []
		
		for m in modules_list:
			module_names.append(m.name)
					
		icons = frappe.db.get_all('Module Def',
			fields=[], filters={})
		
		for m in standard_icons:
			if m.name not in module_names:
				frappe.db.sql('delete from `tabKard Desktop Icon` where module_name=%s',m.name)
				
	def copy_from_desktop_icons(self):
		
		fields = ['name','module_name', 'app','hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		
		kard_desktop_icons = frappe.db.get_all('Kard Desktop Icon', fields={}, filters={})
		for icon in kard_desktop_icons:
			frappe.delete_doc('Kard Desktop Icon', icon.name, ignore_missing=True)
		
		desktop_icons = frappe.db.sql("""SELECT * FROM `tabDesktop Icon`""", as_dict=1)
		for m in desktop_icons:
			# new_doc = {}
			# for key in desktop_icons:
				# new_doc[key] = m.key
				# frappe.errprint(m[key])
			m['doctype'] = 'Kard Desktop Icon'
			frappe.get_doc(m).insert()
		
	
@frappe.whitelist()
def get_theme_info():
	from kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon import get_desktop_icons

	settings = get_theme_settings()
	all_icons = get_desktop_icons()
	user_icons = all_icons.get("user_icons")
	standard_icons = all_icons.get("standard_icons")
	
	return settings,user_icons,standard_icons
	
@frappe.whitelist()
def get_theme_settings():

	settings = frappe.get_single('Kard Theme Settings')
	
	return settings
	
@frappe.whitelist()
def get(module):
	"""Returns data (sections, list of reports, counts) to render module view in desk:
	`/desk/#Module/[name]`."""
	data = get_data(module)
	out = {
		"data": data
	}

	return out
	
def get_data(module, build=True):
	"""Get module data for the module view `desk/#Module/[name]`"""
	doctype_info = get_doctype_info(module)

	data = build_standard_config(module, doctype_info)
			
	data = combine_common_sections(data)
	data = apply_permissions(data)

	# set_last_modified(data)

	# if build:
		# exists_cache = {}
		# def doctype_contains_a_record(name):
			# exists = exists_cache.get(name)
			# if not exists:
				# if not frappe.db.get_value('DocType', name, 'issingle'):
					# exists = frappe.db.count(name)
				# else:
					# exists = True
				# exists_cache[name] = exists
			# return exists

		# for section in data:
			# for item in section["items"]:
				# # Onboarding

				# # First disable based on exists of depends_on list
				# doctype = item.get("doctype")
				# dependencies = item.get("dependencies") or None
				# if not dependencies and doctype:
					# item["dependencies"] = [doctype]

				# dependencies = item.get("dependencies")
				# if dependencies:
					# incomplete_dependencies = [d for d in dependencies if not doctype_contains_a_record(d)]
					# if len(incomplete_dependencies):
						# item["incomplete_dependencies"] = incomplete_dependencies

				# if item.get("onboard"):
					# # Mark Spotlights for initial
					# if item.get("type") == "doctype":
						# name = item.get("name")
						# count = doctype_contains_a_record(name)

						# item["count"] = count

	return data
	
def build_standard_config(module, doctype_info):
	data = []

	"""Build standard module data from DocTypes."""
	if not frappe.db.get_value("Module Def", module):
		return data

	add_custom_doctypes(data, doctype_info,module)

	return data
	
def add_section(data, label, icon, items,color="#7f8c8d",shown_in="module_view"):
	"""Adds a section to the module data."""
	if not items: return
	data.append({
		"label": label,
		"icon": icon,
		"items": items,
		"color":color,
		"shown_in":shown_in
	})
	
def add_custom_doctypes(data, doctype_info,module):
	sections =  frappe.get_list("MRP Module Section", fields=["name", "icon", "shown_in"],order_by="name")
	for link in sections:
		if link.shown_in != "none":
			add_section(data, _(link.name), link.icon,
				[d for d in doctype_info if (d.document_type == link.name)],link.color,link.shown_in)

	get_custom_links(data,module)

	add_section(data, _("Reports"), "fa fa-list",
		[d for d in get_custom_report_list(module)],"lightblue","module_menu")

def get_doctype_info(module):
	"""Returns list of non child DocTypes for given module."""
	active_domains = frappe.get_active_domains()

	doctype_info = frappe.get_all("DocType", filters={
		"module": module,
		"istable": 0
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=["'doctype' as type", "name", "description", "document_type",
		"custom", "issingle","beta","icon","custom_label as label"], order_by="custom asc, document_type desc, name asc")
		
		
	doctype_info += frappe.get_all("Page", filters={
		"module": module
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=["'page' as type", "name","title as label", "description", "document_type",
		"custom","beta","icon"], order_by="custom asc, document_type desc, name asc")


	for d in doctype_info:
		d.document_type = d.document_type or ""
		d.description = _(d.description or "")
		# if ('icon' not in d):
			# d["icon"] = "fa fa-file-text"
		# elif d.icon == "" or d.icon == None:
			# d["icon"] = "fa fa-file-text"
		d["icon"] = ""
	return doctype_info


def get_custom_links(data,module):
	custom_links =  frappe.get_list("Module View Link", fields=["label","section","type","icon", "_doctype","_module","_report","_page","link","use_section_set_in_doctype"], filters=
		{"blocked": 0, "module_name": module})
		
	for link in custom_links:
		
		section_icon, section_color,section_shown_in = frappe.db.get_value("MRP Module Section", link.section, 
			["icon", "color","shown_in"])
			
		if section_shown_in != "none":
		
		
			name = link.label
			if link.type == "doctype":
				name = link._doctype
			elif link.type == "link":
				name = link.label
			elif link.type == "page":
				name = link._page
			elif link.type == "report":
				name = link._report
			elif link.type == "module" and link._module:
				doctype_info = get_doctype_info(link._module)
				
				items = []
				for d in doctype_info:
					if d.document_type:
						custom_shown_in = frappe.db.get_value("MRP Module Section", d.document_type, ["shown_in"])
						if custom_shown_in != "none":
							items.append(d)
						
				if items:
					add_section(data, _(link.section), section_icon, items,section_color,section_shown_in)
					
				add_section(data, _("Reports"), "fa fa-list",
					[d for d in get_custom_report_list(link._module)],"lightblue","module_menu")		
							
				continue
			
		
		
		
			add_section(data, _(link.section),section_icon,[
			{
				"type": link.type,
				"name": name,
				"icon": link.icon,
				"label": _(link.label),
				"link": link.link,
			}],section_color,section_shown_in)
			
			
	
def get_custom_report_list(module):
	"""Returns list on new style reports for modules."""
	reports =  frappe.get_list("Report", fields=["name", "ref_doctype", "report_type","favorite"], filters=
		{"disabled": 0, "module": module},
		order_by="favorite desc, name")
		
	out = []
	for r in reports:
		out.append({
			"type": "report",
			"doctype": r.ref_doctype,
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
			"label": _(r.name),
			"name": r.name,
			"icon": "fa fa-star" if r.favorite == 1 else "",
			"favorite":r.favorite
		})

	return out




@frappe.whitelist()
def get_desktop_settings():
	from frappe.config import get_modules_from_all_apps_for_user
	from frappe.desk.moduleview import get_home_settings

	all_modules = get_modules_from_all_apps_for_user()
	home_settings = get_home_settings()

	modules_by_name = {}
	for m in all_modules:
		modules_by_name[m['module_name']] = m

	module_categories = ['Modules', 'Domains', 'Places', 'Administration']
	user_modules_by_category = {}

	user_saved_modules_by_category = home_settings.modules_by_category or {}
	user_saved_links_by_module = home_settings.links_by_module or {}

	def apply_user_saved_links(module):
		module = frappe._dict(module)
		
		from frappe.desk.moduleview import get_links
		all_links = get_links(module.app, module.module_name)
		module_links_by_name = {}
		for link in all_links:
			module_links_by_name[link['name']] = link

		if module.module_name in user_saved_links_by_module:
			user_links = frappe.parse_json(user_saved_links_by_module[module.module_name])
			module.links = [module_links_by_name[l] for l in user_links if l in module_links_by_name]

		return module

	for category in module_categories:
		if category in user_saved_modules_by_category:
			user_modules = user_saved_modules_by_category[category]
			user_modules_by_category[category] = [apply_user_saved_links(modules_by_name[m]) \
				for m in user_modules if modules_by_name.get(m)]
		else:
			user_modules_by_category[category] = [apply_user_saved_links(m) \
				for m in all_modules if m.get('category') == category]

	# filter out hidden modules
	if home_settings.hidden_modules:
		for category in user_modules_by_category:
			hidden_modules = home_settings.hidden_modules or []
			modules = user_modules_by_category[category]
			user_modules_by_category[category] = [module for module in modules if module.module_name not in hidden_modules]

	return user_modules_by_category
