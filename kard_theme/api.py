import frappe
from frappe.utils import cint

# Start menu ("All apps") metadata.
#
# The list of what a user may open comes from frappe.boot on the client
# (can_read / single_types / all_reports / page_info / allowed_workspaces /
# dashboards). Frappe already rebuilds boot when roles change, and other apps
# (e.g. mrp's search settings) trim it in their own boot hooks, so the Start
# menu inherits all of that for free. Boot lacks module and report type, so
# this endpoint supplies only those, from one site-wide cache.

APP_INDEX_KEY = "kard_theme:app_index"
APP_INDEX_VERSION_KEY = "kard_theme:app_index_version"


@frappe.whitelist()
def set_tabbed_forms(enabled):
	frappe.defaults.set_user_default(
		"enable_tabbed_forms",
		int(enabled),
		frappe.session.user,
	)

	frappe.clear_cache(user=frappe.session.user)


# Per-user Start menu options (stored as user defaults, so they follow the user across devices).
# pref name -> (user default key, site_config key for the site-wide default)
START_PREFS = {
	"type_to_search": ("kard_type_to_search", "kard_start_type_to_search"),
	"show_lists": ("kard_start_show_lists", "kard_start_show_lists"),
	"search_everywhere": ("kard_start_search_everywhere", "kard_start_search_everywhere"),
}


def get_start_prefs():
	"""Effective on/off for each option: the user's own choice, else the site default (on)."""
	prefs = {}
	for pref, (user_key, site_key) in START_PREFS.items():
		value = frappe.defaults.get_user_default(user_key)
		prefs[pref] = cint(value) if value in ("0", "1") else cint(frappe.conf.get(site_key, 1))
	return prefs


@frappe.whitelist()
def set_start_pref(pref, enabled):
	if pref not in START_PREFS:
		frappe.throw(frappe._("Unknown Start menu option {0}").format(pref))
	frappe.defaults.set_user_default(START_PREFS[pref][0], "1" if cint(enabled) else "0", frappe.session.user)
	return cint(enabled)


@frappe.whitelist()
def set_type_to_search(enabled):
	"""Per-user switch for opening the Start panel by typing with nothing focused."""
	return set_start_pref("type_to_search", enabled)


@frappe.whitelist()
def get_app_index():
	"""Module (and report type) for each DocType, Report and Page the user can open."""
	index = frappe.cache().get_value(APP_INDEX_KEY)
	if not index:
		index = _build_app_index()
		frappe.cache().set_value(APP_INDEX_KEY, index)

	from frappe.boot import get_allowed_pages, get_allowed_reports

	user = frappe.get_user()
	user.build_permissions()
	can_read = set(user.can_read)
	allowed_reports = get_allowed_reports(cache=True)
	allowed_pages = get_allowed_pages(cache=True)

	return {
		"version": get_app_index_version(),
		"doctypes": {k: v for k, v in index["doctypes"].items() if k in can_read},
		"reports": {k: v for k, v in index["reports"].items() if k in allowed_reports},
		"pages": {k: v for k, v in index["pages"].items() if k in allowed_pages},
	}


@frappe.whitelist()
def get_pinned_entries():
	"""Kard Pinned Entry rows (the user's own + global) that float to the top of All apps.
	Same entries kard_theme's workspace "explore" menus already sort to the top."""
	from kard_theme.kard_theme.doctype.kard_pinned_entry.kard_pinned_entry import get_pinned_icons

	data = get_pinned_icons(frappe.session.user)
	out = []
	for is_global, rows in ((1, data.get("global_icons") or []), (0, data.get("user_icons") or [])):
		for r in rows:
			if cint(r.get("hidden")) or cint(r.get("blocked")) or r.get("type") == "URL":
				continue
			out.append(
				{
					"type": r.get("type"),
					"link_to": r.get("link_to"),
					"doc_view": r.get("doc_view") or "",
					"label": r.get("label"),
					"is_global": is_global,
				}
			)
	return out


def _build_app_index():
	doctypes = {
		d.name: {"module": d.module, "is_single": cint(d.issingle)}
		for d in frappe.get_all("DocType", filters={"istable": 0}, fields=["name", "module", "issingle"])
	}
	reports = {
		r.name: {"module": r.module, "report_type": r.report_type, "ref_doctype": r.ref_doctype}
		for r in frappe.get_all(
			"Report", filters={"disabled": 0}, fields=["name", "module", "report_type", "ref_doctype"]
		)
	}
	pages = {p.name: {"module": p.module} for p in frappe.get_all("Page", fields=["name", "module"])}
	return {"doctypes": doctypes, "reports": reports, "pages": pages}


def get_app_index_version():
	version = frappe.cache().get_value(APP_INDEX_VERSION_KEY)
	if not version:
		version = frappe.generate_hash(length=10)
		frappe.cache().set_value(APP_INDEX_VERSION_KEY, version)
	return version


def clear_app_index(doc=None, method=None):
	"""doc_events / after_migrate: DocType, Report or Page added, changed, renamed or removed."""
	frappe.cache().delete_value([APP_INDEX_KEY, APP_INDEX_VERSION_KEY])


def extend_bootinfo(bootinfo):
	"""Runs on every desk load (not cached with boot), so the flag and version are always fresh."""
	if frappe.session.user == "Guest":
		return
	bootinfo.kard_start = {
		"enabled": cint(frappe.conf.get("kard_start_menu")),
		"shortcut": frappe.conf.get("kard_start_shortcut") or "alt+q",
		# navbar search box + Ctrl+G open the panel instead of the awesomebar dropdown
		"replace_awesomebar": cint(frappe.conf.get("kard_start_replace_awesomebar", 1)),
		# typing with nothing focused opens the panel (each user can switch it off)
		"type_to_search": cint(frappe.conf.get("kard_start_type_to_search", 1)),
		# per-user options (site_config sets the default): type_to_search, show_lists, search_everywhere
		"prefs": get_start_prefs(),
		"app_index_version": get_app_index_version(),
	}


# --- Start menu bookmarks (Kard Desktop Icon) --------------------------------
# Only ever touch the caller's own, non-standard icons. (The older
# kard_desktop_icon.hide / set_order endpoints act on any icon by name.)

BOOKMARK_TYPES = ("DocType", "Report", "Page", "Dashboard")


def _own_bookmark(name):
	icon = frappe.db.get_value(
		"Kard Desktop Icon", name, ["name", "owner", "standard"], as_dict=True
	)
	if not icon or icon.owner != frappe.session.user or cint(icon.standard):
		frappe.throw(frappe._("Bookmark not found"), frappe.PermissionError)
	return icon


def _category(category):
	"""Link value for a category label; creates the label if it's new. Blank / Uncategorized -> None."""
	category = (category or "").strip()
	if not category or category == "Uncategorized":
		return None
	if not frappe.db.exists("Kard Desktop Category", category):
		frappe.get_doc({"doctype": "Kard Desktop Category", "category_name": category}).insert(
			ignore_permissions=True
		)
	return category


def _clear_bookmarks_cache():
	from kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon import clear_desktop_icons_cache

	clear_desktop_icons_cache(frappe.session.user)


@frappe.whitelist()
def add_bookmark(type, link_to, doc_view=None, label=None, url=None, category=None):
	"""Add a DocType / Report / Page / Dashboard to the caller's bookmarks (no-op if already there)."""
	import json

	from kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon import add_user_icon

	if type not in BOOKMARK_TYPES:
		frappe.throw(frappe._("Can't bookmark {0}").format(type))
	if type == "DocType" and not frappe.has_permission(link_to, "read"):
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)

	name = add_user_icon(
		json.dumps(
			{
				"type": type,
				"link_to": link_to,
				"doc_view": doc_view or "",
				"label": label or link_to,
				"link": url,
				"workspace": "Home",  # what kard_theme's own bookmark buttons store
				"remove": 0,
			}
		)
	)
	category = _category(category)
	if name and category:
		frappe.db.set_value("Kard Desktop Icon", name, "category", category)
		_clear_bookmarks_cache()
	return name


@frappe.whitelist()
def update_bookmark(name, label=None, category=None, icon=None, color=None):
	_own_bookmark(name)
	values = {"category": _category(category)}
	if label:
		values["label"] = label
	if icon:
		values["icon"] = icon
	if color is not None:
		values["color"] = color
	frappe.db.set_value("Kard Desktop Icon", name, values)
	_clear_bookmarks_cache()


@frappe.whitelist()
def save_bookmark_layout(layout):
	"""layout: [{name, category}] in display order -> idx and group for each of the caller's bookmarks."""
	import json

	if isinstance(layout, str):
		layout = json.loads(layout)
	for i, row in enumerate(layout or []):
		_own_bookmark(row.get("name"))
		frappe.db.set_value(
			"Kard Desktop Icon",
			row.get("name"),
			{"idx": i + 1, "category": _category(row.get("category"))},
			update_modified=False,
		)
	_clear_bookmarks_cache()


@frappe.whitelist()
def remove_bookmark(name):
	_own_bookmark(name)
	frappe.delete_doc("Kard Desktop Icon", name, ignore_permissions=True)
	_clear_bookmarks_cache()
