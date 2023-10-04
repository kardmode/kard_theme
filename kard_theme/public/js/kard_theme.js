frappe.provide('frappe.desktop');

$(window).on('hashchange', function() {
	// console.log("kard theme hashchange");	
});
 
$(document).ready(function() {
	// console.log("kard theme ready");
	const targetElement = document.body;
	const observer = new MutationObserver(function(mutationsList, observer) {
		for (const mutation of mutationsList) {
		  if (mutation.type === 'attributes' && mutation.attributeName === 'data-route') {
            const newValue = targetElement.getAttribute('data-route');
			frappe.desktop.refresh();
		  }
		}
	});

	const config = {
	attributes: true // Observe attribute changes
	};

	observer.observe(targetElement, config);
	
	frappe.desktop.initializeGlobalSidebar();
	frappe.desktop.refresh();
});

$(document).ajaxComplete(function() {	
	// console.log("kard theme ajaxComplete");
	// var ajax_state = $('body').attr('data-ajax-state');
});

$.extend(frappe.desktop, {
	initializeGlobalSidebar: function() {
			if(!frappe.boot.kard_settings.enable_theme)
				return;		
			function addButton() {
				var existingSpan = document.getElementById('globalmenu');
				
				if (!existingSpan) {
					var navbarBrand = document.querySelector('.navbar-brand.navbar-home');

					var globalMenuSpan = document.createElement('span');
					globalMenuSpan.id = 'globalmenu';
					globalMenuSpan.classList.add('icon-lg', 'navbar-icon'); // Add your icon styling class
					navbarBrand.parentNode.insertBefore(globalMenuSpan, navbarBrand);

					var svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
					// svgIcon.setAttribute('class', 'icon icon-menu');
					svgIcon.setAttribute('viewBox', '0 0 24 24');
					
					var useElement = document.createElementNS("http://www.w3.org/2000/svg", "use");
					useElement.setAttribute('href', '#icon-menu');
					
					svgIcon.appendChild(useElement);
					globalMenuSpan.appendChild(svgIcon);

					globalMenuSpan.addEventListener('click', function() {
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
					$('<div class="close-sidebar">').hide().appendTo(sidebar_wrapper).fadeIn(100,"linear");
					let scroll_container = $("html").css("overflow-y", "hidden");

					sidebar_wrapper.find(".close-sidebar").on("click", (e) => this.close_sidebar(e));
					sidebar_wrapper.on("click", "button:not(.dropdown-toggle)", (e) => this.close_sidebar(e));

					this.close_sidebar = () => {
						scroll_container.css("overflow-y", "");
						sidebar_wrapper.find("div.close-sidebar").fadeOut(100,"linear",() => {
							overlay_sidebar
								.removeClass("opened")
								.find(".dropdown-toggle")
								.removeClass("text-muted");
						});
					};
					
					
				} else {
					sidebar_wrapper.toggle();
				}
				$(document.body).trigger("toggleSidebar");
				
				let sidebar_toggle = $(wrapper).find(".sidebar-toggle-btn");
				let sidebar_toggle_icon = sidebar_toggle.find(".sidebar-toggle-icon");
				let is_sidebar_visible = $(sidebar_wrapper).is(":visible");
				sidebar_toggle_icon.html(
					frappe.utils.icon(is_sidebar_visible ? "sidebar-collapse" : "sidebar-expand", "md")
				);
				
			}
			
			function openSidebar() {
				
				
				let route = frappe.get_route()
				if(!route){
					return;
				}

				if(route[0] == "Workspaces")
				{
					toggle_frappe_sidebar();
					return;
				}
					
				let entries = frappe.boot.allowed_workspaces;
				let sidebar = document.getElementById('global-sidebar');
				let overlay = document.querySelector('.workspace-overlay');
			  
				if (!sidebar) {
					  sidebar = document.createElement('div');
					  sidebar.id = 'global-sidebar';
					  
					  const sidebarContent = document.createElement('div');
					  sidebarContent.id = 'content';
					  sidebarContent.innerHTML = `
						<ul id="global-sidebarList"></ul>
					  `;

					  sidebar.appendChild(sidebarContent);
					  
					  document.body.insertBefore(sidebar, document.querySelector('.main-section'));

				  
				}

					
				const sidebarList = sidebar.querySelector('#global-sidebarList');
				sidebarList.innerHTML = ''; // Clear previous list items
				
					 // Loop through the dictionary and create <li> elements
				for (var key in entries) {
						if (entries.hasOwnProperty(key)) {
							if(entries[key].is_hidden != 1){
								let liElement = document.createElement('li');
								  // Create the <span> element
								let spanElement = document.createElement('span');
								spanElement.className = 'sidebar-item-icon'; // Add the class here
								
								let iconVariable = 'icon-' + (entries[key].icon || 'folder-normal'); // Replace with your actual variable
								
								// Set the inner HTML of the <span> element
								spanElement.innerHTML = `
									<svg class="icon icon-lg">
										<use class="" href="#${iconVariable}"></use>
									</svg>
								`;
		
								let name = entries[key].name.replace(/\s+/g, '-').toLowerCase();

		
								let aElement = document.createElement('a');
								aElement.href = '/app/' + name; // Generate href using the key
								
								// Append the <span> to the <a>
								aElement.appendChild(spanElement);
			
								spanElement = document.createElement('span');
								spanElement.className = 'sidebar-item-label'; // Add the class here
								spanElement.textContent = entries[key].title;

								aElement.appendChild(spanElement);
								liElement.appendChild(aElement);
								sidebarList.appendChild(liElement);
							}
							
						}
					}

						

				  sidebar.classList.toggle('opened');

				  if (!overlay) {
					overlay = document.createElement('div');
					overlay.className = 'workspace-overlay';
					document.body.appendChild(overlay);

					overlay.addEventListener('click', () => {
					  sidebar.classList.remove('opened');
					  overlay.style.display = 'none';
					});
				  }
				  
				  overlay.style.display = 'block';
			}
			
			function closeSidebar() {
				var sidebar = document.getElementById('global-sidebar');
				var overlay = document.querySelector('.workspace-overlay');
				if (sidebar) {
					sidebar.classList.remove('opened');
				}
				if (overlay) {
					 overlay.style.display = 'none';
				}
			}
			
			let settings = frappe.boot.kard_settings;
			if(settings.enable_module_sidebar)
			{
				addButton();
			
				 // Event delegation for closing sidebar when any link is clicked
				document.body.addEventListener('click', function(event) {
					var sidebar = document.getElementById('global-sidebar');
					var overlay = document.querySelector('.workspace-overlay');
					if (sidebar && event.target.closest('#global-sidebar')) {
						closeSidebar();
					}
					if (overlay && event.target.closest('.workspace-overlay')) {
						closeSidebar();
					}
				});
				
			}
			
			
		},	
	
	get_workspace_data: function() {

		let route = frappe.get_route()
		if(!route){
			return;
		}
		
		if(route[0] == "Workspaces" && route[1])
		{
			if (!frappe.desktop.current_workspace || frappe.desktop.current_workspace != route[1])
			{
				let workspace = frappe.desktop.current_workspace = route[1];
				let module = null;
				
				let matchingItem = frappe.boot.allowed_workspaces.find(item => item.name === route[1]);

				if (matchingItem) {
					module = matchingItem.module;
				}

				var docs = [];
				var reports = [];
				frappe.call({
					method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get",
					args: { 
						module: module,
						workspace: workspace,
					},
					callback: function(response) {
						var data = response.message.data;
						data.every(m => {
							if(m.label != "Reports")
							{
								docs = docs.concat(m.items);
							}
							else if(m.label == "Reports")
							{
								reports = m.items;
							}
							
							return true;
						});
						
						// Custom sorting function
						docs.sort(function(a, b) {
						  // Compare 'favorite' values (1 comes before 0)
						  if (a.favorite > b.favorite) return -1;
						  if (a.favorite < b.favorite) return 1;

						  // If 'favorite' values are equal, compare 'label' values alphabetically
						  return a.label.localeCompare(b.label);
						});
						
						// Custom sorting function
						reports.sort(function(a, b) {
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
		
	add_workspace_buttons: function() {
		// console.log("check to add buttons");
		let route = frappe.get_route()

		if(!route){
			return;
		}
		
		if (!frappe.boot.kard_settings.enable_links_menus_in_workspace)
		{
			return;
		}
		
		
		let docsButton = document.querySelector('.docs-button');
		let reportsButton = document.querySelector('.reports-button');
		
		if(docsButton)
			docsButton.classList.add("hide");
		
		if(reportsButton)
			reportsButton.classList.add("hide");
			
		if(route[0] == "Workspaces" && route[1])
		{
				// Check if the buttons have already been added
				docsButton = document.querySelector('.docs-button');
				reportsButton = document.querySelector('.reports-button');
				// Find the div with class custom-actions
				const customActionsDiv = document.querySelector('#page-Workspaces .custom-actions');

			   if (!docsButton) {
				  docsButton = document.createElement('button');
				  docsButton.textContent = 'Docs';
					docsButton.classList.add('btn', 'btn-default', 'docs-button');
				  
				  
				  // Check if custom-actions div exists before inserting new elements
				  if (customActionsDiv) {
					customActionsDiv.parentNode.insertBefore(docsButton, customActionsDiv);
				  }
				  
			   }
			   
			 
			   
				if (!reportsButton) {
					// Create Reports button
					reportsButton = document.createElement('button');
					reportsButton.textContent = 'Reports';
					reportsButton.classList.add('btn', 'btn-default', 'reports-button');
				  
				  
				  // Check if custom-actions div exists before inserting new elements
				  if (customActionsDiv) {
					customActionsDiv.parentNode.insertBefore(reportsButton, customActionsDiv);
				  }
				}
				
				docsButton.classList.remove("hide");
				reportsButton.classList.remove("hide");
			
				docsButton.onclick = function() {
					frappe.desktop.initializeSidebar(route[1] + ' Docs',frappe.desktop.docs);

				};
				reportsButton.onclick = function() {
					frappe.desktop.initializeSidebar(route[1] + ' Reports',frappe.desktop.reports);						

			  };


			
		}
	},
	
	initializeSidebar: function(title,items) {
		let entries = items; // Sample array of entries
		let sidebar = document.getElementById('workspace-sidebar');
		let overlay = document.querySelector('.workspace-overlay');
		  
		if (!sidebar) {
			  sidebar = document.createElement('div');
			  sidebar.id = 'workspace-sidebar';
			  
			  const sidebarContent = document.createElement('div');
			  sidebarContent.id = 'content';
			  sidebarContent.innerHTML = `
				<h2 id="sidebarHeading"></h2>
				<input type="text" id="searchBox" placeholder="Search">
				<ul id="sidebarList"></ul>
			  `;

			  sidebar.appendChild(sidebarContent);
			  document.body.appendChild(sidebar);
			}
			
		// If sidebar already exists, change the header content
		var h2Element = sidebar.querySelector('h2');
		if (h2Element) {
			h2Element.textContent = title;
		}

		const sidebarList = sidebar.querySelector('#sidebarList');
		sidebarList.innerHTML = ''; // Clear previous list items

		entries.forEach(entry => {
					const listItem = document.createElement('li');
					var aElement = document.createElement('a');
					aElement.href = '/app/' + frappe.desktop.get_route_for_menu_links(entry);
					let label = entry.label;
					aElement.title = label + ' ' + entry.type;
					//if (entry.type == "Dashboard")
						//label = entry.label + " Dashboard"; 
					aElement.textContent = label;
					if(entry.hasOwnProperty('global_favorite') && entry.global_favorite == 1)
					{
						let spanElement = document.createElement('span');
						spanElement.innerHTML = `
							<svg class="liked icon icon-md">
								<use style="fill:yellow" href="#icon-review"></use>
							</svg>
						`;
						aElement.appendChild(spanElement);

					}
					if(entry.hasOwnProperty('favorite') && entry.favorite == 1)
					{
						let spanElement = document.createElement('span');
						spanElement.innerHTML = `
							<svg class="liked icon icon-md">
								<use class="like-icon" href="#icon-heart"></use>
							</svg>
						`;
						aElement.appendChild(spanElement);

					}
					
					listItem.appendChild(aElement);
					sidebarList.appendChild(listItem);
				});
									
		const searchBox = sidebar.querySelector('#searchBox');
		searchBox.addEventListener('input', () => {
				const searchText = searchBox.value.toLowerCase();
				const filteredEntries = entries.filter(entry => entry.label.toLowerCase().includes(searchText));
				  
				sidebarList.innerHTML = ''; // Clear previous list items
				  
				filteredEntries.forEach(entry => {
					const listItem = document.createElement('li');
					var aElement = document.createElement('a');
					aElement.href = '/app/' + frappe.desktop.get_route_for_menu_links(entry);
					
					let label = entry.label;
					aElement.title = label + ' ' + entry.type;

					//if (entry.type == "Dashboard")
					//	label = entry.label + " Dashboard"; 
					aElement.textContent = label;

					listItem.appendChild(aElement);
					sidebarList.appendChild(listItem);
				});
			});

		sidebar.classList.toggle('opened');

		if (!overlay) {
			overlay = document.createElement('div');
			overlay.className = 'workspace-overlay';
			document.body.appendChild(overlay);

			/* overlay.addEventListener('click', () => {
			  sidebar.classList.remove('opened');
			  overlay.style.display = 'none';
			}); */
		  }
		  
		function closeSidebar() {
			var sidebar = document.getElementById('workspace-sidebar');
			var overlay = document.querySelector('.workspace-overlay');
			if (sidebar) {
				sidebar.classList.remove('opened');
			}
			if (overlay) {
				 overlay.style.display = 'none';
			}
		}
		  
		overlay.style.display = 'block';
		  
		   // Event delegation for closing sidebar when any link is clicked
		document.body.addEventListener('click', function(event) {
			var sidebar = document.getElementById('workspace-sidebar');
			var overlay = document.querySelector('.workspace-overlay');
			
			 // Check if the clicked element is the search box
			var clickedOnSearchBox = event.target.closest('#searchBox');

			// If the clicked element is not the search box, proceed with sidebar handling
			if (!clickedOnSearchBox) {
				if (sidebar && event.target.closest('#workspace-sidebar')) {
					closeSidebar();
				}
				if (overlay && event.target.closest('.workspace-overlay')) {
					closeSidebar();
				}
			}
			
			
			
		});
		
	},
	
	get_route_for_menu_links: function(m) {
		let type = (m.type).toLowerCase();
		if(m.url) {
			m.route=strip(m.url, "#");
		}
		else if(type==="doctype") {
			m.route = m.name;
			m.route = m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if(type === "report")
		{
			let is_query_report = m.is_query_report;
			if(is_query_report === 1)
				m.route = "query-report/" + m.name;
			else
			{	
				m.route = m.ref_doctype.replace(/\s+/g, '-').toLowerCase() + "/view/report/" + m.name;
			}
		}
		else if(type==="page") 
		{
			m.route = m.name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if(type==="dashboard") 
		{
			m.route="dashboard-view/" + m.name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		return m.route;
	},
	
	get_route_for_desktop_shorcuts: function(m) {
		let type = (m.type).toLowerCase();
		if (m.standard === 1|| m.hidden === 1 || m.blocked ===1 || type ==="module") { return; }
		if(!m.route) {
			if(m.url) {
				m.route=strip(m.url, "#");
			}
			else if(type==="doctype") {
				m.route = m.link_to;
				m.route = m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}
			else if(type === "report")
			{
				let is_query_report = m.is_query_report;
				if(is_query_report === 1)
					m.route="query-report/" + m.link_to;
				else{
					m.route = m.ref_doctype.replace(/\s+/g, '-').toLowerCase() + "/view/report/" + m.link_to;
				}
			}
			else if(type==="page") {
				m.route = m.link_to;
				m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}
			else if(type==="dashboard") {
				m.route="dashboard-view/" + m.link_to;
				m.route.trim().replace(/\s+/g, '-').toLowerCase();
			}				
		}
		return m.route;
	},
	
	
	refresh: function() {
		if(!frappe.boot.kard_settings.enable_theme)
			return;

		let route = frappe.get_route();

		setTimeout(() => { 
			route = frappe.get_route();

			if(!route || (route[0] == "Workspaces"&& route[1] == "private" && !route[2])){
				frappe.set_route("desk");
				return;
			}
			else
			{
				frappe.desktop.get_workspace_data();
				frappe.desktop.add_workspace_buttons();
				frappe.desktop.load_shortcuts();
				frappe.desktop.add_bookmark_link();
			}
		}, 1000);
		
		
		
		setTimeout(() => { 
			frappe.desktop.check_workspace_btns();
		}, 2000);
	},
	
	check_workspace_btns:function(){
		if(!frappe.boot.kard_settings.check_workspace_btns)
			return;
		
		let route = frappe.get_route();
				
		if(route[0] == "Workspaces")
		{
			let has_perm = frappe.model.can_write("Workspace");
			const createButton = document.querySelector('button[data-label="Create%20Workspace"]');
			const editButton = document.querySelector('button[data-label="Edit"]');
			if(has_perm)
			{
				if(createButton)
					createButton.classList.remove("hide");
				if(editButton)
					editButton.classList.remove("hide");
			}
			else
			{
				if(createButton)
					createButton.classList.add("hide");
				if(editButton)
					editButton.classList.add("hide");
			}
		}
	},
	
	load_shortcuts: function() {
		let wrapper = document.getElementById('page-Workspaces');
		if(wrapper){
			let container_wrapper = wrapper.querySelector('.layout-main-section');
			if (container_wrapper)
				frappe.desktop.container_wrapper = container_wrapper;
			else
				return;
		}
		else
			return;
		
		let new_container_div = document.getElementById('shorcuts');
		if(new_container_div)
		{
			new_container_div.innerHTML = '';
		}
		
		if (!(!frappe.desktop.current_workspace || frappe.desktop.current_workspace == "Home"))
		{
			return;
		}
		
		frappe.call({
			method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_theme_info",
			callback: function(response) {
				frappe.desktop.desktop_icons = response.message[1];		
				frappe.desktop.modules = response.message[2];	
				frappe.desktop.render();
			},
			freeze: false,
			freeze_message: "Loading"
		});
	},

	render: function() {
		//frappe.utils.set_title(__("Desktop"));
		//frappe.desktop.container_wrapper.innerHTML = '';

		let new_container_div = document.getElementById('shorcuts');
		if(new_container_div)
		{
			new_container_div.innerHTML = '';
		}
		else
		{
			new_container_div = document.createElement('div');
			new_container_div.setAttribute("id", "shorcuts");
			// new_container_div.setAttribute("class", "layout-main-section-wrapper");
			frappe.desktop.container_wrapper.prepend(new_container_div);

		}
		

		
		frappe.desktop.sort_inst = [];
		
		let settings = frappe.boot.kard_settings;
		
		if(settings.enable_bookmarks)
		{
			let desktop_icons_id = frappe.desktop.render_user_desktop_icons(frappe.desktop.desktop_icons);
			new_container_div.appendChild(desktop_icons_id);	
			frappe.desktop.setup_user_bookmark_click( $(desktop_icons_id));
			frappe.desktop.setup_wiggle($(desktop_icons_id));
		}
		
		if(settings.enable_module_header)
		{
			// modules that are organized by categories
			/* for(key in frappe.desktop.modules){
				let m = frappe.desktop.modules[key];
				let newNode = frappe.desktop.render_module_desktop_icons(m,key);
				new_container_div.appendChild(newNode);
				frappe.desktop.setup_module_click($(newNode));
				// frappe.desktop.setup_wiggle($(newNode));
				// frappe.desktop.sort_inst.push(frappe.desktop.make_sortable($(newNode).get(0)));	
			}
			 */
			 
			let newNode = frappe.desktop.render_workspace_icons("Workspaces");
			new_container_div.appendChild(newNode);
			frappe.desktop.setup_module_click($(newNode));
		}
		
		let div_clearfix = document.createElement('div');
		div_clearfix.setAttribute("class","clearfix");
		new_container_div.appendChild(div_clearfix);
		
		frappe.desktop.sortableDisable();
		
	},
	
	render_user_desktop_icons: function(modules) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");
		
		let title_div = document.createElement('div');
		title_div.setAttribute("class", "h6 uppercase");
		title_div.innerHTML = "Bookmarks";

		modules.sort((a, b) => (a.idx > b.idx) ? 1 : -1)
		
		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");
		
		var addedIcons =false;	
		modules.forEach(m => {
			m.route = frappe.desktop.get_route_for_desktop_shorcuts(m);
			
			let color = m.color || "#ddd";
			let icon = m.icon || 'folder-normal';
			let icon_el = `
			<svg class="icon icon-lg" style="">
				<use class="" href="#icon-` + icon +`"></use>
			</svg>
			`
			
			let label = m.label;
			
			let label_wrapper = '<div class="kt-case-wrapper" title="'+label+' '+ m.type +'" data-id="'+m.name+'" data-name="'+m.link_to+'" data-link="'+m.route+'">'
			+ '<div class="kt-app-icon" style="background-color:'+ color +'">'+ icon_el
			+ '<div class="circle module-notis hide" data-doctype="'+m.link_to+'"><span class="circle-text"></span></div>'
			+ '<div class="circle module-remove hide"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>'
			+ '<div class="kt-case-label ellipsis">'
			+ '<span class="kt-case-label-text">' + label + '</span>' 
			+ '</div>'
			+ '</div>';
							
			icon_grid.innerHTML = icon_grid.innerHTML + label_wrapper;
			addedIcons = true;
		})
		
		if(addedIcons === false)
		{
			// let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			// msg.innerHTML = "No Bookmarks Added";
			// desktop_icons_id.appendChild(msg);
		}
		else
		{
			desktop_icons_id.prepend(icon_grid);
			desktop_icons_id.prepend(title_div);
		}
		
		if(frappe.boot.kard_settings.enable_bookmark_sorting)
		{
			frappe.desktop.sort_inst.push(frappe.desktop.make_sortable($(icon_grid).get(0)));			
		}
			

		return desktop_icons_id;
	
	},
	
	render_workspace_icons: function(title) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");
		let title_div = document.createElement('div');
		title_div.setAttribute("class", "h6 uppercase");
		title_div.innerHTML = title;
		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");
		
		let entries = frappe.boot.allowed_workspaces;
				
		var addedIcons = false;
		
		// Loop through the dictionary and create <li> elements
		for (var key in entries) {
			if (entries.hasOwnProperty(key)) {
				let m = entries[key];
				if (m.is_hidden !== 1) { 
					let type = (m.type).toLowerCase();
					let name = entries[key].name.replace(/\s+/g, '-').toLowerCase();
					let iconVariable = 'icon-' + (entries[key].icon || 'folder-normal'); // Replace with your actual variable
					m.route = '/app/' + name; // Generate href using the key
					let color = m.kard_theme_color || m.color || "#ddd";
					let icon = m.icon || 'folder-normal';
					let icon_el = `
					<svg class="icon icon-lg" style="">
						<use class="" href="#icon-` + icon +`"></use>
					</svg>
					`
					
					let label = m.title;
					
					let label_wrapper = '<div class="kt-case-wrapper" title="'+label+'" data-name="'+name+'" data-link="'+m.route+'">'
					+ '<div class="kt-app-icon" style="background-color:'+ color +'">'+ icon_el
					+ '<div class="circle module-notis hide" data-doctype="'+ name +'"><span class="circle-text"></span></div>'
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
		
		
		if(addedIcons === false)
		{
			// let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			// msg.innerHTML = "No Bookmarks Added";
			
			// desktop_icons_id.appendChild(msg);
		}
		else
		{
			desktop_icons_id.prepend(icon_grid);
			desktop_icons_id.prepend(title_div);
		}
		
		return desktop_icons_id;	
	},
	
	// deprecated
	render_module_desktop_icons: function(modules,title) { 
		
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");
				
		let title_div = document.createElement('div');
		title_div.setAttribute("class", "h6 uppercase");
		title_div.innerHTML = title;
		
		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");
				
		modules.sort((a, b) => (a.label > b.label) ? 1 : -1)
		var addedIcons = false;
		modules.forEach(m => {
			let type = (m.type).toLowerCase();
			if (m.standard === 0 || m.blocked === 1 || type !=="module" || m.hidden === 1) { return; }
			if(!m.route) {
				if(m.url) {
					m.route=strip(m.url, "#");
				}
				else if(type==="doctype") {
					if(frappe.model.is_single(m.link_to)) {
						m.route = 'Form/' + m.link_to;
					} else {
						m.route="List/" + m.link_to;
					}
				}
				else if(type==="query-report") {
					m.route="query-report/" + item.link_to;
				}
				else if(type==="report") {
					m.route="List/" + m.doctype + "/Report/" + m.link_to;
				}
				else if(type==="page") {
					m.route=m.link_to;
				}
				else if(type==="module") {
					m.route="#modules/" + m.link_to;
				}
			}
			
			let label_wrapper = '<div class="kt-case-wrapper" title="'+m.label+'" data-name="'+m.link_to+'" data-link="'+m.route+'">'
			+ '<div class="kt-app-icon" style="background-color:'+ m.color +'"><i class="'+m.icon+'"></i>'
			+ '<div class="circle module-notis hide" data-doctype="'+m.link_to+'"><span class="circle-text"></span></div>'
			+ '<div class="circle module-remove hide"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>'
			+ '<div class="kt-case-label ellipsis">'
			+ '<span class="kt-case-label-text">' + m.label + '</span>' 
			+ '</div>'
			+ '</div>';
			
			icon_grid.innerHTML = icon_grid.innerHTML + label_wrapper;
			addedIcons = true;
		});
		
		
		
		if(addedIcons === false)
		{
			// let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			// msg.innerHTML = "No Bookmarks Added";
			
			// desktop_icons_id.appendChild(msg);
			
		}
		else
		{
			desktop_icons_id.prepend(icon_grid);
			desktop_icons_id.prepend(title_div);
			
		}
			

		
		return desktop_icons_id;
	
	},

	setup_user_bookmark_click: function(wrapper) {
		frappe.desktop.wiggling = false;

		wrapper.on("click", ".kt-app-icon, .kt-app-icon-svg", function() {
			if ( !frappe.desktop.wiggling ) {
				frappe.desktop.open_user_bookmark($(this).parent());
			}
		});
			
		wrapper.on("click", ".circle .modile-notis", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

	},
	
	setup_module_click: function(wrapper) {
		frappe.desktop.wiggling = false;

		wrapper.on("click", ".kt-app-icon, .kt-app-icon-svg", function() {
			if ( !frappe.desktop.wiggling ) {
				frappe.desktop.open_module($(this).parent());
			}
		});
		
		wrapper.on("click", ".circle .modile-notis", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

	},
	
	setup_wiggle: function(wrapper) {
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1200;

		var   timer_id      = 0;
		const $cases        = wrapper.find('.kt-case-wrapper');
		const $icons        = wrapper.find('.kt-app-icon');
		
		const clearWiggle   = () => {
			const $cases        = wrapper.find('.kt-case-wrapper');
			const $icons        = wrapper.find('.kt-app-icon');
			let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
				const text      = $(object).find('.circle-text').html();
				
				if(text)
					return object;
				else
					return null;
			}));
			
			const $closes    = wrapper.find('.module-remove');
	
			$closes.addClass('hide');
			$notis.removeClass('hide');
			$icons.removeClass('wiggle');
			frappe.desktop.wiggling   = false;
			frappe.desktop.sortableDisable();
		};
			
		
		
		wrapper.on('mousedown touchstart', '.kt-app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.desktop.sortableEnable();
				frappe.desktop.wiggling = true;
				
				
				// hide all notifications.
				let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
					let text      = $(object).find('.circle-text').html();
					
					if(text)
						return object;
					else
						return null;
				}));
				
				$notis.addClass('hide');
				
				$cases.each((i) => {
					const $case    = $($cases[i]);
					const $close  = $case.find('.module-remove');
					$close.removeClass('hide');
					$close.unbind();
					const name    = $case.attr('title');
					const id    = $case.attr('data-id');
					$close.click(() => {
						const dialog = new frappe.ui.Dialog({
							title: __(`Remove bookmark ${name}?`)
						});
						dialog.set_primary_action(__('Remove'), () => {
							frappe.call({
								method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.hide',
								args: { 
									name:id
								},
								freeze: true,
								callback: (response) =>
								{
									if ( response.message ) {
										location.reload();
									}
								}
							})

							dialog.hide();

							clearWiggle();
						});
						// Hacks, Hacks and Hacks.
						var $cancel = dialog.get_close_btn();
						$cancel.unbind();
						$cancel.click(() => {
							clearWiggle();
						});
						$cancel.html(__(`Cancel`));

						dialog.show();
					});
				});

				$icons.addClass('wiggle');

			}, DURATION_LONG_PRESS);
		});
		wrapper.on('mouseup mouseleave touchend', '.kt-app-icon', () => {
			clearTimeout(timer_id);
		});
		
		

		// also stop wiggling if clicked elsewhere.
		$('body').unbind();
		$('body').click((event) => {
			if ( frappe.desktop.wiggling ) {
				const $target = $(event.target);
				// our target shouldn't be .kt-app-icons or .close
				const $parent = $target.parents('.kt-case-wrapper');
				if ( $parent.length == 0 )
					clearWiggle();
			}
		});
		// end wiggle
	},
	
	open_user_bookmark: function(parent) {
		var link = parent.attr("data-link");
		if(link) {
			if(link.indexOf('javascript:')===0) {
				eval(link.substr(11));
			} else if(link.substr(0, 1)==="/" || link.substr(0, 4)==="http") {
				window.open(link, "_blank");
			} else {
				frappe.set_route(link);
			}
			return false;
		} 
	},
	
	open_module: function(parent) {
		if(frappe.boot.kard_settings.enable_links_by_module === 0)
		{
			var link = parent.attr("data-link");
			if(link) {
				if(link.indexOf('javascript:')===0) {
					eval(link.substr(11));
				} else if(link.substr(0, 4)==="http") {
					window.open(link, "_blank");
				} else {
					frappe.set_route(link);
				}
				return false;
			}
		}	
	},

	make_sortable: function(wrapper) {
		return new Sortable(wrapper, {
			animation: 150,
			onUpdate: function(event) {
				var new_order = [];
				
				const $cases = $(wrapper).find('.kt-case-wrapper');

				$cases.each(function(i, e) {
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
	
	sortableEnable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		for (var i=0, l=frappe.desktop.sort_inst.length; i < l; i++) {
			frappe.desktop.sort_inst[i].options["disabled"] = false;
		}
	
		return false;
	},
	
	sortableDisable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		
		for (var i=0, l=frappe.desktop.sort_inst.length; i < l; i++) {
			frappe.desktop.sort_inst[i].options["disabled"] = true;
		}
	
		return false;
	},
	
	add_bookmark_link: function() {
		let route = frappe.get_route()
		let new_link = '';
		let pin_link = '';
		let args = {'report':''};
		
		// Find the div element with the specified classes and without display: none style
		const divElement = document.querySelector('div.content.page-container:not([style*="display: none"])');


		if(!frappe.boot.kard_settings.enable_bookmarks)
			return;

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
					new_link.setAttribute('id','bookmark-btn');
					ulElement.appendChild(new_link);
					
					pin_link = document.createElement('li');
					// new_link.setAttribute('id','add-to-desktop');
					pin_link.setAttribute('id','pin-btn');
					ulElement.appendChild(pin_link);
				}

				
			}
			else{
				console.log("no ulelement");
				return;
			}
		}
		else{
			console.log("no div element");
			return;
		}
			
		// console.log(route);
		new_link.innerHTML = '<a class="grey-link dropdown-item">'+__("Bookmark")+'</a>';
		new_link.classList.add('hide');
		$(new_link).unbind();
		
		pin_link.innerHTML = '<a class="grey-link dropdown-item">'+__("Pin")+'</a>';
		pin_link.classList.add('hide');
		$(pin_link).unbind();
		if(!route) {
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
			else
			{
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

			if(!frappe.model.is_single(route[1])) {
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
		else
		{
			return;
		}
		
		new_link.classList.remove('hide');
		pin_link.classList.remove('hide');
		
		let titleAttributeValue = (document.querySelector(".title-area h3[title]")?.getAttribute("title") || "");
		// args['label'] = titleAttributeValue || args['label'];
		
		frappe.desktop.show_bookmark_dialog(new_link,args);
		frappe.desktop.show_pin_dialog(pin_link,args);
	},
	
	show_bookmark_dialog: function(new_link,args) {
		let msg = __('Bookmark') + ' ' + args['label'] + ' To Desktop?'
		$(new_link).on("click", function() {
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
	
	show_pin_dialog : function(new_link,args) {
		let msg = __('Pin') + ' ' + args['label'] + ' To Menu?';
		$(new_link).on("click", function() {
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

	add_bookmark: function(args) {
		args['url'] = args['link'] = frappe.get_route_str();
		args['workspace'] = 'Home';
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.add_user_icon',
			args: {
				'args':args,
			},
			callback: function(r) {
				if(r.message) {
					frappe.show_alert(__("Updated"));
				}
			}
		});
	},
	
	add_pin: function(args) {
		args['url'] = args['link'] = frappe.get_route_str();
		args['workspace'] = 'Home';
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_pinned_entry.kard_pinned_entry.pin_user_icon',
			args: {
				'args':args,
			},
			callback: function(r) {
				if(r.message) {
					frappe.show_alert(__("Updated"));
				}
			}
		});
	},

});



