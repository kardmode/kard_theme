# -*- coding: utf-8 -*-
# Copyright (c) 2019, kardmode and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class KardThemeSettings(Document):
	def clear_user_icons(self):
		fields = ['name','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

		
		user_icons = frappe.db.get_all('Desktop Icon', fields=fields,
			filters={'standard': 0})
			
		
			
		for icon in user_icons:
			frappe.errprint(icon.name)
			frappe.delete_doc('Desktop Icon', icon.name, ignore_missing=True)

		
	def initialize_standard_icons(self):
		fields = ['name','module_name', 'hidden', 'label', 'link', 'type', 'icon', 'color', 'description', 'category',
			'_doctype', '_report', 'idx', 'force_show', 'reverse', 'custom', 'standard', 'blocked']

	
		
		standard_icons = frappe.db.get_all('Desktop Icon',
			fields=fields, filters={'standard': 1})
			
		for icon in standard_icons:
			frappe.delete_doc('Desktop Icon', icon.name, ignore_missing=True)

		
		modules = frappe.db.get_all('Module Def',
			fields=['name','app_name'], filters={})
			
		
		for m in modules:
			new_icon = frappe.get_doc({
				'doctype': 'Desktop Icon',
				'module_name': m.name,
				'label': m.name,
				'standard': 1,
				'app': m.app_name,
				'color': 'grey',
				'icon': 'octicon octicon-file-directory',
				'idx': 0,
			}).insert()	
			

