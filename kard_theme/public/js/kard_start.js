// Start menu: catalogue of everything the user can open ("All apps").
//
// Built from frappe.boot (what the user may open, already trimmed by other
// apps' boot hooks) plus kard_theme.api.get_app_index (module / report type,
// which boot lacks). No UI yet; try frappe.kard_start.get_catalogue() in the
// console.
//
// Other apps can hide items without kard_theme depending on them:
//   (frappe.kard_start_filters = frappe.kard_start_filters || []).push(item => keep?)
// Load order between apps doesn't matter; filters are read at build time.

frappe.provide("frappe.kard_start");

(function () {
	const STORAGE_PREFIX = "kard_start:app_index:";
	// Pages that exist in page_info but aren't somewhere a person navigates to.
	// (dashboard-view needs a dashboard name; dashboards are listed individually.)
	const EXCLUDED_PAGES = new Set(["hub", "setup-wizard", "print", "kard-desktop", "dashboard-view"]);

	let catalogue = null;
	let catalogue_promise = null;

	function storage_get(key) {
		try {
			return JSON.parse(localStorage.getItem(key) || "null");
		} catch (e) {
			return null;
		}
	}

	function storage_set(key, value) {
		try {
			// drop older versions for this user so storage doesn't accumulate
			Object.keys(localStorage)
				.filter((k) => k.startsWith(STORAGE_PREFIX + frappe.session.user + ":"))
				.forEach((k) => localStorage.removeItem(k));
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) {
			// private window, quota, blocked storage: the menu still works, just refetches
		}
	}

	function roles_hash() {
		const roles = ((frappe.boot.user && frappe.boot.user.roles) || []).slice().sort().join("|");
		let h = 0;
		for (let i = 0; i < roles.length; i++) h = (h * 31 + roles.charCodeAt(i)) | 0;
		return (h >>> 0).toString(36);
	}

	function storage_key() {
		const version = (frappe.boot.kard_start && frappe.boot.kard_start.app_index_version) || "0";
		return `${STORAGE_PREFIX}${frappe.session.user}:${version}:${roles_hash()}`;
	}

	function get_app_index() {
		const key = storage_key();
		const cached = storage_get(key);
		if (cached) return Promise.resolve(cached);

		return frappe
			.xcall("kard_theme.api.get_app_index")
			.then((index) => {
				storage_set(key, index);
				return index;
			})
			.catch(() => ({ doctypes: {}, reports: {}, pages: {} }));
	}

	function make_item(type, name, label, module, route, extra) {
		return Object.assign(
			{
				key: `${type}:${name}`,
				type: type, // doctype | tree | report | page | workspace | dashboard
				name: name,
				label: label,
				module: module || "",
				route: route,
			},
			extra || {}
		);
	}

	function build(index) {
		const boot = frappe.boot;
		const user = boot.user || {};
		const can_search = new Set(user.can_search || []);
		const can_create = new Set(user.can_create || []);
		const singles = new Set(boot.single_types || []);
		const treeviews = new Set(boot.treeviews || []);
		const items = [];

		// page_info also lists tree views as pseudo-pages (e.g. "Chart of Accounts" -> Tree/Account).
		// Use their titles for the tree entries below and don't list them again as pages.
		const tree_titles = {};
		Object.keys(boot.page_info || {}).forEach((name) => {
			const route = String((boot.page_info[name] || {}).route || "").split("/");
			if (route[0] === "Tree" && route[1]) tree_titles[route[1]] = boot.page_info[name].title || name;
		});

		// DocTypes: same rules as Frappe's awesomebar (search_utils.get_doctypes)
		(user.can_read || []).forEach((dt) => {
			const meta = index.doctypes[dt] || {};
			if (singles.has(dt)) {
				items.push(make_item("doctype", dt, __(dt), meta.module, ["Form", dt, dt], { is_single: 1 }));
			} else if (can_search.has(dt)) {
				items.push(
					make_item("doctype", dt, __(dt), meta.module, ["List", dt], {
						can_create: can_create.has(dt) ? 1 : 0,
					})
				);
				if (treeviews.has(dt)) {
					const label = tree_titles[dt] ? __(tree_titles[dt]) : __("{0} Tree", [__(dt)]);
					items.push(make_item("tree", dt, label, meta.module, ["Tree", dt]));
				}
			}
		});

		// Reports
		Object.keys(user.all_reports || {}).forEach((name) => {
			const report = user.all_reports[name] || {};
			const meta = index.reports[name] || {};
			const report_type = meta.report_type || report.report_type;
			const ref_doctype = meta.ref_doctype || report.ref_doctype;
			const route =
				report_type === "Report Builder"
					? ["List", ref_doctype, "Report", name]
					: ["query-report", name];
			items.push(make_item("report", name, __(name), meta.module, route, { report_type: report_type }));
		});

		// Pages
		Object.keys(boot.page_info || {}).forEach((name) => {
			if (EXCLUDED_PAGES.has(String(name).toLowerCase())) return;
			const page = boot.page_info[name] || {};
			const route = String(page.route || name).split("/");
			if (route[0] === "Tree") {
				// normally covered by the tree entries above; add it if that loop didn't
				const dt = route[1];
				if (dt && !items.some((i) => i.key === `tree:${dt}`)) {
					const dt_meta = index.doctypes[dt] || {};
					items.push(make_item("tree", dt, __(page.title || name), dt_meta.module, route));
				}
				return;
			}
			const meta = index.pages[name] || {};
			items.push(make_item("page", name, __(page.title || name), meta.module, route));
		});

		// Workspaces (public + the user's private ones; hidden ones skipped)
		(boot.allowed_workspaces || []).forEach((ws) => {
			if (cint(ws.is_hidden)) return;
			items.push(
				make_item("workspace", ws.name, __(ws.title || ws.name), ws.module,
					ws.public ? ["Workspaces", ws.name] : ["Workspaces", "private", ws.title || ws.name], {
					icon: ws.icon,
					is_private: ws.public ? 0 : 1,
				})
			);
		});

		// Dashboards
		(boot.dashboards || []).forEach((d) => {
			const name = d.name || d;
			items.push(make_item("dashboard", name, __("{0} Dashboard", [__(name)]), "", ["dashboard-view", name]));
		});

		const filters = frappe.kard_start_filters || [];
		const seen = new Set();
		const out = items.filter((item) => {
			if (seen.has(item.key)) return false;
			seen.add(item.key);
			return filters.every((fn) => {
				try {
					return fn(item) !== false;
				} catch (e) {
					console.warn("kard_start filter failed", e);
					return true;
				}
			});
		});

		out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
		return out;
	}

	Object.assign(frappe.kard_start, {
		is_enabled() {
			if (frappe.boot.kard_start && cint(frappe.boot.kard_start.enabled)) return true;
			try {
				return localStorage.getItem("kard_start_menu") === "1";
			} catch (e) {
				return false;
			}
		},

		// Resolves to the sorted catalogue; built once per page load.
		get_catalogue(refresh) {
			if (catalogue && !refresh) return Promise.resolve(catalogue);
			if (!catalogue_promise || refresh) {
				catalogue_promise = get_app_index().then((index) => {
					catalogue = build(index);
					catalogue_promise = null;
					return catalogue;
				});
			}
			return catalogue_promise;
		},

		// Real URL for an item, so links work with middle-click / Ctrl+click / copy link.
		item_url(item) {
			const r = item.route || [];
			if (r[0] === "Workspaces") {
				const is_private = r[1] === "private";
				const name = is_private ? r[2] : r[1];
				return "/app/" + (is_private ? "private/" : "") + frappe.router.slug(name || "");
			}
			return frappe.router.make_url(frappe.router.convert_from_standard_route(r.slice()));
		},

		open_item(item, new_doc) {
			if (new_doc && item.type === "doctype" && item.can_create) {
				frappe.new_doc(item.name);
			} else {
				frappe.set_route(item.route);
			}
		},
	});

	// Warm the catalogue after load so the menu opens instantly later.
	$(document).on("app_ready", () => {
		if (frappe.session.user !== "Guest" && frappe.kard_start.is_enabled()) {
			setTimeout(() => frappe.kard_start.get_catalogue(), 1500);
		}
	});
})();
