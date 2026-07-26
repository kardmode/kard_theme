frappe.provide('frappe.desktop');

$(window).on('hashchange', function () {
	// Reserved for future use or debugging
});

$(document).ajaxComplete(function () {
	// Reserved for future use or debugging
});

$(document).ready(function () {
	const targetElement = document.body;
	// Observe attribute changes for route change
	const observer = new MutationObserver(function (mutationsList) {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'data-route') {
				frappe.desktop.refresh();
			}
		}
	});

	observer.observe(targetElement, { attributes: true });
	frappe.desktop.refresh();
});



$.extend(frappe.desktop, {
	refresh: function () {
		const is_logged_in = frappe.session && frappe.session.user && frappe.session.user !== 'Guest';

		if (!is_logged_in) {
			// If we are on the Desk (/app) but identified as Guest, the session has expired.
			if (window.location.pathname.includes('/app')) {
				window.location.href = '/#login';
			}
			return;
		}

		// Safe check for boot settings
		if (!frappe.boot || !frappe.boot.kard_settings || !frappe.boot.kard_settings.enable_theme) return;

		// Initialize UI elements (idempotent)
		frappe.desktop.clear_desktop_shortcuts();
		frappe.desktop.initializeGlobalSidebar();
		frappe.desktop.updateActiveMiniSidebar();
		frappe.desktop.update_frappe_sidebar_button();

		setTimeout(() => {
			if (!(frappe.session && frappe.session.user && frappe.session.user !== 'Guest')) return;
			if (!frappe.boot || !frappe.boot.kard_settings) return;

			const proceedWithRefresh = () => {
				frappe.desktop.get_workspace_data();
				frappe.desktop.check_workspace_btns();
				frappe.desktop.render_desktop_shortcuts();
				frappe.desktop.add_bookmark_link();
				frappe.desktop.updateActiveMiniSidebar();
			};

			// Prefetch bookmarks if enabled but missing or outdated
			if (frappe.boot.kard_settings.enable_bookmarks) {
				frappe.call({
					method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_theme_info",
					callback: function (response) {
						if (response.message && response.message[1]) {
							frappe.desktop.desktop_icons = response.message[1];
						}
						proceedWithRefresh();
					}
				});
			} else {
				proceedWithRefresh();
			}
		}, 500);
	},

	update_frappe_sidebar_button: function () {
		let wrapper = document.getElementById('page-Workspaces');
		if (wrapper) {
			let sidebar_toggle = $(wrapper).find(".sidebar-toggle-btn");
			if (sidebar_toggle)
				sidebar_toggle.hide();
		}
		if (frappe.workspace) {
			let ws = frappe.workspace;       // the Workspace instance
			let page = ws.page;              // this is the frappe.ui.Page object

			//page.add_inner_button(__("test Workspace"), () => {
			//	console.log("Workspace button clicked");
			//});		
		}


		// Hide default sidebar if mini sidebar is enabled and we are on a Workspace page
		if (frappe.boot.kard_settings.enable_new_global_sidebar) {
			document.body.classList.add('mini-sidebar-enabled');
		} else {
			document.body.classList.remove('mini-sidebar-enabled');
		}
	},

	initializeGlobalSidebar: function () {
		// Idempotent check
		if (document.getElementById('globalmenu') && document.getElementById('mini-sidebar')) {
			frappe.desktop.updateActiveMiniSidebar();
			return;
		}

		function addGlobalSidebarButton() {
			var existingSpan = document.getElementById('globalmenu');

			if (!existingSpan) {
				var navbarBrand = document.querySelector('.navbar-brand.navbar-home');

				var globalMenuSpan = document.createElement('span');
				globalMenuSpan.id = 'globalmenu';
				globalMenuSpan.classList.add('icon-lg', 'navbar-icon');
				if (frappe.boot.kard_settings.enable_new_global_sidebar === 1) {
					globalMenuSpan.classList.add('visible-sm', 'visible-xs');
				}

				navbarBrand.parentNode.insertBefore(globalMenuSpan, navbarBrand);

				globalMenuSpan.innerHTML = `
                    <svg class="icon icon-lg">
                        <use href="#icon-grid"></use>
                    </svg>
                 `;

				globalMenuSpan.addEventListener('click', function () {
					openSidebar();
				});
			}
		}

		function toggle_frappe_sidebar() {
			let wrapper = document.getElementById('page-Workspaces');
			let sidebar_wrapper = $(wrapper).find(".layout-side-section");

			if (frappe.utils.is_xs() || frappe.utils.is_sm()) {
				sidebar_wrapper.find(".close-sidebar").remove();
				let overlay_sidebar = sidebar_wrapper.find(".overlay-sidebar").addClass("opened");
				$('<div class="close-sidebar">').hide().appendTo(sidebar_wrapper).fadeIn(100, "linear");
				let scroll_container = $("html").css("overflow-y", "hidden");

				sidebar_wrapper.find(".close-sidebar").on("click", (e) => this.close_sidebar(e));
				sidebar_wrapper.on("click", "button:not(.dropdown-toggle)", (e) => this.close_sidebar(e));

				this.close_sidebar = () => {
					scroll_container.css("overflow-y", "");
					sidebar_wrapper.find("div.close-sidebar").fadeOut(100, "linear", () => {
						overlay_sidebar
							.removeClass("opened")
							.find(".dropdown-toggle")
							.removeClass("text-muted");
						sidebar_wrapper.find("div.close-sidebar").remove();

					});
				};


			} else {
				sidebar_wrapper.toggle();
			}
			$(document.body).trigger("toggleSidebar");
		}

		function openSidebar() {
			let route = frappe.get_route();
			if (!route) {
				return;
			}

			if (route[0] == "Workspaces" && frappe.boot.kard_settings.enable_new_global_sidebar !== 1) {
				toggle_frappe_sidebar();
				return;
			}

			let sidebar = document.getElementById('global-sidebar');
			let overlay = document.querySelector('.workspace-overlay');

			if (!sidebar) {
				sidebar = document.createElement('div');
				sidebar.id = 'global-sidebar';

				const sidebarContent = document.createElement('div');
				sidebarContent.id = 'content';
				sidebar.appendChild(sidebarContent);
				document.body.insertBefore(sidebar, document.querySelector('.main-section'));
			}

			const sidebarContent = sidebar.querySelector('#content');
			sidebarContent.className = 'sidebar-grid-content';

			const refreshSidebarContent = () => {
				sidebarContent.innerHTML = ''; // Clear

				// 1. Render Desktop Icons (Bookmarks) if enabled
				if (frappe.boot.kard_settings.enable_bookmarks && frappe.desktop.desktop_icons) {
					let icons = frappe.desktop.desktop_icons;
					if (icons && icons.length > 0) {
						let bookmarkIcons = frappe.desktop.render_user_bookmark_icons(icons, __("Bookmarks"));

						sidebarContent.appendChild(bookmarkIcons);
						frappe.desktop.setup_user_bookmark_click($(bookmarkIcons));

						// Add a divider after bookmarks
						let divider = document.createElement('div');
						divider.className = 'sidebar-divider';
						sidebarContent.appendChild(divider);
					}
				}

				// 2. Render Workspace Icons Grid
				let workspaceIcons = frappe.desktop.render_workspace_icons(__("Workspaces"));
				sidebarContent.appendChild(workspaceIcons);
				frappe.desktop.setup_module_click($(workspaceIcons));
			};

			// Initial render from cache (refresh handles prefetching)
			refreshSidebarContent();


			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'workspace-overlay';
				document.body.appendChild(overlay);
			}
			// Animate in on the next frame
			requestAnimationFrame(() => {
				sidebar.classList.add('opened');
				overlay.classList.add('opened');
			});
		}

		function closeSidebar() {
			let sidebar = document.getElementById('global-sidebar');
			let overlay = document.querySelector('.workspace-overlay');
			if (sidebar) {
				sidebar.classList.remove('opened');
			}
			if (overlay) {
				overlay.classList.remove('opened');
			}
		}

		function renderMiniSidebar() {
			let sidebar = document.getElementById('mini-sidebar');
			if (!sidebar) {
				sidebar = document.createElement('div');
				sidebar.id = 'mini-sidebar';
				document.body.insertBefore(sidebar, document.querySelector('.main-section'));
			}

			// Create shared tooltip element
			let tooltip = document.getElementById('mini-sidebar-tooltip');
			if (!tooltip) {
				tooltip = document.createElement('div');
				tooltip.id = 'mini-sidebar-tooltip';
				document.body.appendChild(tooltip);
			}

			sidebar.innerHTML = '';

			// Add Global Sidebar Button
			let globalBtn = document.createElement('div');
			globalBtn.className = 'mini-sidebar-item';
			globalBtn.setAttribute('data-label', 'Open Sidebar');
			globalBtn.onclick = function () {
				openSidebar();
			};
			// Tooltip events for global button
			globalBtn.addEventListener('mouseenter', function (e) {
				let rect = this.getBoundingClientRect();
				tooltip.innerText = this.getAttribute('data-label');
				tooltip.style.left = (rect.right + 10) + 'px';
				tooltip.style.top = (rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2) - 10) + 'px';
				tooltip.style.display = 'block';
				if (tooltip.offsetHeight === 0) {
					requestAnimationFrame(() => {
						tooltip.style.top = (rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)) + 'px';
					});
				}
			});
			globalBtn.addEventListener('mouseleave', function () {
				tooltip.style.display = 'none';
			});

			globalBtn.innerHTML = `
                    <svg class="icon icon-lg">
                        <use href="#icon-grid"></use>
                    </svg>
                 `;
			sidebar.appendChild(globalBtn);

			let entries = frappe.boot.allowed_workspaces;

			for (var key in entries) {
				if (entries.hasOwnProperty(key)) {
					if (entries[key].is_hidden != 1) {
						let item = entries[key];
						let name = item.name.replace(/\s+/g, '-').toLowerCase();
						let icon = item.icon || 'folder-normal';
						let iconVariable = 'icon-' + icon;

						let anchor = document.createElement('a');
						anchor.className = 'mini-sidebar-item';
						anchor.href = '/app/' + name;
						anchor.setAttribute('data-label', item.title);
						anchor.setAttribute('data-workspace', item.name);
						anchor.setAttribute('data-workspace-route', name);

						let route = frappe.get_route();
						let activeWorkspace = (route && route[0] === "Workspaces" && route[1]) ? route[1] : "";
						if (activeWorkspace) {
							let currentWorkspace = activeWorkspace.toLowerCase();
							let currentWorkspaceRoute = activeWorkspace.replace(/\s+/g, '-').toLowerCase();
							if (item.name.toLowerCase() === currentWorkspace || name === currentWorkspaceRoute) {
								anchor.classList.add('active');
							}
						}

						anchor.addEventListener('mouseenter', function (e) {
							let rect = this.getBoundingClientRect();
							tooltip.innerText = this.getAttribute('data-label');
							tooltip.style.left = (rect.right + 10) + 'px';
							// Center vertically
							tooltip.style.top = (rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2) - 10) + 'px';
							tooltip.style.display = 'block';

							// Adjust top if we don't know offsetHeight yet (first show)
							if (tooltip.offsetHeight === 0) {
								// Wait for next frame/render 
								requestAnimationFrame(() => {
									tooltip.style.top = (rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)) + 'px';
								});
							}
						});

						anchor.addEventListener('mouseleave', function () {
							tooltip.style.display = 'none';
						});

						let iconHtml = `
							<svg class="icon icon-lg">
								<use href="#${iconVariable}"></use>
							</svg>
							<span class="mini-sidebar-label"">${item.title}</span>
							`;

						anchor.innerHTML = iconHtml;
						sidebar.appendChild(anchor);
					}
				}
			}
		}


		if (!frappe.boot.kard_settings.enable_theme)
			return;

		if (frappe.boot.kard_settings.enable_module_sidebar === 1) {
			if (frappe.boot.kard_settings.enable_new_global_sidebar == 1)
				renderMiniSidebar();

			addGlobalSidebarButton();
			// Event delegation for closing sidebar when any link is clicked
			document.body.addEventListener('click', function (event) {
				var sidebar = document.getElementById('global-sidebar');
				var overlay = document.querySelector('.workspace-overlay');
				if (sidebar && (event.target.closest('a') || event.target.closest('.kt-app-icon')) && event.target.closest('#global-sidebar')) {
					closeSidebar();
				}
				if (overlay && event.target.closest('.workspace-overlay')) {
					closeSidebar();
				}
			});

		}
	},

	updateActiveMiniSidebar: function () {
		let route = frappe.get_route();
		let activeWorkspace = (route && route[0] === "Workspaces" && route[1]) ? route[1] : "";

		let sidebar = document.getElementById('mini-sidebar');
		if (sidebar) {
			let items = sidebar.querySelectorAll('.mini-sidebar-item');
			items.forEach(item => {
				let workspaceName = item.getAttribute('data-workspace');
				let workspaceRoute = item.getAttribute('data-workspace-route');
				if (activeWorkspace && workspaceName && workspaceRoute) {
					let currentWorkspace = activeWorkspace.toLowerCase();
					let currentWorkspaceRoute = activeWorkspace.replace(/\s+/g, '-').toLowerCase();
					if (workspaceName.toLowerCase() === currentWorkspace || workspaceRoute === currentWorkspaceRoute) {
						item.classList.add('active');
					} else {
						item.classList.remove('active');
					}
				} else {
					item.classList.remove('active');
				}
			});
		}
	},

	get_workspace_data: function () {
		let route = frappe.get_route();
		if (!route) {
			return;
		}

		if (route[0] == "Workspaces" && route[1]) {
			if (!frappe.desktop.current_workspace || frappe.desktop.current_workspace != route[1]) {
				let workspace = frappe.desktop.current_workspace = route[1];
				let module = route[1];
				var matchingItem = frappe.boot.allowed_workspaces.find(item => item.name === route[1]);

				if (matchingItem) {
					let new_module = matchingItem.module;
					if (new_module) {
						module = new_module;
					}
				}
				``
				var docs = [];
				var reports = [];
				frappe.call({
					method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get",
					args: {
						module: module,
						workspace: workspace,
					},
					callback: function (response) {
						var data = response.message.data;
						data.every(m => {
							if (m.label != "Reports") {
								docs = docs.concat(m.items);
							}
							else if (m.label == "Reports") {
								reports = m.items;
							}

							return true;
						});

						// Custom sorting function
						docs.sort(function (a, b) {
							// Compare 'favorite' values (1 comes before 0)
							if (a.favorite > b.favorite) return -1;
							if (a.favorite < b.favorite) return 1;

							// If 'favorite' values are equal, compare 'label' values alphabetically
							return a.label.localeCompare(b.label);
						});

						// Custom sorting function
						reports.sort(function (a, b) {
							// Compare 'global_favorite' values (1 comes before 0)
							if (a["global_favorite"] > b["global_favorite"]) return -1;
							if (a["global_favorite"] < b["global_favorite"]) return 1;

							// Compare 'favorite' values (1 comes before 0)
							if (a.favorite > b.favorite) return -1;
							if (a.favorite < b.favorite) return 1;

							// If 'favorite' values are equal, compare 'label' values alphabetically
							return a.label.localeCompare(b.label);
						});
						frappe.desktop.reports = reports;
						frappe.desktop.docs = docs;
					},
					freeze: false,
					freeze_message: "Loading"
				});

			}
		}
	},

	check_workspace_btns: function () {
		let route = frappe.get_route();

		if (!route) {
			return;
		}

		if (frappe.boot.kard_settings.check_workspace_btns) {
			if (route[0] == "Workspaces") {
				let has_perm = frappe.model.can_write("Workspace");
				const createButton = document.querySelector('button[data-label="Create%20Workspace"]');
				const editButton = document.querySelector('button[data-label="Edit"]');
				if (has_perm) {
					if (createButton)
						createButton.classList.remove("hide");
					if (editButton)
						editButton.classList.remove("hide");
				}
				else {
					if (createButton)
						createButton.classList.add("hide");
					if (editButton)
						editButton.classList.add("hide");
				}
			}
		}

		if (frappe.boot.kard_settings.enable_bookmarks) {
			let addBoomkarksButton = document.querySelector('.bookmarks-button');
			if (addBoomkarksButton)
				addBoomkarksButton.classList.add("hide");

			if (route[0] == "Workspaces" && route[1]) {
				addBoomkarksButton = document.querySelector('.bookmarks-button');
				const customActionsDiv = document.querySelector('#page-Workspaces .custom-actions');
				if (!addBoomkarksButton) {
					addBoomkarksButton = document.createElement('button');
					addBoomkarksButton.innerHTML = `<svg class="icon icon-sm"><use href="#icon-add"></use></svg><span style="margin-left: 5px;" class="hidden-xs hidden-sm hidden-md">Add Bookmark</span>`;
					addBoomkarksButton.classList.add('btn', 'btn-default', 'bookmarks-button');


					// Check if custom-actions div exists before inserting new elements
					if (customActionsDiv) {
						customActionsDiv.parentNode.insertBefore(addBoomkarksButton, customActionsDiv);
					}
				}

				addBoomkarksButton.classList.remove("hide");
				addBoomkarksButton.onclick = function () {
					frappe.desktop.workspace_show_bookmark_dialog();
				};
			}

		}

		if (frappe.boot.kard_settings.enable_links_menus_in_workspace) {
			let exploreButton = document.querySelector('.explore-button');

			if (exploreButton)
				exploreButton.classList.add("hide");

			if (route[0] == "Workspaces" && route[1]) {
				const customActionsDiv = document.querySelector('#page-Workspaces .custom-actions');

				if (!exploreButton) {
					exploreButton = document.createElement('button');
					exploreButton.innerHTML = `<svg class="icon icon-sm"><use href="#icon-list"></use></svg><span style="margin-left: 5px;" class="hidden-xs hidden-sm hidden-md">Explore</span>`;
					exploreButton.classList.add('btn', 'btn-default', 'explore-button');

					if (customActionsDiv) {
						customActionsDiv.parentNode.insertBefore(exploreButton, customActionsDiv);
					}
				}

				exploreButton.classList.remove("hide");
				exploreButton.onclick = function () {
					frappe.desktop.initializeCombinedRightSidebar(route[1], frappe.desktop.docs, frappe.desktop.reports);
				};
			}
		}
	},

	initializeCombinedRightSidebar: function (title, docs, reports) {
		let sidebar = document.getElementById('workspace-sidebar');
		let overlay = document.querySelector('.workspace-overlay');

		if (!sidebar) {
			sidebar = document.createElement('div');
			sidebar.id = 'workspace-sidebar';
			document.body.appendChild(sidebar);
		}

		sidebar.className = 'combined';
		sidebar.innerHTML = `
			<div id="content">
				<input type="text" id="combinedSearchBox" placeholder="Explore ${title}...">
				<div class="sidebar-columns">
					<div class="sidebar-column">
						<h3 class="column-title">DocTypes</h3>
						<ul id="sidebarDocsList" class="sidebar-list"></ul>
					</div>
					<div class="sidebar-column">
						<h3 class="column-title">Reports</h3>
						<ul id="sidebarReportsList" class="sidebar-list"></ul>
					</div>
				</div>
			</div>
		`;

		const docsList = sidebar.querySelector('#sidebarDocsList');
		const reportsList = sidebar.querySelector('#sidebarReportsList');

		const renderItems = (items, targetUl) => {
			targetUl.innerHTML = '';
			items.forEach(entry => {
				const listItem = document.createElement('li');
				var aElement = document.createElement('a');
				aElement.href = '/app/' + frappe.desktop.get_route_for_menu_links(entry);
				let label = entry.label;
				aElement.title = label + ' ' + (entry.type || "");

				if (entry.type == "Dashboard")
					label = entry.label + " Dashboard";

				aElement.textContent = label;

				if (entry.global_favorite == 1) {
					let span = document.createElement('span');
					span.classList.add("octicon", "octicon-pin");
					aElement.appendChild(span);
				}
				if (entry.favorite == 1) {
					let span = document.createElement('span');
					span.classList.add("octicon", "octicon-heart");
					aElement.appendChild(span);
				}

				listItem.appendChild(aElement);
				targetUl.appendChild(listItem);
			});
		};

		renderItems(docs, docsList);
		renderItems(reports, reportsList);

		const searchBox = sidebar.querySelector('#combinedSearchBox');
		searchBox.addEventListener('input', () => {
			const searchText = searchBox.value.toLowerCase();
			const filteredDocs = docs.filter(entry => entry.label.toLowerCase().includes(searchText));
			const filteredReports = reports.filter(entry => entry.label.toLowerCase().includes(searchText));

			renderItems(filteredDocs, docsList);
			renderItems(filteredReports, reportsList);
		});


		if (!overlay) {
			overlay = document.createElement('div');
			overlay.className = 'workspace-overlay';
			document.body.appendChild(overlay);
		}

		function closeSidebar() {
			sidebar.classList.remove('opened');
			overlay.classList.remove('opened');
		}

		requestAnimationFrame(() => {
			sidebar.classList.add('opened');
			overlay.classList.add('opened');
		});

		const handleSidebarClick = (event) => {
			const clickedOnSearchBox = event.target.closest('#combinedSearchBox');
			const clickedOnLink = event.target.closest('a');
			const clickedOnOverlay = event.target.closest('.workspace-overlay');
			const clickedInsideSidebar = event.target.closest('#workspace-sidebar');

			if (clickedOnOverlay || (clickedInsideSidebar && clickedOnLink && !clickedOnSearchBox)) {
				closeSidebar();
				document.body.removeEventListener('click', handleSidebarClick);
			}
		};

		// Delay adding the listener to avoid capturing the initial 'Explore' button click
		setTimeout(() => {
			document.body.addEventListener('click', handleSidebarClick);
		}, 0);
	},

	get_route_for_menu_links: function (m) {
		let type = (m.type).toLowerCase();
		if (m.url) {
			m.route = strip(m.url, "#");
		}
		else if (type === "doctype") {
			m.route = m.name;
			m.route = m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if (type === "report") {
			let is_query_report = m.is_query_report;
			if (is_query_report === 1)
				m.route = "query-report/" + m.name;
			else {
				m.route = m.ref_doctype.replace(/\s+/g, '-').toLowerCase() + "/view/report/" + m.name;
			}
		}
		else if (type === "page") {
			m.route = m.name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if (type === "dashboard") {
			m.route = "dashboard-view/" + m.name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		return m.route;
	},

	get_route_for_desktop_shorcuts: function (m) {
		let type = (m.type).toLowerCase();
		if (m.standard === 1 || m.hidden === 1 || m.blocked === 1 || type === "module") { return; }
		if (!m.route) {
			if (m.url) {
				m.route = strip(m.url, "#");
			}
			else if (type === "doctype") {
				m.route = m.link_to;
				m.route = m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}
			else if (type === "report") {
				let is_query_report = m.is_query_report;
				if (is_query_report === 1)
					m.route = "query-report/" + m.link_to;
				else {
					m.route = m.ref_doctype.replace(/\s+/g, '-').toLowerCase() + "/view/report/" + m.link_to;
				}
			}
			else if (type === "page") {
				m.route = m.link_to;
				m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}
			else if (type === "dashboard") {
				m.route = "dashboard-view/" + m.link_to;
				m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}
		}
		return m.route;
	},

	clear_desktop_shortcuts: function () {
		let wrapper = document.getElementById('page-Workspaces');
		if (wrapper) {
			let container_wrapper = wrapper.querySelector('.layout-main-section');
			if (container_wrapper)
				frappe.desktop.container_wrapper = container_wrapper;
			else
				return;
		}
		else
			return;

		let shorcuts_div = document.getElementById('shorcuts');
		if (shorcuts_div) {
			shorcuts_div.innerHTML = '';
		}
		else {
			shorcuts_div = document.createElement('div');
			shorcuts_div.setAttribute("id", "shorcuts");
			frappe.desktop.container_wrapper.prepend(shorcuts_div);
		}
	},

	render_desktop_shortcuts: function () {
		frappe.desktop.sort_inst = [];

		//if (!(!frappe.desktop.current_workspace || frappe.desktop.current_workspace == "Home"))
		if (!frappe.desktop.current_workspace)
			return;

		if (!frappe.desktop.desktop_icons)
			return;

		let shorcuts_div = document.getElementById('shorcuts');
		if (!shorcuts_div)
			return;

		let settings = frappe.boot.kard_settings;

		if (settings.enable_bookmarks) {
			let desktop_icons_id = frappe.desktop.render_user_bookmark_icons(frappe.desktop.desktop_icons);
			shorcuts_div.appendChild(desktop_icons_id);
			frappe.desktop.setup_user_bookmark_click($(desktop_icons_id));
			frappe.desktop.setup_wiggle($(desktop_icons_id));

			if (settings.enable_bookmark_sorting) {
				let icon_grid = desktop_icons_id.querySelector(".icon-grid");
				if (icon_grid) {
					if (!frappe.desktop.sort_inst) frappe.desktop.sort_inst = [];
					frappe.desktop.sort_inst.push(frappe.desktop.make_sortable(icon_grid));
				}
			}
		}

		if (settings.enable_module_header) {
			let newNode = frappe.desktop.render_workspace_icons("Workspaces");
			shorcuts_div.appendChild(newNode);
			frappe.desktop.setup_module_click($(newNode));
		}

		let div_clearfix = document.createElement('div');
		div_clearfix.setAttribute("class", "clearfix");
		shorcuts_div.appendChild(div_clearfix);

		frappe.desktop.sortableDisable();
	},

	render_user_bookmark_icons: function (modules, title) {
		if (!Array.isArray(modules)) return document.createElement('div');

		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");

		if (title) {
			let title_div = document.createElement('div');
			title_div.className = "sidebar-section-title";
			title_div.innerHTML = title;
			desktop_icons_id.appendChild(title_div);
		}

		modules.sort((a, b) => ((a.idx || 0) > (b.idx || 0)) ? 1 : -1)

		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");

		var addedIcons = false;
		modules.forEach(m => {
			if (!m) return;
			m.route = frappe.desktop.get_route_for_desktop_shorcuts(m);

			let color = m.color;
			let color_style = color ? `style="background-color:${color}"` : "";
			let icon = m.icon || 'folder-normal';

			let label = m.label || "";

			let label_wrapper = '<div class="kt-case-wrapper" title="' + label + ' ' + (m.type || "") + '" data-id="' + m.name + '" data-name="' + m.link_to + '" data-link="' + m.route + '">'
				+ '<div class="kt-app-icon" ' + color_style + '>'
				+ `<svg class="icon icon-lg"><use class="" href="#icon-` + icon + `"></use></svg>`
				+ '<div class="circle module-notis hide" data-doctype="' + m.link_to + '"><span class="circle-text"></span></div>'
				+ '<div class="circle module-remove hide"><div class="circle-text"><b>&times</b></div></div>'
				+ '</div>'
				+ '<div class="kt-case-label ellipsis">'
				+ '<span class="kt-case-label-text">' + label + '</span>'
				+ '</div>'
				+ '</div>';

			icon_grid.innerHTML = icon_grid.innerHTML + label_wrapper;
			addedIcons = true;
		})

		if (addedIcons === true)
			desktop_icons_id.appendChild(icon_grid);

		return desktop_icons_id;
	},

	render_workspace_icons: function (title) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");
		let title_div = document.createElement('div');
		title_div.className = "sidebar-section-title";
		title_div.innerHTML = title;
		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");

		let entries = frappe.boot.allowed_workspaces;

		var addedIcons = false;

		// Loop through the dictionary and create <li> elements
		for (var key in entries) {
			if (entries.hasOwnProperty(key)) {
				let m = entries[key];
				if (m && m.is_hidden !== 1) {
					let type = String(m.type || "").toLowerCase();
					let name = String(m.name || "").replace(/\s+/g, '-').toLowerCase();
					let iconVariable = 'icon-' + (m.icon || 'folder-normal');
					m.route = '/app/' + name;
					let color = m.kard_theme_color || m.color;
					let color_style = color ? `style="background-color:${color}"` : "";
					let icon = m.icon || 'folder-normal';
					let label = m.title;

					let label_wrapper = '<div class="kt-case-wrapper" title="' + label + '" data-name="' + name + '" data-link="' + m.route + '">'
						+ '<div class="kt-app-icon" ' + color_style + '>'
						+ `<svg class="icon icon-lg"><use class="" href="#icon-` + icon + `"></use></svg>`
						+ '<div class="circle module-notis hide" data-doctype="' + name + '"><span class="circle-text"></span></div>'
						+ '<div class="circle module-remove hide"><div class="circle-text"><b>&times</b></div></div>'
						+ '</div>'
						+ '<div class="kt-case-label ellipsis">'
						+ '<span class="kt-case-label-text">' + label + '</span>'
						+ '</div>'
						+ '</div>';

					icon_grid.innerHTML = icon_grid.innerHTML + label_wrapper;
					addedIcons = true;
				}
			}
		}


		if (addedIcons === false) {
			// let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			// msg.innerHTML = "No Bookmarks Added";

			// desktop_icons_id.appendChild(msg);
		}
		else {
			desktop_icons_id.appendChild(title_div);
			desktop_icons_id.appendChild(icon_grid);
		}

		return desktop_icons_id;
	},

	setup_user_bookmark_click: function (wrapper) {
		frappe.desktop.wiggling = false;

		wrapper.on("click", ".kt-app-icon, .kt-app-icon-svg", function () {
			if (!frappe.desktop.wiggling) {
				frappe.desktop.open_user_bookmark($(this).parent());
			}
		});

		wrapper.on("click", ".circle .module-notis", function () {
			var doctype = $(this).attr('data-doctype');
			if (doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

	},

	setup_module_click: function (wrapper) {
		frappe.desktop.wiggling = false;

		wrapper.on("click", ".kt-app-icon, .kt-app-icon-svg", function () {
			if (!frappe.desktop.wiggling) {

				frappe.desktop.open_module($(this).parent());
			}
		});

		wrapper.on("click", ".circle .module-notis", function () {
			var doctype = $(this).attr('data-doctype');
			if (doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

	},

	setup_wiggle: function (wrapper) {
		const DURATION_LONG_PRESS = 1000;
		let timer_id = 0;

		frappe.desktop.clearWiggle = () => {
			const $icons = wrapper.find('.kt-app-icon');
			const $notis = wrapper.find('.module-notis');
			const $closes = wrapper.find('.module-remove');

			$closes.addClass('hide');
			// Re-show notifications that have content
			$notis.each(function () {
				if ($(this).find('.circle-text').html()) {
					$(this).removeClass('hide');
				}
			});
			$icons.removeClass('wiggle');
			frappe.desktop.wiggling = false;
			frappe.desktop.sortableDisable();
		};

		wrapper.on('mousedown.wiggle touchstart.wiggle', '.kt-app-icon', function () {
			timer_id = setTimeout(() => {
				frappe.desktop.wiggling = true;
				frappe.desktop.sortableEnable();

				// Hide all active notifications
				wrapper.find('.module-notis').addClass('hide');

				// Show remove buttons and setup their clicks
				wrapper.find('.kt-case-wrapper').each((i, el) => {
					const $case = $(el);
					const $close = $case.find('.module-remove');
					$close.removeClass('hide').off('click').on('click', (e) => {
						e.stopPropagation();
						frappe.confirm(__(`Remove bookmark ${$case.attr('title')}?`), () => {
							frappe.call({
								method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.hide',
								args: { name: $case.attr('data-id') },
								callback: (r) => { if (r.message) location.reload(); }
							});
						});
					});
				});

				wrapper.find('.kt-app-icon').addClass('wiggle');
			}, DURATION_LONG_PRESS);
		});

		wrapper.on('mouseup.wiggle mouseleave.wiggle touchend.wiggle', '.kt-app-icon', () => {
			clearTimeout(timer_id);
		});

		// Stop wiggling if clicked on background
		$(document).off('click.wiggle').on('click.wiggle', (e) => {
			if (frappe.desktop.wiggling) {
				const $target = $(e.target);
				if (!$target.closest('.kt-case-wrapper').length && !$target.closest('.modal').length) {
					frappe.desktop.clearWiggle();
				}
			}
		});
	},

	open_user_bookmark: function (parent) {
		var link = parent.attr("data-link");
		if (link) {
			if (link.indexOf('javascript:') === 0) {
				eval(link.substr(11));
			} else if (link.substr(0, 1) === "/" || link.substr(0, 4) === "http") {
				window.open(link, "_blank");
			} else {
				frappe.set_route(link);
			}
			return false;
		}
	},

	open_module: function (parent) {
		if (frappe.boot.kard_settings.enable_links_by_module === 0) {
			var link = parent.attr("data-link");
			if (link) {
				if (link.indexOf('javascript:') === 0) {
					eval(link.substr(11));
				} else if (link.substr(0, 4) === "http") {
					window.open(link, "_blank");
				} else {
					frappe.set_route(link);
				}
				return false;
			}
		}
	},

	make_sortable: function (wrapper) {
		return new Sortable(wrapper, {
			animation: 150,
			delay: 1000,
			delayOnTouchOnly: false,
			onUpdate: function (event) {
				var new_order = [];

				const $cases = $(wrapper).find('.kt-case-wrapper');

				$cases.each(function (i, e) {
					new_order.push($(this).attr("data-id"));
				});

				frappe.call({
					method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.set_order',
					args: {
						'new_order': new_order,
						'user': frappe.session.user
					},
					quiet: true
				});
			},
			draggable: ".kt-case-wrapper",
		});
	},

	sortableEnable: function () {
		if (!frappe.desktop.sort_inst) return;
		for (var i = 0; i < frappe.desktop.sort_inst.length; i++) {
			frappe.desktop.sort_inst[i].options["disabled"] = false;
			frappe.desktop.sort_inst[i].options["delay"] = 0;
		}
	},

	sortableDisable: function () {
		if (!frappe.desktop.sort_inst) return;
		for (var i = 0; i < frappe.desktop.sort_inst.length; i++) {
			frappe.desktop.sort_inst[i].options["disabled"] = false;
			frappe.desktop.sort_inst[i].options["delay"] = 1000;
		}
	},

	add_bookmark_link: function () {
		if (!frappe.boot.kard_settings.enable_bookmarks)
			return;

		let route = frappe.get_route();
		let new_link = '';
		let pin_link = '';
		let args = { 'report': '' };

		// Find the div element with the specified classes and without display: none style
		const divElement = document.querySelector('div.content.page-container:not([style*="display: none"])');

		if (divElement) {
			// Find the ul element within the div element
			const ulElement = divElement.querySelector('ul.dropdown-menu.dropdown-menu-right');

			if (ulElement) {

				new_link = ulElement.querySelector('li#bookmark-btn');
				pin_link = ulElement.querySelector('li#pin-btn');
				if (new_link) {

				} else {
					new_link = document.createElement('li');
					// new_link.setAttribute('id','add-to-desktop');
					new_link.setAttribute('id', 'bookmark-btn');
					ulElement.appendChild(new_link);

					pin_link = document.createElement('li');
					// new_link.setAttribute('id','add-to-desktop');
					pin_link.setAttribute('id', 'pin-btn');
					ulElement.appendChild(pin_link);
				}


			}
			else {
				return;
			}
		}
		else {
			return;
		}

		new_link.innerHTML = '<a class="grey-link dropdown-item">' + __("Bookmark") + '</a>';
		new_link.classList.add('hide');
		$(new_link).unbind();

		pin_link.innerHTML = '<a class="grey-link dropdown-item">' + __("Pin") + '</a>';
		pin_link.classList.add('hide');
		$(pin_link).unbind();
		if (!route) {
			return;
		}
		else if (route[0] === 'List') {
			if (route.length > 3 && route[2] === 'Report') {
				args['type'] = 'Report';
				args['doc_view'] = 'Report Builder';
				args['label'] = route[3];
				args['report'] = route[3];
				args['doctype'] = route[1];
				args['link_to'] = route[3];
			}
			else {
				args['type'] = 'DocType';
				args['doc_view'] = 'List';
				args['label'] = route[1];
				args['doctype'] = route[1];
				args['link_to'] = route[1];
			}

		}
		else if (route[0] === 'Form') {
			args['type'] = 'DocType';
			args['doc_view'] = '';
			args['label'] = route[1];
			args['doctype'] = route[1];
			args['link_to'] = route[1];

			if (!frappe.model.is_single(route[1])) {
				return;
			}
		}
		else if (route[0] === 'Tree') {
			args['type'] = 'DocType';
			args['doc_view'] = 'Tree';
			args['label'] = route[1];
			args['doctype'] = route[1];
			args['link_to'] = route[1];
		}
		else if (route[0] === 'query-report') {
			args['type'] = 'Report';
			args['doc_view'] = '';
			args['label'] = route[1];
			args['report'] = route[1];
			args['link_to'] = route[1];
		}
		else if (route[0] === 'dashboard') {
			args['type'] = 'Dashboard';
			args['doc_view'] = 'Dashboard';
			args['label'] = route[1];
			args['link_to'] = route[1];
		}
		else {
			return;
		}

		new_link.classList.remove('hide');
		pin_link.classList.remove('hide');

		let titleAttributeValue = (document.querySelector(".title-area h3[title]")?.getAttribute("title") || "");
		// args['label'] = titleAttributeValue || args['label'];

		frappe.desktop.show_bookmark_dialog(new_link, args);
		frappe.desktop.show_pin_dialog(pin_link, args);
	},

	workspace_show_bookmark_dialog: function () {
		let msg = __('Add Bookmark');

		let fields = [
			{
				label: __('Type'),
				fieldname: 'type',
				fieldtype: 'Select',
				options: [
					{ 'value': 'DocType', 'description': __('DocType') },
					{ 'value': 'Report', 'description': __('Report') },
					{ 'value': 'Dashboard', 'description': __('Dashboard') },
					{ 'value': 'Page', 'description': __('Page') },
				],
				default: 'DocType'
			},
			{
				label: __('Link'),
				fieldname: 'item',
				fieldtype: 'Dynamic Link',
				options: 'type',
				reqd: 1
			},
			{
				label: __('View'),
				fieldname: 'doc_view',
				fieldtype: 'Select',
				options: [
					{ 'value': 'List', 'description': __('List') },
					{ 'value': 'Report Builder', 'description': __('Report Builder') },
					{ 'value': 'Dashboard', 'description': __('Dashboard') },
					{ 'value': 'Tree', 'description': __('Tree') },
					{ 'value': 'New', 'description': __('New') },
					{ 'value': 'Calendar', 'description': __('Calendar') },
					{ 'value': 'Kanban', 'description': __('Kanban') },
				],
				default: 'List'
			},
			{
				label: __('Label'),
				fieldname: 'label',
				fieldtype: 'Data'
			},
			{
				label: __('Icon'),
				fieldname: 'icon',
				fieldtype: 'Icon',
			},
			{
				label: __('Color'),
				fieldname: 'color',
				fieldtype: 'Color',
			},

		];

		const d = new frappe.ui.Dialog({
			title: msg,
			fields: fields,
			primary_action_label: __('Add'),
			primary_action: (values) => {
				let route = '';
				if (values.type === 'DocType') {
					let item = values.item.trim().replace(/\s+/g, '-').toLowerCase();
					route = item;
					switch (values.doc_view) {
					case 'List':
						break;
					case 'Report Builder':
						route = item + '/view/report';
						break;
					case 'Dashboard':
						route = item + '/view/dashboard';
						break;
					case 'Tree':
						route = item + '/view/tree';
						break;
					case 'New':
						route = item + '/new';
						break;
					case 'Calendar':
						route = item + '/view/calendar';
						break;
					case 'Kanban':
						route = item + '/view/kanban';
						break;
					}
				} else if (values.type === 'Report') {
					route = 'query-report/' + values.item;
				} else if (values.type === 'Dashboard') {
					route = 'dashboard/' + values.item;
				} else if (values.type === 'Page') {
					route = values.item;
				}

				let args = {
					'label': values.label || values.item,
					'color': values.color,
					'icon': values.icon,
					'type': values.type,
					'link_to': values.item,
					'doc_view': values.doc_view,
					'link': route,
					'url': route,
					'remove': 0
				};

				frappe.desktop.workspace_add_bookmark(args);
				d.hide();
			},

		});
		d.show();
	},

	workspace_add_bookmark: function (args) {
		if (!args['url'] || !args['link']) {
			args['url'] = args['link'] = frappe.get_route_str();
		}
		args['workspace'] = 'Home';
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.add_user_icon',
			args: {
				'args': args,
			},
			callback: function (r) {
				if (r.message) {
					frappe.show_alert(__("Updated"));
					location.reload();
				}
			}
		});
	},

	show_bookmark_dialog: function (new_link, args) {
		let msg = __('Bookmark') + ' ' + args['label'] + ' To Desktop?'
		$(new_link).on("click", function () {
			let fields = [
				{
					label: __('Label'),
					fieldname: 'label',
					fieldtype: 'Data'
				},
				{
					label: __('Icon'),
					fieldname: 'icon',
					fieldtype: 'Icon',
				},
				{
					label: __('Color'),
					fieldname: 'color',
					fieldtype: 'Color',
				},

			];

			const d = new frappe.ui.Dialog({
				title: msg,
				fields: fields,
				primary_action_label: __('Add'),
				primary_action: (values) => {
					args['label'] = values.label;
					args['color'] = values.color;
					args['icon'] = values.icon;
					args['remove'] = 0;
					frappe.desktop.add_bookmark(args);
					d.hide();
				},
				secondary_action_label: __('Remove'),
				secondary_action: (values) => {
					args['label'] = values.label;
					args['color'] = values.color;
					args['icon'] = values.icon;
					args['remove'] = 1;
					frappe.desktop.add_bookmark(args);
					d.hide();
				},
			});
			d.show();
		});
	},

	show_pin_dialog: function (new_link, args) {
		let msg = __('Pin') + ' ' + args['label'] + ' To Menu?';
		$(new_link).on("click", function () {
			let fields = [
				{
					label: __('Label'),
					fieldname: 'label',
					fieldtype: 'Data'
				},
				{
					label: __('Icon'),
					fieldname: 'icon',
					fieldtype: 'Icon',
				},
				{
					label: __('Color'),
					fieldname: 'color',
					fieldtype: 'Color',
				},

			];

			const d = new frappe.ui.Dialog({
				title: msg,
				fields: fields,
				primary_action_label: __('Add'),
				primary_action: (values) => {
					args['label'] = values.label;
					args['color'] = values.color;
					args['icon'] = values.icon;
					args['remove'] = 0;
					frappe.desktop.add_pin(args);
					d.hide();
				},
				secondary_action_label: __('Remove'),
				secondary_action: (values) => {
					args['label'] = values.label;
					args['color'] = values.color;
					args['icon'] = values.icon;
					args['remove'] = 1;
					frappe.desktop.add_pin(args);
					d.hide();
				},
			});
			d.show();
		});

	},

	add_bookmark: function (args) {
		if (!args['url'] || !args['link']) {
			args['url'] = args['link'] = frappe.get_route_str();
		}
		args['workspace'] = 'Home';
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.add_user_icon',
			args: {
				'args': args,
			},
			callback: function (r) {
				if (r.message) {
					frappe.show_alert(__("Updated"));
				}
			}
		});
	},

	add_pin: function (args) {
		if (!args['url'] || !args['link']) {
			args['url'] = args['link'] = frappe.get_route_str();
		}
		args['workspace'] = 'Home';
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_pinned_entry.kard_pinned_entry.pin_user_icon',
			args: {
				'args': args,
			},
			callback: function (r) {
				if (r.message) {
					frappe.show_alert(__("Updated"));
				}
			}
		});
	},
});