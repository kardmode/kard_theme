import frappe

@frappe.whitelist()
def set_tabbed_forms(enabled):
	frappe.defaults.set_user_default(
		"enable_tabbed_forms",
		int(enabled),
		frappe.session.user,
	)

	frappe.clear_cache(user=frappe.session.user)
