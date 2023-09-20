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
from kard_theme.kard_theme.doctype.kard_pinned_entry.kard_pinned_entry import get_pinned_icons,clear_pinned_icons_cache

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
def get(module=None,workspace=None, build=False):
	try:
		boot = frappe.sessions.get()
	except Exception as e:
		boot = frappe._dict(status='failed', error = str(e))
		print(frappe.get_traceback())

	data = []
	
	if module and frappe.db.get_value("Module Def", module):
		add_custom_doctypes(data,module)
		add_custom_links(data, module)
		add_custom_report_list(data, module)

	if workspace and frappe.db.get_value("Workspace", workspace):
		add_custom_links(data, workspace, True)
		add_workspace_custom_links(data, workspace)
		

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
					type = item.get("type").lower()
					if type == "doctype":
						name = item.get("name")
						count = doctype_contains_a_record(name)
						item["count"] = count
	
	out = {
		"data": data
	}

	return out
	
def check_pinned(data):
	user = frappe.session.user
	pinned = get_pinned_icons(user).get("user_icons")
	for s in data:
		for item in s['items']:
			name = item.name
			item_type = item.type
		
			# Check if there is a matching entry in icons
			matching_icon = next((icon for icon in pinned if icon.link_to == name and icon.type == item_type), None)

			# Set the 'favorite' key based on whether a matching entry was found
			item["favorite"] = 1 if matching_icon else 0
			
		# Sort the list using the custom key function
		s['items']  = sorted(s['items'], key=custom_sort_key)
	return data
	
def get_type_from_string(type):
	# Array of strings (not necessarily lowercase)
	string_array = ["DocType", "Report", "Page", "Dashboard","URL"]

	# Convert the search string to lowercase
	search_string_lower = type.lower()

	# Initialize a variable to store the found string (if any)
	found_string = None

	# Iterate through the array and check for a match (case-insensitive)
	for string in string_array:
		if search_string_lower == string.lower():
			found_string = string
			break  # Stop searching once a match is found
	
	return found_string
	
# Custom sorting key function
def custom_sort_key(item):
    # Sort by 'favorite' values (1 comes before 0)
    # Then, sort alphabetically by 'label'
    return (-item["favorite"], item["label"])
	
def add_section(data, label, icon, items, color="#7f8c8d",shown_in="module_view"):
	"""Adds a section to the module data."""
	if not items: return
	data.append({
		"label": label,
		"icon": icon,
		"items": items,
		"color":color,
		"shown_in":shown_in
	})

def get_doctype_info(module):
	"""Returns list of non child DocTypes for given module."""
	active_domains = frappe.get_active_domains()
	
	doctype_fields = ["'DocType' as type", "name", "description", "document_type",
		"custom", "issingle","beta","icon","name as label"]

	doctype_info = frappe.get_all("DocType", filters={
		"module": module,
		"istable": 0
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=doctype_fields, order_by="custom asc, document_type desc, name asc")
		
	page_fields = ["'Page' as type", "name","title as label","icon"]
	page_meta = frappe.get_meta("Page")	
	# for field in ['description','document_type','custom','beta']:
		# if page_meta.has_field(field):
			# page_fields += field
			
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


	dashboard_fields = ["'Dashboard' as type","name","dashboard_name as label","'Dashboard' as document_type"]
	doctype_info += frappe.get_all("Dashboard", filters={
		"module": module
	}, fields=dashboard_fields)

	for d in doctype_info:
		d['document_type'] = d.get('document_type') or ""
		d['description'] = _(d.get('description') or "")
		d['label'] = _(d.label or d.name)
		d["icon"] = ""
		d["doc_view"] = "List" if d.type == 'DocType' else ''
		d["link_to"] = d.name
		
	return doctype_info
		
def add_custom_doctypes(data,module):
	settings = get_theme_settings()

	if settings.use_doctype_info_for_links_menu == 1:
		doctype_info = get_doctype_info(module)
	
		add_section(data, _("Document"), "",
			[d for d in doctype_info if (not d.document_type == "")],"#7f8c8d","module_view")

		if settings.show_uncategorized_in_link_menu == 1:
			add_section(data, _("Other"), "",
				[d for d in doctype_info if (d.document_type == "")],"#7f8c8d","module_view")

def add_custom_report_list(data,module):
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
		if r.get('favorite') == 1:
			global_favorite = 1

		out.append({
			"type": "Report",
			"ref_doctype": r.ref_doctype,
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
			"label": _(r.name),
			"name": r.name,
			"icon": "",
			"favorite": favorite,
			"global_favorite": global_favorite,
			"doc_view": "" if r.report_type in ("Query Report", "Script Report", "Custom Report") else "Report Builder"
		})
		
	add_section(data, _("Reports"), "fa fa-list",
		[d for d in out],"lightblue","module_menu")
		
def add_workspace_custom_links(data,workspace):
	workspace_meta = frappe.get_meta("Workspace")
	custom_links = []
	if workspace_meta.has_field('kard_menu'):
		workspace_doc = frappe.get_doc("Workspace", workspace)
		custom_links = workspace_doc.kard_menu
	
	
	for link in custom_links:
		section_color = '#dddddd'
		if workspace_meta.has_field('kard_theme_color'):
			section_color = workspace_doc.kard_theme_color
		
		section_icon = workspace_doc.icon

		name = link.link_to
		type = str(link.type).lower() if link.type else 'url'

		if type == "url":
			name = link.label
		elif type == "module" and link.link_to:
			doctype_info = get_doctype_info(link.link_to)
			
			items = []
			for d in doctype_info:
				if d.document_type:
					items.append(d)
						
			if items:
				add_section(data, _('Document'), section_icon, items, section_color, 'module_menu')
				
			add_custom_report_list(data,link.link_to)
			continue
			
		elif type == "report":
			global_favorite = 0
			favorite = 0
		
			report_meta = frappe.get_meta("Report")
			report_fields = ["report_type", "ref_doctype"]
			if report_meta.has_field('favorite'):
				report_fields += ["favorite"]
			
			r = frappe.db.get_value("Report", link.link_to, report_fields,as_dict=True)

			if r.get('favorite') == 1:
				global_favorite = 1
			
			add_section(data, _('Reports'),section_icon,[
			{
				"type": link.type,
				"ref_doctype": r.ref_doctype,
				"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
				"name": name,
				"label": _(link.label),
				"url": link.url,
				"icon": link.icon,
				"favorite": favorite,
				"global_favorite": global_favorite,
				"doc_view": link.doc_view,
			}],section_color,'module_menu')
			
			continue
			
		add_section(data, _('Document'),section_icon,[
		{
			"type": link.type,
			"name": name,
			"icon": link.icon,
			"label": _(link.label),
			"link": link.url,
			"doc_view": link.doc_view,
		}],section_color,'module_menu')
		
def add_custom_links(data,module,is_workspace=False):
	custom_links = []
	
	filters = {"module_name": module}
	if is_workspace:
		filters = {"workspace": module}
	
	fields=["label","section","type","icon", "link_to", "doc_view", "link", "use_section_set_in_doctype"]
	
	custom_links = frappe.db.get_all('Kard Module Link',
			fields=fields, filters=filters, order_by='name')
	
	for link in custom_links:
		name = link.link_to
		type = str(link.type).lower() if link.type else 'url'

		if type == "url":
			name = link.label
		elif type == "module" and link.link_to:
			doctype_info = get_doctype_info(link.link_to)
			
			items = []
			for d in doctype_info:
				if d.document_type:
					items.append(d)
					
			if items:
				add_section(data, _(link.section), link.icon, items,link.color,"module_view")
				
			add_custom_report_list(data,link.link_to)	
			continue
		elif type == "report":
			global_favorite = 0
			favorite = 0
		
			report_meta = frappe.get_meta("Report")
			report_fields = ["report_type", "ref_doctype"]
			if report_meta.has_field('favorite'):
				report_fields += ["favorite"]
		
			r = frappe.db.get_value("Report", link.link_to,report_fields,as_dict=True)

			if r.get('favorite') == 1:
				global_favorite = 1
			
			add_section(data, _('Reports'),link.icon,[
			{
				"doctype": r.ref_doctype,
				"type": link.type,
				"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
				"name": name,
				"label": _(link.label),
				"url": link.url,
				"icon": link.icon,
				"favorite": favorite,
				"global_favorite": global_favorite,
				"doc_view": link.doc_view,
			}],link.color,'module_menu')
		
		add_section(data, _(link.section),link.icon,[
		{
			"type": link.type,
			"name": name,
			"icon": link.icon,
			"label": _(link.label),
			"url": link.url,
			"doc_view": link.doc_view,
		}],link.color,"module_view")
		
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

			# if item.country and item.country != default_country:
				# continue
			type = item.get("type").lower()
			
			if (
				(type == "doctype" and item.name in user.can_read)
				or (type == "page" and item.name in allowed_pages)
				or (type == "report" and item.name in allowed_reports)
				or type == "url"
				or (type == "dashboard" and "Dashboard" in user.can_read)
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
