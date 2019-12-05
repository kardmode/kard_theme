# -*- coding: utf-8 -*-
# Copyright (c) 2019, kardmode and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from six import iteritems
import frappe
from frappe import _
from kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon import get_desktop_icons,get_standard_icons
from frappe.model.document import Document
from frappe.desk.moduleview import (get_data, get_onboard_items, config_exists, get_module_link_items_from_list)
from frappe.desk.moduleview import get_home_settings,get_links
from frappe.config import get_all_empty_tables_by_module

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
def get_links_for_module(app, module):
	return [l.get('label') for l in get_links(app, module)]

def get_links(app, module):
	try:
		sections = get_config(app, frappe.scrub(module))
	except ImportError:
		return []

	links = []
	for section in sections:
		for item in section['items']:
			links.append(item)
	return links
	
@frappe.whitelist()
def get_desktop_settings():
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
		all_links = get_links(module.app, module.module_name)
		module_links_by_label = {}
		for link in all_links:
			
				
			if 'label' not in link:
				link['label'] = link['name']
			elif link['label'] == None:
				link['label'] = link['name']
			module_links_by_label[link['label']] = link
			
		if module.module_name in user_saved_links_by_module:
			user_links = frappe.parse_json(user_saved_links_by_module[module.module_name])
			if user_links:
				module.links = [module_links_by_label[l] for l in user_links if l in module_links_by_label]
		
		
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
	
@frappe.whitelist()
def get_theme_info():

	settings = frappe.get_single('Kard Theme Settings')

	user_icons = get_desktop_icons()
	
	
	standard_icons = get_standard_icons()
	return settings,user_icons,standard_icons


	
	
@frappe.whitelist()
def get_module_info(module):
	from frappe.desk.moduleview import get_data
	data = get_data(module)
	return data
	
	
	
def get_modules_from_all_apps_for_user(user=None):
	if not user:
		user = frappe.session.user

	all_modules = get_modules_from_all_apps()
	user_blocked_modules = frappe.get_doc('User', user).get_blocked_modules()
	allowed_modules_list = [m for m in all_modules if m.get("module_name") not in user_blocked_modules]

	empty_tables_by_module = get_all_empty_tables_by_module()

	for module in allowed_modules_list:
		module_name = module.get("module_name")

		# Apply onboarding status
		if module_name in empty_tables_by_module:
			module["onboard_present"] = 1

		# Set defaults links
		module["links"] =  get_onboard_items(module["app"], frappe.scrub(module_name))[:5]

	return allowed_modules_list

def get_modules_from_all_apps():
	modules = []
	try:
		# modules = frappe.get_attr(app + '.config.desktop.get_data')() or {}
		
		modules_list = frappe.db.get_all('Module Def',
			fields=['module_name','app_name'], order_by='module_name asc')
		
		for i, m in enumerate(modules_list):
			modules.append({
				'module_name': m.module_name,
				'label': m.module_name,
				'standard': 1,
				'app': m.app_name,
				'color': 'grey',
				'icon': 'octicon octicon-file-directory',
				'type': 'module',
				'category': 'Modules',
			})
		
	except ImportError:
		return []

	active_domains = frappe.get_active_domains()

	if isinstance(modules, dict):
		active_modules_list = []
		for m, module in iteritems(modules):
			module['module_name'] = m
			module['app'] = m.app
			active_modules_list.append(module)
	else:
		for m in modules:
			if m.get("type") == "module" and "category" not in m:
				m["category"] = "Modules"

		# Only newly formatted modules that have a category to be shown on desk
		modules = [m for m in modules if m.get("category")]
		active_modules_list = []

		for m in modules:
			to_add = True
			module_name = m.get("module_name")

			# Check Domain
			if is_domain(m) and module_name not in active_domains:
				to_add = False


			if "condition" in m and not m["condition"]:
				to_add = False
			if to_add:
				active_modules_list.append(m)

	return active_modules_list

def get_all_empty_tables_by_module():
	empty_tables = set(r[0] for r in frappe.db.multisql({
		"mariadb": """
			SELECT table_name
			FROM information_schema.tables
			WHERE table_rows = 0 and table_schema = "{}"
			""".format(frappe.conf.db_name),
		"postgres": """
			SELECT "relname" as "table_name"
			FROM "pg_stat_all_tables"
			WHERE n_tup_ins = 0
		"""
	}))

	results = frappe.get_all("DocType", fields=["name", "module"])
	empty_tables_by_module = {}

	for doctype, module in results:
		if "tab" + doctype in empty_tables:
			if module in empty_tables_by_module:
				empty_tables_by_module[module].append(doctype)
			else:
				empty_tables_by_module[module] = [doctype]
	return empty_tables_by_module

def is_domain(module):
	return module.get("category") == "Domains"

def is_module(module):
	return module.get("type") == "module"

