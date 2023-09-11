# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "kard_theme"
app_title = "Kard Theme"
app_publisher = "kardmode"
app_description = "Custom Frappe Theme"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "kardmode@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/kard_theme/css/kard_theme.css"
app_include_js = "/assets/kard_theme/js/kard_theme.js"

boot_session = "kard_theme.kard_theme.utils.boot_session"
# include js, css files in header of web template
# web_include_css = "/assets/kard_theme/css/kard_theme.css"
# web_include_js = "/assets/kard_theme/js/kard_theme.js"

# include js in page
# page_js = {"workspaces" : "public/js/workspace.js"}

# include js in doctype views
# doctype_js = {"dashboard" : "public/js/dashboard.js"}
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "kard_theme.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "kard_theme.install.before_install"
# after_install = "kard_theme.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "kard_theme.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"kard_theme.tasks.all"
# 	],
# 	"daily": [
# 		"kard_theme.tasks.daily"
# 	],
# 	"hourly": [
# 		"kard_theme.tasks.hourly"
# 	],
# 	"weekly": [
# 		"kard_theme.tasks.weekly"
# 	]
# 	"monthly": [
# 		"kard_theme.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "kard_theme.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
override_whitelisted_methods = {
	# "frappe.desk.moduleview.get": "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get",
	# "frappe.desk.moduleview.get_desktop_settings": "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_desktop_settings",
}
		

