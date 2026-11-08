// Start menu panel.
//
// Empty query:
//   left:  Bookmarks (Kard Desktop Icon tiles) · Workspaces · Recent
//   right: DocTypes | Reports tabs — Pinned entries (Kard Pinned Entry) on top, then A–Z
//          (DocTypes also holds settings, trees, pages and dashboards)
// Typing: a simple ranked list over apps + bookmarks + workspaces. Record
// search, sections and the awesomebar takeover come in later steps.
//
// Only active when frappe.kard_start.is_enabled() (site_config
// "kard_start_menu": 1, or localStorage.kard_start_menu = "1").

frappe.provide("frappe.kard_start");

(function () {
	const esc = (s) => frappe.utils.escape_html(s == null ? "" : String(s));
	const icon = (name, size) => frappe.utils.icon(name, size || "sm");

	const TYPE_INFO = {
		doctype: { tag: "", icon: "file" },
		single: { tag: __("Settings"), icon: "setting-gear" },
		tree: { tag: __("Tree"), icon: "organization" },
		report: { tag: __("Report"), icon: "chart" },
		page: { tag: __("Page"), icon: "tool" },
		workspace: { tag: __("Workspace"), icon: "folder-normal" },
		dashboard: { tag: __("Dashboard"), icon: "dashboard" },
		bookmark: { tag: __("Bookmark"), icon: "star" },
	};
	const RESULT_LIMIT = 40;
	// no hover on touch screens: rows keep their own ⋯ button there
	const TOUCH = !!(window.matchMedia && window.matchMedia("(hover: none)").matches);
	const ROW_HEIGHT = 34; // keep in sync with .ks-row min-height (used for off-screen size hints)
	let prefetched_pins = null;
	const PIN_METHOD = "kard_theme.kard_theme.doctype.kard_pinned_entry.kard_pinned_entry.pin_user_icon";

	// Let the browser handle new-tab clicks on real hrefs.
	const wants_new_tab = (e) => e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1);
	const route_url = (route) =>
		frappe.kard_start.item_url({ route: Array.isArray(route) ? route : [route] });

	function type_info(item) {
		if (item.type === "doctype" && item.is_single) return TYPE_INFO.single;
		return TYPE_INFO[item.type] || TYPE_INFO.doctype;
	}

	// ------------------------------------------------------------------ bookmarks (Kard Desktop Icon)

	function bookmark_route(m) {
		// same rules kard_theme uses for desktop shortcuts
		if (frappe.desktop && frappe.desktop.get_route_for_desktop_shorcuts) {
			return frappe.desktop.get_route_for_desktop_shorcuts(Object.assign({}, m));
		}
		return null;
	}

	function get_bookmarks(refresh) {
		const from_icons = (icons) =>
			(icons || [])
				.filter((m) => m && !cint(m.hidden) && !cint(m.blocked) && !cint(m.standard))
				.map((m) => ({
					key: `bookmark:${m.name}`,
					type: "bookmark",
					name: m.name,
					label: m.label || m.link_to,
					category: m.category || "Uncategorized",
					idx: cint(m.idx),
					color: m.color,
					icon: m.icon || "folder-normal",
					link: bookmark_route(m),
					link_to: m.link_to,
					// catalogue key of what it points at, to tell if an item is bookmarked
					target_key: pin_key({ type: m.type, link_to: m.link_to, doc_view: m.doc_view }),
				}))
				.filter((b) => b.link);

		if (!refresh && frappe.desktop && Array.isArray(frappe.desktop.desktop_icons)) {
			return Promise.resolve(from_icons(frappe.desktop.desktop_icons));
		}
		return frappe
			.xcall("kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_theme_info")
			.then((r) => {
				const icons = (r && r[1]) || [];
				frappe.provide("frappe.desktop");
				frappe.desktop.desktop_icons = icons;
				return from_icons(icons);
			})
			.catch(() => []);
	}

	function bookmark_href(b) {
		const link = b.link || "";
		return link.startsWith("http") ? link : frappe.desktop.app_url(link);
	}

	function open_bookmark(b) {
		const link = b.link || "";
		if (link.startsWith("http")) {
			window.open(link, "_blank", "noopener");
		} else {
			frappe.set_route(link.replace(/^\/?((app|desk)\/)?/, ""));
		}
	}

	// ------------------------------------------------------------------ pinned (Kard Pinned Entry)
	// Pinned entries float to the top of the DocTypes / Reports lists — the same entries kard_theme's
	// workspace "explore" menus sort to the top. Global ones are set by System Managers.

	function pin_key(entry) {
		const t = String(entry.type || "").toLowerCase();
		if (t === "doctype") return (entry.doc_view === "Tree" ? "tree:" : "doctype:") + entry.link_to;
		if (t === "report" || t === "page" || t === "dashboard") return `${t}:${entry.link_to}`;
		return null;
	}

	function pin_args(item) {
		switch (item.type) {
			case "tree":
				return { type: "DocType", link_to: item.name, doc_view: "Tree" };
			case "doctype":
				return { type: "DocType", link_to: item.name, doc_view: "List" };
			case "report":
				return { type: "Report", link_to: item.name, doc_view: item.report_type === "Report Builder" ? "Report Builder" : "" };
			case "page":
				return { type: "Page", link_to: item.name, doc_view: "" };
			case "dashboard":
				return { type: "Dashboard", link_to: item.name, doc_view: "" };
		}
		return null;
	}

	function get_pins() {
		return frappe
			.xcall("kard_theme.api.get_pinned_entries")
			.then((rows) => {
				const map = new Map();
				(rows || []).forEach((r) => {
					const k = pin_key(r);
					// a user's own pin wins over a global one for the same item
					if (k && (!map.has(k) || !r.is_global)) map.set(k, r);
				});
				return map;
			})
			.catch(() => new Map());
	}

	// ------------------------------------------------------------------ workspaces

	function get_workspaces(catalogue) {
		// keep the sidebar order people already set (sequence in boot), private ones last
		const order = new Map((frappe.boot.allowed_workspaces || []).map((w, i) => [w.name, i]));
		return catalogue
			.filter((i) => i.type === "workspace")
			.sort((a, b) => (a.is_private - b.is_private) || ((order.get(a.name) ?? 999) - (order.get(b.name) ?? 999)));
	}

	// ------------------------------------------------------------------ recent

	function get_recent() {
		const current = (frappe.get_route() || []).join("/");
		const seen = new Set([current]);
		const out = [];
		const history = (frappe.route_history || []).slice().reverse();
		for (const route of history) {
			if (!Array.isArray(route) || !route.length) continue;
			const key = route.join("/");
			if (seen.has(key)) continue;
			seen.add(key);
			const entry = describe_route(route);
			if (entry) out.push(entry);
			if (out.length >= 8) break;
		}
		return out;
	}

	function describe_route(route) {
		const [r0, r1, r2] = route;
		if (r0 === "Form" && r1 && r2) {
			return r1 === r2
				? { label: __(r1), sub: __("Settings"), route, icon: "setting-gear" }
				: { label: r2, sub: __(r1), route, icon: "file" };
		}
		if (r0 === "List" && r1) return { label: __(r1), sub: __("List"), route, icon: "list" };
		if (r0 === "query-report" && r1) return { label: __(r1), sub: __("Report"), route, icon: "chart" };
		if (r0 === "Tree" && r1) return { label: __(r1), sub: __("Tree"), route, icon: "organization" };
		if (r0 === "Workspaces" && r1) return { label: __(r2 && r1 === "private" ? r2 : r1), sub: __("Workspace"), route, icon: "folder-normal" };
		if (r0 === "dashboard-view" && r1) return { label: __(r1), sub: __("Dashboard"), route, icon: "dashboard" };
		if (r0 && !r1 && r0 !== "Workspaces") return { label: __(frappe.utils.to_title_case(r0.replace(/-/g, " "))), sub: __("Page"), route, icon: "tool" };
		return null;
	}

	// ------------------------------------------------------------------ search
	//
	// Local results (doctypes, reports, workspaces, bookmarks) are instant. Records come
	// from frappe.utils.global_search.search — mrp overrides that with its ranked search,
	// so its ordering and doctype hints apply here without kard_theme knowing about mrp.

	const RECORDS_METHOD = "frappe.utils.global_search.search";
	const RECORD_LIMIT = 8;
	const APP_LIMIT = 8;
	const looks_like_id = (q) => /\d/.test(q); // "sinv 42", "SO-0001": records first
	const NEW_PREFIX = /^(new\s+|\+\s*)/i;

	// Search providers: other apps can tune search without kard_theme depending on them.
	//   (frappe.kard_start_providers = frappe.kard_start_providers || []).push({
	//     name,
	//     aliases(q)            -> names (DocType / Report / Page / Workspace) that q is a shortcut for
	//     filter_actions(a, ctx) -> the "New X" actions to show (ctx: {query, new_prefixed})
	//     live_records()        -> false to skip record search while typing
	//   })
	// Load order doesn't matter; providers are read on every search.
	const providers = () => frappe.kard_start_providers || [];

	function call_providers(method, fallback, ...args) {
		let out = fallback;
		providers().forEach((pr) => {
			if (typeof pr[method] !== "function") return;
			try {
				out = method === "filter_actions" ? pr[method](out, ...args) || [] : pr[method](...args);
			} catch (e) {
				console.warn(`kard_start provider ${pr.name || ""}.${method} failed`, e);
			}
		});
		return out;
	}

	function alias_targets(q) {
		const out = new Set();
		providers().forEach((pr) => {
			if (typeof pr.aliases !== "function") return;
			try {
				(pr.aliases(q) || []).forEach((t) => out.add(String(t).toLowerCase()));
			} catch (e) {
				console.warn(`kard_start provider ${pr.name || ""}.aliases failed`, e);
			}
		});
		return out;
	}

	const live_records = () =>
		providers().every((pr) => {
			try {
				return typeof pr.live_records !== "function" || pr.live_records() !== false;
			} catch (e) {
				return true;
			}
		});

	// Global search content is "Label : value ||| Label : value"; show the first couple of
	// fields that aren't just the ID / title again (same idea as mrp's awesomebar snippet).
	function record_snippet(r) {
		if (!r.content) return "";
		// skip the ID / title again, and repeats ("Customer : X ||| Customer Name : X")
		const seen = new Set([String(r.name || "").toLowerCase(), String(r.title || "").toLowerCase()]);
		return String(r.content)
			.split(" ||| ")
			.map((part) => part.trim())
			.filter((part) => {
				if (!part || part.startsWith("ID : ") || part.startsWith("Title : ")) return false;
				const value = part.includes(" : ") ? part.split(" : ").slice(1).join(" : ").trim().toLowerCase() : part.toLowerCase();
				if (!value || seen.has(value)) return false;
				seen.add(value);
				return true;
			})
			.slice(0, 2)
			.join(" · ")
			.slice(0, 110);
	}

	function score(label, name, q) {
		const l = label.toLowerCase();
		const n = (name || "").toLowerCase();
		if (l === q || n === q) return 100;
		if (l.startsWith(q) || n.startsWith(q)) return 80;
		if (l.split(/[\s\-_/()]+/).some((w) => w.startsWith(q))) return 60;
		// initials: "si" matches "Sales Invoice"
		const initials = l.split(/\s+/).map((w) => w[0]).join("");
		if (q.length >= 2 && initials.startsWith(q)) return 50;
		if (l.includes(q) || n.includes(q)) return 30;
		return 0;
	}

	function search_local(items, bookmarks, pins, query) {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		const aliased = alias_targets(q);
		const results = [];
		bookmarks.forEach((b) => {
			const s = score(b.label, b.link_to, q);
			if (s) results.push({ s: s + 15, kind: "bookmark", item: b });
		});
		items.forEach((it) => {
			// an alias ("gl", "si") is an exact shortcut: put its targets on top
			const alias_hit = aliased.has(String(it.name).toLowerCase()) || aliased.has(String(it.label).toLowerCase());
			let s = alias_hit ? 120 : score(it.label, it.name, q);
			if (!s) return;
			if (pins.has(it.key)) s += 10;
			if (it.type === "workspace") s += 5;
			if (it.type === "dashboard") s -= 5;
			results.push({ s, kind: "app", item: it });
		});
		results.sort((a, b) => b.s - a.s || a.item.label.localeCompare(b.item.label));
		return results.slice(0, RESULT_LIMIT);
	}

	function record_route(r) {
		return ["Form", r.doctype, r.name];
	}

	// ------------------------------------------------------------------ panel

	class StartPanel {
		constructor() {
			this.is_open = false;
			this.query = "";
			this.results = [];
			this.active = 0;
			this.tab = "home"; // phone: home (bookmarks) | list
			this.list_tab = "doctypes"; // doctypes | reports
			try {
				if (localStorage.getItem("kard_start_list_tab") === "reports") this.list_tab = "reports";
			} catch (e) {
				// storage unavailable: default tab
			}
			this.catalogue = [];
			this.bookmarks = [];
			this.pins = new Map();
			this.make();
		}

		make() {
			this.$backdrop = $(`<div class="kard-start-backdrop"></div>`).appendTo(document.body);
			this.$el = $(`
				<div class="kard-start" role="dialog" aria-modal="true" aria-label="${esc(__("Start"))}" hidden>
					<div class="ks-search">
						${icon("search", "sm")}
						<input type="search" class="ks-input" autocomplete="off" spellcheck="false"
							placeholder="${esc(__("Search doctypes, reports, workspaces…"))}"
							aria-label="${esc(__("Search"))}">
						<button class="ks-close" aria-label="${esc(__("Close"))}">${icon("close")}</button>
					</div>
					<div class="ks-tabs" role="tablist">
						<button class="ks-tab" data-tab="home" role="tab">${esc(__("Bookmarks"))}</button>
						<button class="ks-tab" data-tab="list" data-list="doctypes" role="tab">${esc(__("DocTypes"))}</button>
						<button class="ks-tab" data-tab="list" data-list="reports" role="tab">${esc(__("Reports"))}</button>
					</div>
					<div class="ks-body">
						<section class="ks-side">
							<div class="ks-section-title ks-bm-title">
								<span>${esc(__("Bookmarks"))}</span>
								<span class="ks-bm-tools">
									<button class="ks-link-btn ks-bm-newgroup" data-bm-newgroup>${esc(__("New group"))}</button>
									<button class="ks-link-btn" data-bm-edit>${esc(__("Edit"))}</button>
								</span>
							</div>
							<div class="ks-bookmarks"></div>
							<div class="ks-section-title ks-ws-title">${esc(__("Workspaces"))}</div>
							<div class="ks-workspaces"></div>
							<div class="ks-section-title ks-recent-title">${esc(__("Recent"))}</div>
							<div class="ks-recent"></div>
						</section>
						<section class="ks-apps">
							<div class="ks-list-tabs" role="tablist">
								<button class="ks-list-tab" data-list="doctypes" role="tab">${esc(__("DocTypes"))} <span class="ks-count"></span></button>
								<button class="ks-list-tab" data-list="reports" role="tab">${esc(__("Reports"))} <span class="ks-count"></span></button>
								<button class="ks-list-hide" data-action="toggle-lists" title="${esc(__("Hide lists"))}" aria-label="${esc(__("Hide lists"))}">${icon("sidebar-collapse", "sm")}</button>
							</div>
							<div class="ks-apps-list"></div>
						</section>
					</div>
					<div class="ks-results" role="listbox" hidden></div>
					<div class="ks-footer"></div>
				</div>
			`).appendTo(document.body);

			this.$input = this.$el.find(".ks-input");
			this.bind();
		}

		bind() {
			this.$backdrop.on("click", () => this.close());
			this.$el.on("click", ".ks-close", () => this.close());

			// Frappe routes every /app link click that reaches <body> (router.js), even ones we
			// handled or that should open a new window. The panel handles its own links.
			this.$el.on("click", "a", (e) => e.stopPropagation());

			this.$input.on("input", () => {
				this.query = this.$input.val() || "";
				this.active = 0;
				if (this.compact && !this.query.trim()) this.set_compact(false);
				this.render_results();
			});

			this.$el.on("keydown", (e) => this.on_keydown(e));

			this.$el.on("click", ".ks-tab, .ks-list-tab", (e) => {
				const btn = e.currentTarget;
				if (btn.dataset.tab) this.tab = btn.dataset.tab;
				if (btn.dataset.list && btn.dataset.list !== this.list_tab) {
					this.list_tab = btn.dataset.list;
					try {
						localStorage.setItem("kard_start_list_tab", this.list_tab);
					} catch (err) {
						// storage unavailable: tab just isn't remembered
					}
					this.render_apps();
					this.$el.find(".ks-apps").scrollTop(0);
				}
				this.sync_tabs();
			});

			this.$el.on("click", "[data-app-key]", (e) => {
				if (wants_new_tab(e)) return;
				e.preventDefault();
				const item = this.catalogue.find((i) => i.key === e.currentTarget.dataset.appKey);
				if (item) this.launch(() => frappe.kard_start.open_item(item));
			});

			this.$el.on("click", "[data-new-key]", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const item = this.catalogue.find((i) => i.key === e.currentTarget.dataset.newKey);
				if (item) this.launch(() => frappe.kard_start.open_item(item, true));
			});

			this.$el.on("click", "[data-pin-toggle]", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const item = this.catalogue.find((i) => i.key === e.currentTarget.dataset.pinToggle);
				if (item) this.toggle_pin(item);
			});

			this.$el.on("click", "[data-bookmark-key]", (e) => {
				const b = this.bookmarks.find((i) => i.key === e.currentTarget.dataset.bookmarkKey);
				if (this.editing) {
					e.preventDefault();
					if (b) this.edit_bookmark(b);
					return;
				}
				if (wants_new_tab(e)) return;
				e.preventDefault();
				if (b) this.launch(() => open_bookmark(b));
			});

			this.$el.on("click", "[data-bm-remove]", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const b = this.bookmarks.find((i) => i.key === e.currentTarget.dataset.bmRemove);
				if (b) this.remove_bookmark(b);
			});

			this.$el.on("click", "[data-bm-edit]", (e) => {
				e.preventDefault();
				this.set_editing(!this.editing);
			});

			this.$el.on("click", "[data-bm-newgroup]", (e) => {
				e.preventDefault();
				this.new_group();
			});

			// item menu: right-click (long-press on touch) or the ⋯ button
			this.$el.on("contextmenu", "[data-item-key], [data-bookmark-key]", (e) => {
				if (this.editing) return;
				e.preventDefault();
				this.show_menu(e.currentTarget, e.clientX, e.clientY);
			});
			this.$el.on("click", ".ks-more", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const row = e.currentTarget.closest("[data-item-key], [data-bookmark-key]");
				const r = e.currentTarget.getBoundingClientRect();
				if (row) this.show_menu(row, r.right, r.bottom);
			});
			this.$el.on("click", ".ks-menu [data-menu]", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const fn = this.menu_actions && this.menu_actions[e.currentTarget.dataset.menu];
				this.hide_menu();
				if (fn) fn();
			});
			this.$el.on("mousedown", (e) => {
				if (this.$menu && !e.target.closest(".ks-menu")) this.hide_menu();
			});
			this.$el.find(".ks-apps, .ks-side, .ks-results").on("scroll", () => this.hide_menu());

			this.$el.on("click", "[data-recent]", (e) => {
				if (wants_new_tab(e)) return;
				e.preventDefault();
				const route = JSON.parse(e.currentTarget.dataset.recent);
				this.launch(() => frappe.set_route(route));
			});

			this.$el.on("click", "[data-result]", (e) => {
				if (wants_new_tab(e)) return;
				e.preventDefault();
				this.active = cint(e.currentTarget.dataset.result);
				this.open_active(e);
			});

			if (!TOUCH) {
				this.$el.on("mouseover", ".ks-row[data-item-key]", (e) => this.attach_actions(e.currentTarget));
			}

			this.$el.on("mousemove", "[data-result]", (e) => {
				const i = cint(e.currentTarget.dataset.result);
				if (i !== this.active) {
					this.active = i;
					this.highlight();
				}
			});

			this.$el.on("click", "[data-action]", (e) => {
				e.preventDefault();
				const action = e.currentTarget.dataset.action;
				if (action === "options") {
					e.stopPropagation();
					return this.show_options_menu(e.currentTarget);
				}
				if (action === "toggle-lists") return set_pref("show_lists", !pref("show_lists"), { silent: true });
				this.close();
				if (action === "profile") frappe.set_route("Form", "User", frappe.session.user);
				if (action === "theme") new frappe.ui.ThemeSwitcher().show();
				if (action === "settings") frappe.set_route("Form", "Kard Theme Settings");
				if (action === "reload") frappe.ui.toolbar.clear_cache();
			});

			$(window).on("resize.kard_start", frappe.utils.debounce(() => this.is_open && this.position(), 100));
		}

		// --- open / close

		open(initial_query, opts) {
			opts = opts || {};
			if (this.is_open) {
				this.$input.trigger("focus");
				return;
			}
			this.is_open = true;
			this.last_focus = document.activeElement;
			this.query = initial_query || "";
			this.$input.val(this.query);
			this.active = 0;
			this.set_compact(!!opts.compact && !!this.query.trim(), true);

			this.position();
			this.apply_prefs();
			this.render_footer();
			this.render_recent();
			this.$el.prop("hidden", false);
			requestAnimationFrame(() => {
				this.$el.addClass("opened");
				this.$backdrop.addClass("opened");
			});
			document.body.classList.add("kard-start-open");
			// focus now, not on a timer: keys typed right after type-to-search must land here
			const input = this.$input[0];
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);

			// draw from the cached catalogue right away; pinned items fill in when they arrive
			Promise.all([frappe.kard_start.get_catalogue(), get_bookmarks()]).then(([catalogue, bookmarks]) => {
				if (catalogue !== this.catalogue) {
					this.catalogue = catalogue;
					this.render_apps();
					this.render_workspaces();
				}
				this.bookmarks = bookmarks;
				this.render_bookmarks();
				this.render_results();
			});
			if (!this.pins_loaded && !this.pins_pending) {
				this.pins_pending = true;
				(prefetched_pins || get_pins()).then((map) => {
					this.pins_pending = false;
					this.pins = map;
					this.pins_loaded = true;
					this.pins_version = (this.pins_version || 0) + 1;
					if (this.catalogue.length) this.render_apps();
					if (this.query) this.render_results(true);
				});
			}
		}

		close() {
			if (!this.is_open) return;
			this.closed_at = Date.now();
			this.hide_menu();
			if (this.editing) this.set_editing(false);
			this.is_open = false;
			this.$el.removeClass("opened");
			this.$backdrop.removeClass("opened");
			document.body.classList.remove("kard-start-open");
			setTimeout(() => {
				if (!this.is_open) this.$el.prop("hidden", true);
			}, 180);
			const f = this.last_focus;
			if (f && f !== document.body && document.contains(f) && f.focus) f.focus();
		}

		toggle() {
			this.is_open ? this.close() : this.open();
		}

		launch(fn) {
			this.close();
			fn();
		}

		position() {
			const el = this.$el[0];
			const navbar = document.querySelector(".navbar");
			const top = navbar ? Math.round(navbar.getBoundingClientRect().bottom) : 48;
			el.style.setProperty("--ks-top", top + "px");

			// compact: sit over the navbar search box, like its old dropdown
			const box = document.querySelector(".search-bar:not(.hidden)") || document.getElementById("navbar-search");
			const r = box && box.getBoundingClientRect();
			if (r && r.width) {
				const width = Math.min(Math.max(r.width + 24, 560), window.innerWidth - 32);
				const left = Math.max(16, Math.min(r.left - 12, window.innerWidth - width - 16));
				el.style.setProperty("--ks-c-left", left + "px");
				el.style.setProperty("--ks-c-top", Math.max(4, r.top - 8) + "px");
				el.style.setProperty("--ks-c-width", width + "px");
			} else {
				el.style.setProperty("--ks-c-left", "50%");
				el.style.setProperty("--ks-c-top", top + 8 + "px");
				el.style.setProperty("--ks-c-width", "min(600px, calc(100vw - 32px))");
			}
		}

		set_compact(on, silent) {
			this.compact = !!on;
			this.$el.toggleClass("compact", this.compact);
			this.$backdrop.toggleClass("compact", this.compact);
			if (!silent && this.is_open) {
				this.position();
				this.$input.trigger("focus");
			}
		}

		// --- pinning (Kard Pinned Entry, the user's own)

		toggle_pin(item) {
			const existing = this.pins.get(item.key);
			if (existing && existing.is_global) {
				frappe.show_alert({ message: __("{0} is pinned for everyone by a System Manager", [item.label]), indicator: "blue" });
				return;
			}
			const args = pin_args(item);
			if (!args) return;
			if (existing) args.doc_view = existing.doc_view; // must match the stored row to remove it
			args.label = item.label;
			args.remove = existing ? 1 : 0;
			if (this.pinning) return; // one change at a time
			this.pinning = true;
			this.$el.find(`[data-pin-toggle="${CSS.escape(item.key)}"]`).prop("disabled", true);
			frappe
				.xcall(PIN_METHOD, { args: JSON.stringify(args) })
				.then(() => get_pins())
				.then((map) => {
					this.pins = map;
					this.pins_version = (this.pins_version || 0) + 1;
					const scroll = this.$el.find(".ks-apps").scrollTop();
					this.render_apps();
					this.$el.find(".ks-apps").scrollTop(scroll);
					if (this.query) this.render_results();
				})
				.finally(() => {
					this.pinning = false;
					this.$el.find("[data-pin-toggle]").prop("disabled", false);
				});
		}

		// --- item menu (right-click / long-press / ⋯)

		item_for(el) {
			const key = el.dataset.itemKey;
			if (key) return { kind: "app", item: this.catalogue.find((i) => i.key === key) };
			const bkey = el.dataset.bookmarkKey;
			if (bkey) return { kind: "bookmark", item: this.bookmarks.find((i) => i.key === bkey) };
			return null;
		}

		bookmark_for(item) {
			return this.bookmarks.find((b) => b.target_key === item.key);
		}

		show_menu(el, x, y) {
			const target = this.item_for(el);
			if (!target || !target.item) return;
			const { kind, item } = target;
			const entries = [];
			const actions = {};
			const add = (id, label, fn) => {
				entries.push({ id, label });
				actions[id] = fn;
			};

			if (kind === "bookmark") {
				add("tab", __("Open in new tab"), () => window.open(bookmark_href(item), "_blank", "noopener"));
				add("edit", __("Edit bookmark…"), () => this.edit_bookmark(item));
				add("unbookmark", __("Remove from Bookmarks"), () => this.remove_bookmark(item));
			} else {
				add("tab", __("Open in new tab"), () => window.open(frappe.kard_start.item_url(item), "_blank", "noopener"));
				if (item.type === "doctype" && item.can_create) {
					add("new", __("New {0}", [item.label]), () => this.launch(() => frappe.kard_start.open_item(item, true)));
				}
				if (pin_args(item)) {
					const bm = this.bookmark_for(item);
					add(
						bm ? "unbookmark" : "bookmark",
						bm ? __("Remove from Bookmarks") : __("Add to Bookmarks"),
						() => (bm ? this.remove_bookmark(bm) : this.add_bookmark(item))
					);
					const pin = this.pins.get(item.key);
					if (!pin || !pin.is_global) {
						add("pin", pin ? __("Unpin from top of list") : __("Pin to top of list"), () => this.toggle_pin(item));
					}
				}
			}

			this.hide_menu();
			this.menu_actions = actions;
			this.$menu = $(`<div class="ks-menu" role="menu">
				${entries.map((m) => `<button role="menuitem" data-menu="${m.id}">${esc(m.label)}</button>`).join("")}
			</div>`).appendTo(this.$el);

			// keep it inside the panel
			const box = this.$el[0].getBoundingClientRect();
			const m = this.$menu[0].getBoundingClientRect();
			const left = Math.max(8, Math.min(x - box.left, box.width - m.width - 8));
			const top = Math.max(8, Math.min(y - box.top, box.height - m.height - 8));
			this.$menu.css({ left, top });
			this.$menu.find("button").first().trigger("focus");
		}

		hide_menu() {
			if (this.$menu) {
				this.$menu.remove();
				this.$menu = null;
				this.menu_actions = null;
			}
		}

		// --- bookmarks (Kard Desktop Icon, the user's own)

		reload_bookmarks() {
			return get_bookmarks(true).then((bookmarks) => {
				this.bookmarks = bookmarks;
				this.render_bookmarks();
			});
		}

		add_bookmark(item) {
			const args = pin_args(item);
			if (!args) return;
			const url = frappe.kard_start.item_url(item).replace(/^\/(app|desk)\//, "");
			frappe
				.xcall("kard_theme.api.add_bookmark", Object.assign({}, args, { label: item.label, url }))
				.then(() => this.reload_bookmarks())
				.then(() => frappe.show_alert({ message: __("Added {0} to Bookmarks", [item.label]), indicator: "green" }));
		}

		remove_bookmark(b) {
			frappe
				.xcall("kard_theme.api.remove_bookmark", { name: b.name })
				.then(() => this.reload_bookmarks())
				.then(() => frappe.show_alert({ message: __("Removed {0} from Bookmarks", [b.label]), indicator: "orange" }));
		}

		categories() {
			if (this._categories) return Promise.resolve(this._categories);
			return frappe
				.xcall("frappe.client.get_list", { doctype: "Kard Desktop Category", fields: ["name"], limit_page_length: 0, order_by: "name asc" })
				.then((rows) => (this._categories = (rows || []).map((r) => r.name)))
				.catch(() => []);
		}

		edit_bookmark(b) {
			this.categories().then((cats) => {
				const groups = Array.from(new Set([...this.bookmarks.map((x) => x.category), ...cats])).filter(
					(c) => c && c !== "Uncategorized"
				);
				const NEW = "__new__";
				const d = new frappe.ui.Dialog({
					title: __("Edit bookmark"),
					fields: [
						{ fieldname: "label", fieldtype: "Data", label: __("Label"), default: b.label, reqd: 1 },
						{
							fieldname: "category",
							fieldtype: "Select",
							label: __("Group"),
							options: [{ value: "", label: __("No group") }, ...groups.map((g) => ({ value: g, label: __(g) })), { value: NEW, label: __("New group…") }],
							default: b.category === "Uncategorized" ? "" : b.category,
						},
						{ fieldname: "new_category", fieldtype: "Data", label: __("New group name"), depends_on: `eval:doc.category=="${NEW}"` },
						{ fieldname: "icon", fieldtype: "Icon", label: __("Icon"), default: b.icon },
						{ fieldname: "color", fieldtype: "Color", label: __("Color"), default: b.color },
					],
					primary_action_label: __("Save"),
					primary_action: (v) => {
						const category = v.category === NEW ? (v.new_category || "").trim() : v.category;
						frappe
							.xcall("kard_theme.api.update_bookmark", { name: b.name, label: v.label, category, icon: v.icon, color: v.color || "" })
							.then(() => {
								this._categories = null;
								d.hide();
								return this.reload_bookmarks();
							});
					},
					secondary_action_label: __("Remove"),
					secondary_action: () => {
						d.hide();
						this.remove_bookmark(b);
					},
				});
				d.show();
			});
		}

		set_editing(on) {
			this.editing = !!on;
			this.hide_menu();
			this.$el.toggleClass("ks-editing", this.editing);
			this.$el.find("[data-bm-edit]").text(this.editing ? __("Done") : __("Edit"));
			this.extra_groups = [];
			this.render_bookmarks();
		}

		new_group() {
			frappe.prompt(
				{ fieldname: "name", fieldtype: "Data", label: __("Group name"), reqd: 1 },
				(v) => {
					const name = (v.name || "").trim();
					if (!name) return;
					this.extra_groups = (this.extra_groups || []).concat(name);
					this.render_bookmarks();
					frappe.show_alert(__("Drag bookmarks into {0}", [name]));
				},
				__("New group"),
				__("Add")
			);
		}

		save_layout() {
			const layout = [];
			this.$el.find(".ks-bookmarks .ks-tiles").each((i, grid) => {
				const category = grid.dataset.category || "";
				$(grid)
					.find("[data-bookmark-key]")
					.each((j, tile) => {
						const b = this.bookmarks.find((x) => x.key === tile.dataset.bookmarkKey);
						if (b) layout.push({ name: b.name, category });
					});
			});
			frappe.xcall("kard_theme.api.save_bookmark_layout", { layout: JSON.stringify(layout) }).then(() => this.reload_bookmarks());
		}

		// --- keyboard

		on_keydown(e) {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				if (this.$menu) {
					this.hide_menu();
				} else if (this.editing) {
					this.set_editing(false);
				} else if (this.query) {
					this.$input.val("").trigger("input");
				} else {
					this.close();
				}
				return;
			}
			if (e.key === "Tab" && this.compact) {
				e.preventDefault();
				this.set_compact(false);
				return;
			}
			if (!this.query) return;
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const n = this.results.length;
				if (!n) return;
				this.active = (this.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
				this.highlight(true);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (this.active === 0 && this.records_loading && looks_like_id(this.query.trim())) {
					// the best match for an ID is probably a record that hasn't arrived yet
					this.pending_enter = { ctrl: e.ctrlKey || e.metaKey };
					return;
				}
				this.open_active(e);
			}
		}

		open_active(e) {
			const r = this.results[this.active];
			if (!r) return;
			const new_doc = e && (e.ctrlKey || e.metaKey) && (e.type === "keydown" || e.synthetic);
			const q = this.query.trim();
			if (r.kind === "bookmark") {
				this.launch(() => open_bookmark(r.item));
			} else if (r.kind === "record") {
				this.launch(() => frappe.set_route(record_route(r.item)));
			} else if (r.kind === "action") {
				this.launch(() => frappe.kard_start.open_item(r.item, true));
			} else if (r.kind === "everywhere") {
				this.launch(() => frappe.searchdialog && frappe.searchdialog.search.init_search(q, "global_search"));
			} else {
				this.launch(() => frappe.kard_start.open_item(r.item, new_doc));
			}
		}

		// --- record search (debounced; replies for an older query are dropped)

		// Same pattern as mrp's live awesomebar results (200ms pause, limit 8, cache), plus at
		// most one request in flight: the full-text search can take seconds on big sites, so
		// while one runs, only the latest query waits its turn instead of stacking up.
		request_records(q) {
			this.records_cache = this.records_cache || new Map();
			if (q.length < 2 || NEW_PREFIX.test(q) || !live_records()) {
				this.records = { q, rows: [] };
				this.records_loading = false;
				return;
			}
			if (this.records && this.records.q === q) return;
			const cache_key = q.toLowerCase();
			if (this.records_cache.has(cache_key)) {
				this.records = { q, rows: this.records_cache.get(cache_key) };
				this.records_loading = false;
				return;
			}
			this.records_loading = true;
			clearTimeout(this.records_timer);
			this.records_timer = setTimeout(() => this.fetch_records(), 200);
		}

		fetch_records() {
			if (this.records_in_flight) return; // picked up when the current one returns
			const q = this.query.trim();
			const cache_key = q.toLowerCase();
			if (!this.is_open || q.length < 2 || this.records_cache.has(cache_key)) return;
			this.records_in_flight = true;
			// full-text search can take seconds on a cold database: say so instead of looking stuck
			this.records_slow = false;
			clearTimeout(this.records_slow_timer);
			this.records_slow_timer = setTimeout(() => {
				if (this.records_in_flight && this.is_open && this.query.trim() === q) {
					this.records_slow = true;
					this.render_results(true);
				}
			}, 2500);
			frappe
				.xcall(RECORDS_METHOD, { text: q, start: 0, limit: RECORD_LIMIT })
				.catch(() => null)
				.then((rows) => {
					this.records_in_flight = false;
					this.records_slow = false;
					clearTimeout(this.records_slow_timer);
					if (rows) {
						this.records_cache.set(cache_key, rows);
						if (this.records_cache.size > 40) this.records_cache.delete(this.records_cache.keys().next().value);
					}
					const now = this.query.trim();
					if (now !== q) {
						// typed on meanwhile: re-render for what's there now (uses the cache or fetches)
						this.records = null;
						this.render_results(true);
						return;
					}
					this.records = { q, rows: rows || [], failed: !rows };
					this.records_loading = false;
					this.render_results(true);
					if (this.pending_enter) {
						const pe = this.pending_enter;
						this.pending_enter = null;
						this.active = 0;
						this.open_active({ ctrlKey: pe.ctrl, synthetic: true });
					}
				});
		}

		// --- rendering

		// per-user options: show/hide the DocTypes & Reports lists, Search everywhere row
		apply_prefs() {
			const show_lists = pref("show_lists");
			this.$el.toggleClass("ks-no-lists", !show_lists);
			if (!show_lists && this.tab === "list") this.tab = "home";
			if (show_lists && this.lists_stale && this.catalogue.length) this.render_apps();
			this.sync_tabs();
			if (this.is_open) {
				this.render_footer();
				if (this.query) this.render_results(true);
			}
		}

		show_options_menu(anchor) {
			const entries = [];
			const actions = {};
			const add = (id, label, name) => {
				const on = pref(name);
				entries.push({ id, label, on });
				actions[id] = () => set_pref(name, !on);
			};
			if (type_to_search_allowed()) add("tts", __("Type anywhere to search"), "type_to_search");
			add("lists", __("Show DocTypes & Reports lists"), "show_lists");
			add("everywhere", __("Show \"Search everywhere\" in results"), "search_everywhere");

			this.hide_menu();
			this.menu_actions = actions;
			this.$menu = $(`<div class="ks-menu ks-options" role="menu" aria-label="${esc(__("Start menu options"))}">
				${entries
					.map(
						(m) => `<button role="menuitemcheckbox" aria-checked="${m.on ? "true" : "false"}" data-menu="${m.id}">
							<span class="ks-check">${m.on ? icon("tick", "xs") : ""}</span>${esc(m.label)}</button>`
					)
					.join("")}
			</div>`).appendTo(this.$el);
			const box = this.$el[0].getBoundingClientRect();
			const a = anchor.getBoundingClientRect();
			const m = this.$menu[0].getBoundingClientRect();
			this.$menu.css({
				left: Math.max(8, Math.min(a.right - box.left - m.width, box.width - m.width - 8)),
				top: Math.max(8, a.top - box.top - m.height - 6),
			});
			this.$menu.find("button").first().trigger("focus");
		}

		sync_tabs() {
			this.$el.attr("data-tab", this.tab).attr("data-list", this.list_tab);
			this.$el.find(".ks-list-tab").each((i, b) => {
				const on = b.dataset.list === this.list_tab;
				b.classList.toggle("active", on);
				b.setAttribute("aria-selected", on ? "true" : "false");
			});
			this.$el.find(".ks-tab").each((i, b) => {
				const on = b.dataset.tab === this.tab && (!b.dataset.list || b.dataset.list === this.list_tab);
				b.classList.toggle("active", on);
				b.setAttribute("aria-selected", on ? "true" : "false");
			});
		}

		render_apps() {
			if (!pref("show_lists")) {
				this.lists_stale = true; // built when they're shown again
				return;
			}
			this.lists_stale = false;
			// workspaces have their own section on the left; they stay searchable
			const is_report = (i) => i.type === "report";
			const all = this.catalogue.filter((i) => i.type !== "workspace");
			const counts = { doctypes: all.filter((i) => !is_report(i)).length, reports: all.filter(is_report).length };
			this.$el.find(".ks-list-tab").each((i, b) => {
				$(b).find(".ks-count").text(counts[b.dataset.list] || "");
			});
			const apps = all.filter((i) => (this.list_tab === "reports" ? is_report(i) : !is_report(i)));

			// One section per letter. `content-visibility: auto` (CSS) lets the browser skip
			// layout/paint for sections that are off-screen; the size hint keeps the scrollbar right.
			const section = (header, items, extra_class) =>
				`<div class="ks-sec ${extra_class || ""}" style="contain-intrinsic-size: auto ${items.length * ROW_HEIGHT + 28}px">
					${header}${items.map((item) => this.row_html(item, `data-app-key="${esc(item.key)}"`)).join("")}
				</div>`;

			let html = "";
			const pinned = apps.filter((i) => this.pins.has(i.key));
			if (pinned.length) {
				pinned.sort((a, b) => (this.pins.get(b.key).is_global - this.pins.get(a.key).is_global) || a.label.localeCompare(b.label));
				html += section(`<div class="ks-letter ks-letter-pinned">${icon("star", "xs")}<span>${esc(__("Pinned"))}</span></div>`, pinned, "ks-sec-pinned");
			}

			const by_letter = new Map();
			apps.forEach((item) => {
				const first = (item.label[0] || "#").toUpperCase();
				const L = /[A-Z]/.test(first) ? first : "#";
				if (!by_letter.has(L)) by_letter.set(L, []);
				by_letter.get(L).push(item);
			});
			by_letter.forEach((items, L) => (html += section(`<div class="ks-letter">${esc(L)}</div>`, items)));

			this.$el.find(".ks-apps-list").html(html || `<div class="ks-empty">${esc(__("Nothing to show"))}</div>`);
		}

		// The + / ☆ / ⋯ buttons, built once per hovered (or keyboard-selected) row instead of
		// on all ~1,000 rows: that was most of the panel's DOM and its slow re-renders.
		actions_html(item) {
			let html = "";
			if (item.type === "doctype" && item.can_create) {
				html += `<button class="ks-new" data-new-key="${esc(item.key)}" title="${esc(__("New {0}", [item.label]))}" aria-label="${esc(__("New {0}", [item.label]))}">${icon("add", "xs")}</button>`;
			}
			if (pin_args(item)) {
				const pin = this.pins.get(item.key);
				const title = pin ? (pin.is_global ? __("Pinned for everyone") : __("Unpin")) : __("Pin to top of the list");
				html += `<button class="ks-star ${pin ? "on" : ""} ${pin && pin.is_global ? "global" : ""}"
					data-pin-toggle="${esc(item.key)}" title="${esc(title)}" aria-label="${esc(title)}"
					aria-pressed="${pin ? "true" : "false"}">${icon("star", "xs")}</button>`;
			}
			html += `<button class="ks-more" title="${esc(__("More"))}" aria-label="${esc(__("More options for {0}", [item.label]))}">${icon("dot-horizontal", "xs")}</button>`;
			return html;
		}

		attach_actions(row) {
			const key = row.dataset.itemKey;
			if (!key || TOUCH) return;
			if (!this.actions_el) {
				this.actions_el = document.createElement("span");
				this.actions_el.className = "ks-row-actions";
			}
			const el = this.actions_el;
			if (el.parentNode === row && el.dataset.key === key && el.dataset.pinsVersion === String(this.pins_version || 0)) return;
			const item = this.catalogue.find((i) => i.key === key);
			if (!item) return;
			el.dataset.key = key;
			el.dataset.pinsVersion = String(this.pins_version || 0);
			el.innerHTML = this.actions_html(item);
			row.appendChild(el);
		}

		row_html(item, attrs, extra_class) {
			const info = type_info(item);
			const icon_name = item.type === "workspace" && item.icon ? item.icon : info.icon;
			const tag = info.tag ? `<span class="ks-tag">${esc(info.tag)}</span>` : "";
			const module = item.module ? `<span class="ks-module">${esc(__(item.module))}</span>` : "";
			const pin = this.pins.get(item.key);
			const pin_mark = pin
				? `<span class="ks-pin-mark ${pin.is_global ? "global" : ""}" title="${esc(pin.is_global ? __("Pinned for everyone") : __("Pinned"))}">${icon("star", "xs")}</span>`
				: "";
			// touch screens can't hover, so they keep a ⋯ (menu has New / Pin / Bookmark)
			const more = TOUCH
				? `<button class="ks-more" title="${esc(__("More"))}" aria-label="${esc(__("More options for {0}", [item.label]))}">${icon("dot-horizontal", "xs")}</button>`
				: "";
			return `<a href="${esc(frappe.kard_start.item_url(item))}" class="ks-row ${extra_class || ""}" data-item-key="${esc(item.key)}" ${attrs}>
				<span class="ks-row-icon">${icon(icon_name)}</span>
				<span class="ks-row-label">${esc(item.label)}</span>
				${tag}${module}${pin_mark}${more}
			</a>`;
		}

		render_bookmarks() {
			const $b = this.$el.find(".ks-bookmarks");
			(this.sortables || []).forEach((s) => s.destroy());
			this.sortables = [];
			if (!this.bookmarks.length && !(this.extra_groups || []).length) {
				$b.html(`<div class="ks-empty">${esc(__("No bookmarks yet. Right-click any doctype or report (or use its ⋯ button) and choose Add to Bookmarks."))}</div>`);
				return;
			}
			const groups = {};
			const order = [];
			this.bookmarks
				.slice()
				.sort((a, b) => a.idx - b.idx)
				.forEach((b) => {
					if (!groups[b.category]) {
						groups[b.category] = [];
						order.push(b.category);
					}
					groups[b.category].push(b);
				});
			if (this.editing) {
				// empty groups to drag into: "No group" plus any just created
				if (!groups.Uncategorized) {
					groups.Uncategorized = [];
					order.push("Uncategorized");
				}
				(this.extra_groups || []).forEach((g) => {
					if (!groups[g]) {
						groups[g] = [];
						order.push(g);
					}
				});
			}
			const show_group_titles = this.editing || order.length > 1;
			const group_label = (g) => (g === "Uncategorized" ? __("No group") : __(g));
			$b.html(
				order
					.map(
						(g) => `
					${show_group_titles ? `<div class="ks-group">${esc(group_label(g))}</div>` : ""}
					<div class="ks-tiles" data-category="${esc(g === "Uncategorized" ? "" : g)}">
						${groups[g]
							.map(
								(b) => `
							<a href="${esc(bookmark_href(b))}" class="ks-tile" data-bookmark-key="${esc(b.key)}" title="${esc(this.editing ? __("Edit {0}", [b.label]) : b.label)}">
								<span class="ks-tile-icon" ${b.color ? `style="background-color:${esc(b.color)}"` : ""}>${icon(b.icon, "md")}</span>
								<span class="ks-tile-label">${esc(b.label)}</span>
								${this.editing ? `<button class="ks-tile-remove" data-bm-remove="${esc(b.key)}" title="${esc(__("Remove"))}" aria-label="${esc(__("Remove {0}", [b.label]))}">${icon("close", "xs")}</button>` : ""}
							</a>`
							)
							.join("")}
					</div>`
					)
					.join("")
			);

			if (this.editing && window.Sortable) {
				$b.find(".ks-tiles").each((i, grid) => {
					this.sortables.push(
						new Sortable(grid, {
							group: "ks-bookmarks",
							animation: 150,
							filter: ".ks-tile-remove",
							preventOnFilter: false,
							onEnd: () => this.save_layout(),
						})
					);
				});
			}
		}

		render_workspaces() {
			const ws = get_workspaces(this.catalogue);
			this.$el.find(".ks-ws-title").toggle(!!ws.length);
			this.$el.find(".ks-workspaces").html(
				ws
					.map(
						(w) => `<a href="${esc(frappe.kard_start.item_url(w))}" class="ks-chip" data-app-key="${esc(w.key)}" data-item-key="${esc(w.key)}" title="${esc(w.label)}">
							<span class="ks-row-icon">${icon(w.icon || "folder-normal")}</span>
							<span class="ks-chip-label">${esc(w.label)}</span>
							${w.is_private ? `<span class="ks-chip-private" title="${esc(__("Private"))}">${icon("lock", "xs")}</span>` : ""}
						</a>`
					)
					.join("")
			);
		}

		render_recent() {
			const recent = get_recent();
			this.$el.find(".ks-recent-title").toggle(!!recent.length);
			this.$el.find(".ks-recent").html(
				recent
					.map(
						(r) => `<a href="${esc(route_url(r.route))}" class="ks-row ks-recent-row" data-recent="${esc(JSON.stringify(r.route))}">
							<span class="ks-row-icon">${icon(r.icon)}</span>
							<span class="ks-row-label">${esc(r.label)}</span>
							<span class="ks-module">${esc(r.sub)}</span>
						</a>`
					)
					.join("")
			);
		}

		build_results(q) {
			const new_match = q.match(NEW_PREFIX);
			const app_q = new_match ? q.slice(new_match[0].length) : q;
			const local = app_q ? search_local(this.catalogue, this.bookmarks, this.pins, app_q) : [];

			// Actions: "New X" for the best-matching creatable doctypes
			const actions = call_providers(
				"filter_actions",
				local
					.filter((r) => r.kind === "app" && r.item.type === "doctype" && r.item.can_create && (new_match || r.s >= 60))
					.slice(0, new_match ? 5 : 2)
					.map((r) => ({ kind: "action", item: r.item, s: r.s })),
				{ query: q, new_prefixed: !!new_match }
			);

			const apps = new_match ? [] : local.slice(0, APP_LIMIT);
			const rec_state = this.records && this.records.q === q ? this.records.rows : null;
			const records = new_match ? [] : (rec_state || []).slice(0, RECORD_LIMIT).map((r) => ({ kind: "record", item: r }));
			const id_like = looks_like_id(q);

			// Best match
			let best = null;
			if (new_match) best = actions[0];
			else if (id_like && records.length) best = records[0];
			else if (apps.length && (apps[0].s >= 60 || !records.length)) best = apps[0];
			else best = records[0] || apps[0] || actions[0];
			const not_best = (r) => r !== best;

			const sections = [];
			if (best) sections.push({ title: __("Best match"), rows: [best] });
			const app_sec = { title: __("DocTypes & Reports"), rows: apps.filter(not_best) };
			const rec_sec = {
				title: __("Records"),
				rows: records.filter(not_best),
				loading: !new_match && q.length >= 2 && !rec_state && live_records(),
				failed: !!(rec_state && this.records.failed),
				// searched and found nothing: say so rather than dropping the section
				empty: !new_match && q.length >= 2 && live_records() && !!rec_state && !rec_state.length && !this.records.failed,
			};
			const act_sec = { title: __("Actions"), rows: actions.filter(not_best) };
			if (id_like) sections.push(rec_sec, app_sec, act_sec);
			else sections.push(app_sec, rec_sec, act_sec);
			if (pref("search_everywhere")) sections.push({ rows: [{ kind: "everywhere", item: { label: q } }] });
			return sections;
		}

		render_results(keep_active) {
			const q = this.query.trim();
			const searching = !!q;
			this.$el.toggleClass("searching", searching);
			this.$el.find(".ks-results").prop("hidden", !searching);
			if (!searching) {
				this.results = [];
				this.records_loading = false;
				this.pending_enter = null;
				return;
			}
			this.request_records(q);

			const prev = keep_active && this.results[this.active];
			const sections = this.build_results(q);
			this.results = [];
			let html = "";
			sections.forEach((sec) => {
				if (!sec.rows.length && !sec.loading && !sec.failed && !sec.empty) return;
				if (sec.title) html += `<div class="ks-res-section">${esc(sec.title)}</div>`;
				if (sec.empty) {
					html += `<div class="ks-res-loading">${esc(__("No records match \"{0}\"", [q]))}</div>`;
				}
				if (sec.failed) {
					html += `<div class="ks-res-loading">${esc(__("Record search didn't respond. Try again, or use Search everywhere."))}</div>`;
				}
				sec.rows.forEach((r) => {
					const i = this.results.push(r) - 1;
					html += this.result_html(r, `data-result="${i}" role="option" id="ks-result-${i}"`);
				});
				if (sec.loading && !sec.rows.length) {
					html += `<div class="ks-res-loading">${esc(
						this.records_slow
							? __("Still searching records… large searches can take a few seconds")
							: __("Searching records…")
					)}</div>`;
				}
			});
			this.$el.find(".ks-results").html(html || `<div class="ks-empty">${esc(__("Nothing matches \"{0}\"", [q]))}</div>`);

			// keep the highlight on the same row when records arrive, unless it was the top row
			if (prev && this.active > 0) {
				const same = this.results.findIndex((r) => r.kind === prev.kind && r.item === prev.item);
				this.active = same >= 0 ? same : 0;
			}
			if (this.active >= this.results.length) this.active = 0;
			this.highlight();
		}

		result_html(r, attrs) {
			if (r.kind === "bookmark") {
				return `<a href="${esc(bookmark_href(r.item))}" class="ks-row" ${attrs}>
					<span class="ks-row-icon">${icon(r.item.icon)}</span>
					<span class="ks-row-label">${esc(r.item.label)}</span>
					<span class="ks-tag">${esc(TYPE_INFO.bookmark.tag)}</span>
				</a>`;
			}
			if (r.kind === "record") {
				const d = r.item;
				const title = d.title && d.title !== d.name ? d.title : "";
				const snippet = record_snippet(d);
				return `<a href="${esc(route_url(record_route(d)))}" class="ks-row ks-record" ${attrs}>
					<span class="ks-row-icon">${icon("file")}</span>
					<span class="ks-row-text">
						<span class="ks-row-label">${esc(d.name)}${title ? `<span class="ks-record-title"> · ${esc(title)}</span>` : ""}</span>
						${snippet ? `<span class="ks-snippet">${esc(snippet)}</span>` : ""}
					</span>
					<span class="ks-module">${esc(__(d.doctype))}</span>
				</a>`;
			}
			if (r.kind === "action") {
				return `<a href="${esc(frappe.kard_start.item_url(r.item) + "/new")}" class="ks-row" ${attrs}>
					<span class="ks-row-icon">${icon("add")}</span>
					<span class="ks-row-label">${esc(__("New {0}", [r.item.label]))}</span>
				</a>`;
			}
			if (r.kind === "everywhere") {
				return `<a href="#" class="ks-row ks-everywhere" ${attrs}>
					<span class="ks-row-icon">${icon("search")}</span>
					<span class="ks-row-label">${esc(__("Search everywhere for \"{0}\"", [r.item.label]))}</span>
				</a>`;
			}
			return this.row_html(r.item, attrs);
		}

		highlight(scroll) {
			const $rows = this.$el.find(".ks-results [data-result]");
			$rows.removeClass("active").attr("aria-selected", "false");
			const $a = $rows.eq(this.active).addClass("active").attr("aria-selected", "true");
			if ($a[0]) this.attach_actions($a[0]);
			this.$input.attr("aria-activedescendant", $a.attr("id") || "");
			if (scroll && $a[0]) $a[0].scrollIntoView({ block: "nearest" });
		}

		render_footer() {
			const is_sm = (frappe.user_roles || []).includes("System Manager");
			this.$el.find(".ks-footer").html(`
				<a href="#" class="ks-user" data-action="profile">
					${frappe.avatar(frappe.session.user, "avatar-small")}
					<span class="ks-user-name">${esc(frappe.session.user_fullname || frappe.session.user)}</span>
				</a>
				<span class="ks-footer-actions">
					${(() => {
						const shown = pref("show_lists");
						const label = shown ? __("Hide DocTypes & Reports") : __("Show DocTypes & Reports");
						return `<button class="ks-icon-btn ks-lists-toggle ${shown ? "on" : ""}" data-action="toggle-lists"
							title="${esc(label)}" aria-label="${esc(label)}" aria-pressed="${shown ? "true" : "false"}">${icon(shown ? "sidebar-collapse" : "sidebar-expand")}</button>`;
					})()}
					<button class="ks-icon-btn" data-action="theme" title="${esc(__("Toggle theme"))}" aria-label="${esc(__("Toggle theme"))}"><svg class="icon icon-sm" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg></button>
					${is_sm ? `<button class="ks-icon-btn" data-action="settings" title="${esc(__("Kard Theme Settings"))}" aria-label="${esc(__("Kard Theme Settings"))}">${icon("setting-gear")}</button>` : ""}
					<button class="ks-icon-btn" data-action="options" title="${esc(__("Start menu options"))}" aria-label="${esc(__("Start menu options"))}" aria-haspopup="menu">${icon("dot-horizontal")}</button>
					<button class="ks-icon-btn" data-action="reload" title="${esc(__("Reload"))}" aria-label="${esc(__("Reload"))}">${icon("refresh")}</button>
				</span>
			`);
		}
	}

	// ------------------------------------------------------------------ wiring

	function panel() {
		if (!frappe.kard_start._panel) frappe.kard_start._panel = new StartPanel();
		return frappe.kard_start._panel;
	}

	// ------------------------------------------------------------------ settings (boot, from site_config + user default)

	const start_cfg = () => frappe.boot.kard_start || {};
	const flag = (v, dflt) => (v === undefined || v === null ? dflt : !!cint(v));
	const replace_awesomebar = () => flag(start_cfg().replace_awesomebar, true);
	const type_to_search_allowed = () => flag(start_cfg().type_to_search, true);
	// per-user options, from boot (user default, else site_config default, else on)
	const pref = (name) => flag((start_cfg().prefs || {})[name], true);
	const user_type_to_search = () => pref("type_to_search");

	const PREF_MESSAGES = {
		type_to_search: [__("Type anywhere to search is on"), __("Type anywhere to search is off")],
		show_lists: [__("DocTypes & Reports lists are shown"), __("DocTypes & Reports lists are hidden")],
		search_everywhere: [__("\"Search everywhere\" is shown in results"), __("\"Search everywhere\" is hidden")],
	};

	// Saving: the UI changes at once; the server only gets the final value, ~0.5s after the last
	// change and one request at a time (rapid toggles used to collide in the database).
	const pref_saves = {};

	function save_pref(name) {
		const st = pref_saves[name];
		if (st.in_flight) return; // saved again when the current request returns
		const value = pref(name) ? 1 : 0;
		if (value === st.saved) return;
		st.in_flight = true;
		frappe
			.call({ method: "kard_theme.api.set_start_pref", args: { pref: name, enabled: value }, freeze: false })
			.then(
				() => (st.saved = value),
				() => {}
			)
			.always(() => {
				st.in_flight = false;
				if ((pref(name) ? 1 : 0) !== st.saved) save_pref(name);
			});
	}

	function set_pref(name, on, opts) {
		const cfg = start_cfg();
		const st = (pref_saves[name] = pref_saves[name] || { saved: pref(name) ? 1 : 0 });
		frappe.boot.kard_start = Object.assign({}, cfg, { prefs: Object.assign({}, cfg.prefs || {}, { [name]: on ? 1 : 0 }) });
		clearTimeout(st.timer);
		st.timer = setTimeout(() => save_pref(name), 500);
		const msg = PREF_MESSAGES[name];
		if (msg && !(opts && opts.silent)) frappe.show_alert({ message: on ? msg[0] : msg[1], indicator: on ? "green" : "orange" });
		const p = frappe.kard_start._panel;
		if (p) p.apply_prefs();
	}

	// ------------------------------------------------------------------ navbar search box + Ctrl+G

	function take_over_navbar_search() {
		const input = document.getElementById("navbar-search");
		if (!input || input.dataset.kardStart) return;
		input.dataset.kardStart = "1";
		input.setAttribute("readonly", "readonly"); // typing happens in the panel
		input.setAttribute("aria-haspopup", "dialog");
		input.addEventListener("focus", () => {
			const p = panel();
			const text = input.value;
			input.value = "";
			input.blur();
			// focus can bounce back to the box right after the panel closes
			if (p.is_open || Date.now() - (p.closed_at || 0) < 300) return;
			p.open(text, { compact: !!text.trim() });
		});
	}

	// ------------------------------------------------------------------ type anywhere to search

	const NO_CAPTURE_INSIDE = [
		".modal",
		".datatable",
		".form-grid",
		".grid-row",
		".frappe-control",
		".ql-editor",
		".ace_editor",
		".CodeMirror",
		".dropdown-menu",
		".awesomplete",
		".kard-start",
		".popover",
	].join(",");

	function can_capture(e) {
		if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
		if (!e.key || e.key.length !== 1 || e.key === " " || e.key === "?") return false; // ? = shortcut help
		if (!type_to_search_allowed() || !user_type_to_search()) return false;
		const p = frappe.kard_start._panel;
		if (p && p.is_open) return false;
		if (document.querySelector(".modal.show, .dropdown-menu.show")) return false;
		const a = document.activeElement;
		if (a && a !== document.body && a !== document.documentElement) {
			if (a.isContentEditable || a.matches("input, textarea, select, [contenteditable]")) return false;
			if (a.closest(NO_CAPTURE_INSIDE)) return false;
		}
		const t = e.target;
		if (t && t.closest && t.closest(NO_CAPTURE_INSIDE + ",input,textarea,select,[contenteditable]")) return false;
		return true;
	}

	function on_type_anywhere(e) {
		if (!can_capture(e)) return;
		e.preventDefault();
		panel().open(e.key, { compact: true });
	}

	Object.assign(frappe.kard_start, {
		open: (q, opts) => panel().open(q, opts),
		close: () => frappe.kard_start._panel && frappe.kard_start._panel.close(),
		toggle: () => panel().toggle(),
	});

	function ensure_start_button() {
		// kard_theme's grid button (#globalmenu) becomes the Start button at all widths;
		// add our own if the theme's sidebar features are switched off.
		let btn = document.getElementById("globalmenu");
		if (btn) {
			btn.classList.remove("visible-sm", "visible-xs");
			btn.setAttribute("title", __("Start"));
			return;
		}
		if (document.getElementById("kard-start-btn")) return;
		const brand = document.querySelector(".navbar-brand.navbar-home");
		if (!brand) return;
		btn = document.createElement("span");
		btn.id = "kard-start-btn";
		btn.className = "icon-lg navbar-icon";
		btn.setAttribute("role", "button");
		btn.setAttribute("tabindex", "0");
		btn.setAttribute("title", __("Start"));
		btn.innerHTML = `<svg class="icon icon-lg"><use href="#icon-grid"></use></svg>`;
		btn.addEventListener("click", () => frappe.kard_start.toggle());
		btn.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				frappe.kard_start.toggle();
			}
		});
		brand.parentNode.insertBefore(btn, brand);
	}

	$(document).on("app_ready", () => {
		if (frappe.session.user === "Guest" || !frappe.kard_start.is_enabled()) return;

		document.body.classList.add("kard-start-enabled");
		// kard_theme.js builds its navbar button on load / route change
		setTimeout(ensure_start_button, 0);
		$(document).on("page-change", () => setTimeout(ensure_start_button, 0));

		const shortcut = ((frappe.boot.kard_start && frappe.boot.kard_start.shortcut) || "alt+q").toLowerCase();
		frappe.ui.keys.add_shortcut({
			shortcut: shortcut,
			action: () => frappe.kard_start.toggle(),
			description: __("Open Start menu"),
			ignore_inputs: true,
		});

		if (replace_awesomebar()) {
			take_over_navbar_search();
			$(document).on("page-change", take_over_navbar_search);
			// replaces Frappe's own Ctrl+G ("Open Awesomebar"), which focused the search box
			frappe.ui.keys.add_shortcut({
				shortcut: "ctrl+g",
				action: () => frappe.kard_start.toggle(),
				description: __("Search"),
				ignore_inputs: true,
			});
		}

		if (type_to_search_allowed()) {
			document.addEventListener("keydown", on_type_anywhere);
		}

		// pinned items for the lists, fetched in the background like the catalogue
		setTimeout(() => {
			if (!prefetched_pins) prefetched_pins = get_pins();
		}, 2000);
	});
})();
