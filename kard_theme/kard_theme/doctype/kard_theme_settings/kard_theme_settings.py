# -*- coding: utf-8 -*-
# Copyright (c) 2019, kardmode and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from six import iteritems
import frappe
import json
from frappe import _
from frappe.model.document import Document
from frappe.boot import get_allowed_pages, get_allowed_reports
from frappe.cache_manager import (
	build_domain_restriced_doctype_cache,
	build_domain_restriced_page_cache,
	build_table_count_cache,
)
from kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon import get_desktop_icons,clear_desktop_icons_cache

class KardThemeSettings(Document):
	@frappe.whitelist()	
	def clear_user_icons(self):
		frappe.db.sql('delete from `tabKard Desktop Icon` where standard=0')
		clear_desktop_icons_cache()

@frappe.whitelist()
def get_theme_info():
	settings = get_theme_settings()
	all_icons = get_desktop_icons(enable_links_by_module = settings.enable_links_by_module)
	user_icons = all_icons.get("user_icons")
	standard_icons = all_icons.get("standard_icons")
	return settings,user_icons,standard_icons
	
@frappe.whitelist()
def get_theme_settings():
	settings = frappe.get_single('Kard Theme Settings')
	return settings
	
@frappe.whitelist()
def get(module, build=False, is_workspace=0):
	try:
		boot = frappe.sessions.get()
	except Exception as e:
		boot = frappe._dict(status='failed', error = str(e))
		print(frappe.get_traceback())

	data = []
	if is_workspace == "1":
		get_custom_links(data,module,is_workspace)
	else:	
		doctype_info = get_doctype_info(module)
		data = build_standard_config(module, doctype_info)

	data = combine_common_sections(data)
	data = apply_permissions(data)
	
	data = check_pinned(data)
	
	if len(data) == 0:
		items = []
		data.append({
			"label": "No Entries",
			"icon": "fa fa-file-directory",
			"items":items,
			"color": "#7f8c8d",
			"shown_in":"module_view"
		})
	
	
	# set_last_modified(data)

	if build:
		exists_cache = get_table_with_counts()
		def doctype_contains_a_record(name):
			exists = exists_cache.get(name)
			if not exists:
				if not frappe.db.get_value('DocType', name, 'issingle'):
					exists = frappe.db.count(name)
				else:
					exists = True
				exists_cache[name] = exists
			return exists

		for section in data:
			for item in section["items"]:
				# Onboarding

				# First disable based on exists of depends_on list
				doctype = item.get("doctype")
				dependencies = item.get("dependencies") or None
				if not dependencies and doctype:
					item["dependencies"] = [doctype]

				dependencies = item.get("dependencies")
				if dependencies:
					incomplete_dependencies = [d for d in dependencies if not doctype_contains_a_record(d)]
					if len(incomplete_dependencies):
						item["incomplete_dependencies"] = incomplete_dependencies

				if item.get("onboard"):
					# Mark Spotlights for initial
					if item.get("type") == "doctype":
						name = item.get("name")
						count = doctype_contains_a_record(name)

						item["count"] = count
	
	out = {
		"data": data
	}

	return out
	
def check_pinned(data):
	user = frappe.session.user

	for s in data:
		for d in s['items']:
			favorite = 0
			favorites = []
			if d.type == 'report':
				favorites = frappe.db.get_all('Kard Pinned Entry',
							fields=['name'], filters= {"_report": d.name,'owner': user})				
			elif d.type == 'doctype':
				link = d.get('link') or ''
				favorites = frappe.db.get_all('Kard Pinned Entry',
							fields=['name'], filters= {"_doctype": d.name,"link":link,'owner': user})
				
			if favorites:
				favorite = 1
			
			d["favorite"] = favorite
			
			# if favorite == 1:
				# pinned.append(d)
			# else:
				# unpinned.append(d)
				
		# Sort the list using the custom key function
		s['items']  = sorted(s['items'], key=custom_sort_key)
				
	return data
	
# Custom sorting key function
def custom_sort_key(item):
    # Sort by 'favorite' values (1 comes before 0)
    # Then, sort alphabetically by 'label'
    return (-item["favorite"], item["label"])
	
def build_standard_config(module, doctype_info):
	data = []

	"""Build standard module data from DocTypes."""
	if not frappe.db.get_value("Module Def", module):
		return data

	add_custom_doctypes(data, doctype_info, module)

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
	
def add_custom_doctypes(data, doctype_info, module):

	sections = frappe.db.get_all('MRP Module Section',
			fields=["name", "icon", "shown_in"], filters={}, order_by='name')

	for link in sections:
		if link.shown_in != "none":
			add_section(data, _(link.name), link.icon,
				[d for d in doctype_info if (d.document_type == link.name)],link.color,link.shown_in)

	# add_section(data, _("Other"), "",
				# [d for d in doctype_info if (d.document_type == "")],"#7f8c8d","module_view")

	get_custom_links(data,module)

	add_section(data, _("Reports"), "fa fa-list",
		[d for d in get_custom_report_list(module)],"lightblue","module_menu")

def get_doctype_info(module):
	"""Returns list of non child DocTypes for given module."""
	active_domains = frappe.get_active_domains()
	
	doctype_fields = ["'doctype' as type", "name", "description", "document_type",
		"custom", "issingle","beta","icon","name as label"]

	doctype_info = frappe.get_all("DocType", filters={
		"module": module,
		"istable": 0
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=doctype_fields, order_by="custom asc, document_type desc, name asc")
		
	page_fields = ["'page' as type", "name","title as label","icon"]
	page_meta = frappe.get_meta("Page")	
	if page_meta.has_field('description'):
		page_fields += ["description"]
	if page_meta.has_field('document_type'):
		page_fields += ["document_type"]
	if page_meta.has_field('custom'):
		page_fields += ["custom"]
	if page_meta.has_field('beta'):
		page_fields += ["beta"]
	
		
	doctype_info += frappe.get_all("Page", filters={
		"module": module
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=page_fields)


	for d in doctype_info:
		d.document_type = d.document_type or ""
		d.description = _(d.description or "")
		d.label = d.label or d.name
		d["icon"] = ""
	return doctype_info

def get_custom_links(data,module,is_workspace=False):
	custom_links = []
	filters = {"blocked": 0, "module_name": module}
	if is_workspace:
		filters = {"blocked": 0, "workspace": module}
	
	fields=["label","section","type","icon", "_doctype","_module","_report","_page","link","use_section_set_in_doctype"]
	
	custom_links = frappe.db.get_all('Module View Link',
			fields=fields, filters=filters, order_by='name')
	
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
	user = frappe.session.user

	"""Returns list on new style reports for modules."""
	report_fields = ["name", "ref_doctype", "report_type"]
	report_meta = frappe.get_meta("Report")
	order_by = "name"
	
	if report_meta.has_field('favorite'):
		report_fields += ["favorite"]
		order_by = "favorite desc, name"
		
	reports =  frappe.get_list("Report", fields=report_fields, filters=
		{"disabled": 0, "module": module},
		order_by=order_by)
		
	out = []
	for r in reports:
		global_favorite = 0
		favorite = 0
		favorite_icon = ""
		if "favorite" in r and r.favorite == 1:
			favorite_icon = "star"
			global_favorite = 1

		out.append({
			"type": "report",
			"doctype": r.ref_doctype,
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
			"label": _(r.name),
			"name": r.name,
			"icon": favorite_icon,
			"favorite": favorite,
			"global_favorite": global_favorite
		})

	return out

@frappe.whitelist()
def get_desktop_settings():
	try:
		boot = frappe.sessions.get()
	except Exception as e:
		boot = frappe._dict(status='failed', error = str(e))
		print(frappe.get_traceback())

	from frappe.desk.moduleview import get_home_settings

	all_modules = get_modules_from_all_apps_for_user()
	home_settings = get_home_settings()

	modules_by_name = {}
	for m in all_modules:
		modules_by_name[m['module_name']] = m

	categories = frappe.db.get_all('Kard Desktop Category',
			fields=["name"], filters={}, order_by='name')
	module_categories = []
	for m in categories:
		module_categories.append(m.name)
		
	from collections import OrderedDict 
	user_modules_by_category = OrderedDict() 
	user_saved_modules_by_category = {}
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

def get_modules_from_all_apps_for_user(user=None):
	if not user:
		user = frappe.session.user

	from frappe.config import get_all_empty_tables_by_module
	all_modules = get_modules_from_all_apps()
	global_blocked_modules = frappe.get_doc('User', 'Administrator').get_blocked_modules()
	user_blocked_modules = frappe.get_doc('User', user).get_blocked_modules()
	blocked_modules = global_blocked_modules + user_blocked_modules
	allowed_modules_list = [m for m in all_modules if m.get("module_name") not in blocked_modules]

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
	modules_list = []
	for app in frappe.get_installed_apps():
		modules_list += get_modules_from_app(app)
	return modules_list

def get_modules_from_app(app):
	try:		
		fields = ['name','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		modules = frappe.db.get_all('Kard Desktop Icon',
			fields=fields, filters={'standard': 1,'type':'module','app':app}) 

	except ImportError:
		return []

	active_domains = frappe.get_active_domains()

	if isinstance(modules, dict):
		active_modules_list = []
		for m, module in iteritems(modules):
			module['module_name'] = m
			module['app'] = app
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
				
			if not in_domains(m,active_domains):
				to_add = False

			# Check if config
			# if is_module(m) and not config_exists(app, frappe.scrub(module_name)):
				# to_add = False
				
			if not is_module(m):
				to_add = False

			if "condition" in m and not m["condition"]:
				to_add = False

			if to_add:
				m["app"] = app
				active_modules_list.append(m)

	return active_modules_list
	
def is_domain(module):
	return module.get("category") == "Domains"

def is_module(module):
	return module.get("type") == "module"
	
def in_domains(module,active_domains):
	domain = frappe.db.get_value('Module Def', module.get("module_name"), 'restrict_to_domain')
	if domain and domain not in active_domains:
		return False
	return True
	
@frappe.whitelist()
def update_hidden_modules(category_map):
	category_map = frappe.parse_json(category_map)
	
	from frappe.desk.moduleview import get_home_settings

	home_settings = get_home_settings()

	saved_hidden_modules = []
	
	for category in category_map:
		config = frappe._dict(category_map[category])
		# saved_hidden_modules += config.removed or []
		saved_hidden_modules += config.removed or []
		# saved_hidden_modules = [d for d in saved_hidden_modules if d not in (config.added or [])]

		# if home_settings.get('modules_by_category') and home_settings.modules_by_category.get(category):
			# module_placement = [d for d in (config.added or []) if d not in home_settings.modules_by_category[category]]
			# home_settings.modules_by_category[category] += module_placement

	home_settings.hidden_modules = saved_hidden_modules
	set_home_settings(home_settings)
	clear_desktop_icons_cache()
	return get_desktop_settings()

def set_home_settings(home_settings):
	frappe.cache().hset('home_settings', frappe.session.user, home_settings)
	frappe.db.set_value('User', frappe.session.user, 'home_settings', json.dumps(home_settings))
	
	
def combine_common_sections(data):
	"""Combine sections declared in separate apps."""
	sections = []
	sections_dict = {}
	for each in data:
		if each["label"] not in sections_dict:
			sections_dict[each["label"]] = each
			sections.append(each)
		else:
			sections_dict[each["label"]]["items"] += each["items"]

	return sections
	
def apply_permissions(data):
	default_country = frappe.db.get_default("country")

	user = frappe.get_user()
	user.build_permissions()

	allowed_pages = get_allowed_pages()
	allowed_reports = get_allowed_reports()

	new_data = []
	for section in data:
		new_items = []

		for item in section.get("items") or []:
			item = frappe._dict(item)

			if item.country and item.country != default_country:
				continue

			if (
				(item.type == "doctype" and item.name in user.can_read)
				or (item.type == "page" and item.name in allowed_pages)
				or (item.type == "report" and item.name in allowed_reports)
				or item.type == "help"
			):

				new_items.append(item)

		if new_items:
			new_section = section.copy()
			new_section["items"] = new_items
			new_data.append(new_section)

	return new_data
	
def get_table_with_counts():
	counts = frappe.cache().get_value("information_schema:counts")
	if counts:
		return counts
	else:
		return build_table_count_cache()
		
def get_onboard_items(app, module):
	onboard_items = []
	fallback_items = []

	if not sections:
		doctype_info = get_doctype_info(module)
		sections = build_standard_config(module, doctype_info)

	for section in sections:
		for item in section["items"]:
			if item.get("onboard", 0) == 1:
				onboard_items.append(item)

			# in case onboard is not set
			fallback_items.append(item)

			if len(onboard_items) > 5:
				return onboard_items

	return onboard_items or fallback_items
