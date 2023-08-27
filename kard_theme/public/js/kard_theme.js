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
			function addButton() {
				var existingSpan = document.getElementById('globalmenu');
				
				if (!existingSpan) {
					var navbarBrand = document.querySelector('.navbar-brand.navbar-home');

					var globalMenuSpan = document.createElement('span');
					globalMenuSpan.id = 'globalmenu';
					globalMenuSpan.classList.add('icon', 'icon-md', 'navbar-icon'); // Add your icon styling class
					navbarBrand.parentNode.insertBefore(globalMenuSpan, navbarBrand);

					var svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
					// svgIcon.setAttribute('class', 'icon icon-menu');
					svgIcon.setAttribute('viewBox', '0 0 24 24');
					
					var useElement = document.createElementNS("http://www.w3.org/2000/svg", "use");
					useElement.setAttribute('href', '#icon-menu');
					
					svgIcon.appendChild(useElement);
					globalMenuSpan.appendChild(svgIcon);

					globalMenuSpan.addEventListener('click', function() {
						toggleSidebar();
					});
				}
			}
			
			 function toggleSidebar() {
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
									<svg class="icon icon-md">
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
				frappe.desktop.current_workspace = route[1];
				var matchingItem = frappe.boot.allowed_workspaces.find(item => item.name === route[1]);
				var module = route[1];
				var is_workspace = 0;

				if (matchingItem) {
					module = matchingItem.module;
					if(!module)
					{
						module = route[1];
						is_workspace = 1;
					}
				}
				var docs = [];
				var reports = [];
				frappe.call({
					method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get",
					args: { 
						module: module,
						is_workspace:is_workspace
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
						docs.sort((a, b) => a.label.localeCompare(b.label));
						
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
		
		if(route[0] !== "Workspaces")
		{
			let docsButton = document.querySelector('.docs-button');
			let reportsButton = document.querySelector('.reports-button');
			
			if(docsButton)
				docsButton.classList.add("hide");
			
			if(reportsButton)
				reportsButton.classList.add("hide");
			
			console.log("hide workspace buttons");
		}
		
		
		
		if(route[0] == "Workspaces" && route[1])
		{
				
				
				// Check if the buttons have already been added
				let docsButton = document.querySelector('.docs-button');
				let reportsButton = document.querySelector('.reports-button');
				// Find the div with class custom-actions
				const customActionsDiv = document.querySelector('#page-Workspaces .custom-actions');

			   if (!docsButton) {
				  docsButton = document.createElement('button');
				  docsButton.textContent = 'Docs';
					docsButton.classList.add('btn', 'btn-default', 'ellipsis', 'docs-button');
				  
				  
				  // Check if custom-actions div exists before inserting new elements
				  if (customActionsDiv) {
					customActionsDiv.parentNode.insertBefore(docsButton, customActionsDiv);
				  }
				  
			   }
			   
			 
			   
				if (!reportsButton) {
					// Create Reports button
					reportsButton = document.createElement('button');
					reportsButton.textContent = 'Reports';
					reportsButton.classList.add('btn', 'btn-default', 'ellipsis', 'reports-button');
				  
				  
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

			 
			
			// var labels = $(document).find('.custom_workspace_btn');			
			// var added_doctypes = false;
			// var added_reports = false;
				/* let $workspace_page = frappe.pages['Workspaces']['page'];
				let opts = {'btn_class':'custom_workspace_btn'};
				 */
			// labels.each((i) => {
				// if(labels[i].innerText == 'Docs')
					// added_doctypes = true;
				
				// if(labels[i].innerText == 'Reports')
					// added_reports = true;
			// });
			
			/* if(added_doctypes === false)
			{
				
									
				let doctypes_menu = $workspace_page.add_button('Docs',
				() => {
					frappe.desktop.initializeSidebar(route[1] + ' Docs',frappe.desktop.docs);
				}
				,opts);
				

			}
			
			if(added_reports === false)
			{
				let $workspace_page = frappe.pages['Workspaces']['page'];
				let opts = {'btn_class':'custom_workspace_btn'};
				
				let reports_menu = $workspace_page.add_button('Reports',
				() => {
					frappe.desktop.initializeSidebar(route[1] + ' Reports',frappe.desktop.reports);						
				}
				,opts);
			} */
			
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
					aElement.href = '/app/' + frappe.desktop.get_route_from_m(entry);
					aElement.textContent = entry.label;
					if(entry.hasOwnProperty('favorite') && entry.favorite == 1)
					{
						let spanElement = document.createElement('span');
						spanElement.innerHTML = `
							<svg class="liked icon icon-sm">
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
				aElement.href = '/app/' + frappe.desktop.get_route_from_m(entry);
					aElement.textContent = entry.label;
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
	
	get_route_from_m: function(m) {
		if(m.link) {
			m.route=strip(m.link, "#");
		}
		else if(m.type==="doctype") {
			if(frappe.model.is_single(m.name)) {
				m.route =  m.name;
			} else {
				m.route = m.name;
			}
			m.route = m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if(m.type == "report")
		{
			if(m.is_query_report === 1)
				m.route="query-report/" + m.name;
			else{
				
				m.route = m.doctype.replace(/\s+/g, '-').toLowerCase() + "/view/report/" + m.name;
				}
			m.icon = "fa fa-list";
		}
		else if(m.type==="page") {
			m.route = m.name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		else if(m.type==="module") {
			m.route="modules/" + m.module_name;
			m.route.trim().replace(/\s+/g, '-').toLowerCase();
		}
		return m.route 
	},
		
	refresh: function() {
		frappe.desktop.get_workspace_data();
		frappe.desktop.add_workspace_buttons();

		let route = frappe.get_route();


		setTimeout(() => { 
			route = frappe.get_route();
			// console.log(route);
			frappe.desktop.add_to_desktop_link();

			if(!route || (route[0] == "Workspaces"&& route[1] == "private")){
				frappe.set_route("desk");
				return;
			}
		}, 1000);
		
		setTimeout(() => { 
			route = frappe.get_route();
				
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
		
		2000);
		
		
	},
	
	load_shortcuts: function() {
		
		if(!frappe.boot.kard_settings.enable_theme)
			return;
		
		var wrapper = document.getElementById('page-desktop');
		if(wrapper){
			this.container_wrapper = $(wrapper).find('.container')[0];
		}
		else
		{
			return;
		}					
		
		var check_wrapper = document.getElementById('layout-main-section');
		if (!check_wrapper)
		{
			frappe.call({
				method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_theme_info",
				callback: function(response) {
					frappe.desktop.desktop_icons = response.message[1];		
					frappe.desktop.modules = response.message[2];	
					frappe.desktop.render();
				},
				freeze: true,
				freeze_message: "Loading"
				
			});
			
		}
	},

	render: function() {
		var me = this;
		frappe.utils.set_title(__("Desktop"));

				
		var new_container_div = document.createElement('div');
		new_container_div.setAttribute("id", "layout-main-section");
		$(new_container_div).addClass("layout-main-section-wrapper");
		
		frappe.desktop.sort_inst = [];
		
		var settings = frappe.boot.kard_settings;
		
		/* var showhidebutton = document.createElement('div');
		$(showhidebutton).addClass("show-hide-button");
		showhidebutton.innerHTML = '<a class="btn-show-hide-icons btn-show-hide-icons btn btn-primary btn-sm primary-action"><i class="fa fa-pencil"></i></a>';
		$(showhidebutton).on("click", ".btn-show-hide-icons", function() {
			
		});
		
		new_container_div.appendChild(showhidebutton);	 */
		
		if(settings.enable_bookmarks)
		{
			let desktop_icons_id = frappe.desktop.render_user_desktop_icons(frappe.desktop.desktop_icons);
			new_container_div.appendChild(desktop_icons_id);	
			frappe.desktop.setup_user_bookmark_click( $(desktop_icons_id));
			frappe.desktop.setup_wiggle($(desktop_icons_id));

		}
		
		if(settings.enable_module_header)
		{
			
		
			for(key in frappe.desktop.modules){

				let m = frappe.desktop.modules[key];
								
				let newNode = frappe.desktop.render_module_desktop_icons(m,key);
				new_container_div.appendChild(newNode);
				frappe.desktop.setup_module_click($(newNode));
				// frappe.desktop.setup_wiggle($(newNode));
				// frappe.desktop.sort_inst.push(frappe.desktop.make_sortable($(newNode).get(0)));	
			}
			
			
		
						
			var overlay_sidebar = document.createElement('div');
			overlay_sidebar.setAttribute("id", "kt-overlay-sidebar");
			overlay_sidebar.setAttribute("class", "hide layout-side-section layout-left kt-overlay-sidebar");
			
			var close_sidebar_wrapper = document.createElement('div');
			close_sidebar_wrapper.setAttribute("id", "close-sidebar");
			
			new_container_div.appendChild(overlay_sidebar);
			frappe.desktop.container_wrapper.appendChild(close_sidebar_wrapper);
			$(close_sidebar_wrapper).on('click', close_sidebar);

			function close_sidebar(e) {
				/* var scroll_container = document.getElementsByClassName("content page-container")[0]
				scroll_container.setAttribute('style','overflow-y:hidden;overscroll-behavior:none;'); */
				$(overlay_sidebar).removeClass('opened')
						.find('.dropdown-toggle')
						.removeClass('text-muted');
				$(overlay_sidebar).find('.reports-dropdown')
					.addClass('dropdown-menu');
					
				$(close_sidebar_wrapper).removeClass("opened");
				
			}
			
			
		}
		
		let div_clearfix = document.createElement('div');
		$(div_clearfix).addClass("clearfix");
		frappe.desktop.container_wrapper.prepend(div_clearfix);
		frappe.desktop.container_wrapper.prepend(new_container_div);
		
		
		if(settings.enable_module_sidebar)
		{	
			
			let newNode = frappe.desktop.render_module_sidebar();

			frappe.desktop.container_wrapper.prepend(newNode);	
			frappe.desktop.setup_user_bookmark_click($(newNode));
			
			$(new_container_div).addClass("col-md-9");
			$(new_container_div).removeClass("col-md-12");
			$(".module-page-container").addClass("col-md-9");
			$(".module-page-container").removeClass("col-md-12");
		}	
		else
		{
			$(new_container_div).removeClass("col-md-9");
			$(new_container_div).addClass("col-md-12");
			$(".module-page-container").removeClass("col-md-9");
			$(".module-page-container").addClass("col-md-12");
		}
		

				
		frappe.desktop.sortableDisable();

		// notifications
		// frappe.desktop.show_pending_notifications();
		// $(document).on("notification-update", function() {
			// frappe.desktop.show_pending_notifications();
		// });
		
		if(frappe.boot.kard_settings.hide_default_desktop == 1)
					{
						setTimeout(function(){ $('#page-desktop').find('.modules-page-container').addClass("hide"); }, 1000);

						
					}
					else
					{
						setTimeout(function(){ $('#page-desktop').find('.modules-page-container').removeClass("hide"); }, 1000);
					}
		
		
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
			if (m.standard === 1|| m.hidden === 1 || m.blocked ===1 || m.type ==="module") { return; }
			if(!m.route) {
				if(m.link) {
					m.route=strip(m.link, "#");
				}
				else if(m.type==="doctype") {
					if(frappe.model.is_single(m._doctype)) {
						m.route = 'Form/' + m._doctype;
					} else {
						m.route="List/" + m._doctype;
					}
				}
				else if(m.type==="query-report") {
					m.route="query-report/" + m.module_name;
				}
				else if(m.type==="report") {
					m.route="List/" + m.doctype + "/Report/" + m.module_name;
					m.icon = "fa fa-list";
				}
				else if(m.type==="page") {
					m.route=m.module_name;
				}
				else if(m.type==="module") {
					m.route="modules/" + m.module_name;
				}
			}
			
		
			
			
			let label_wrapper = '<div class="kt-case-wrapper" title="'+m.label+'" data-name="'+m.module_name+'" data-link="'+m.route+'">'
			+ '<div class="kt-app-icon" style="background-color:'+ m.color +'"><i class="'+m.icon+'"></i>'
			+ '<div class="circle module-notis hide" data-doctype="'+m.module_name+'"><span class="circle-text"></span></div>'
			+ '<div class="circle module-remove hide"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>'
			+ '<div class="kt-case-label ellipsis">'
			+ '<span class="kt-case-label-text">' + m.label + '</span>' 
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
	
	render_module_sidebar: function() {
		let sidebar_div = document.createElement('div');
		sidebar_div.setAttribute("id", "desktop-sidebar");
		$(sidebar_div).addClass("col-md-3 layout-side-section layout-left");
		let ul_wrapper = document.createElement('ul');
		$(ul_wrapper).addClass("module-sidebar-nav kt-overlay-sidebar nav nav-pills nav-stacked");
		
		
		for(key in frappe.desktop.modules){
			
			let modules = frappe.desktop.modules[key];
			
			modules.sort((a, b) => (a.module_name > b.module_name) ? 1 : -1)
			
			let addedIcons = false;
			let moduleHTML = "";
			modules.forEach(m => {
				if (m.standard === 0 || m.blocked === 1 || m.type !=="module" || m.hidden === 1) { return; }
				if(!m.route) {
					if(m.link) {
						m.route=strip(m.link, "#");
					}
					else if(m.type==="doctype") {
						if(frappe.model.is_single(m._doctype)) {
							m.route = 'Form/' + m._doctype;
						} else {
							m.route="List/" + m._doctype;
						}
					}
					else if(m.type==="query-report") {
						m.route="query-report/" + item.module_name;
					}
					else if(m.type==="report") {
						m.route="List/" + m.doctype + "/Report/" + m.module_name;
					}
					else if(m.type==="page") {
						m.route=m.module_name;
					}
					else if(m.type==="module") {
						m.route="#modules/" + m.module_name;
					}
				}
				let label_wrapper = '<li class="strong module-sidebar-item">'
				+ '<a class="module-link" data-name="'+ m.module_name + '" href="'+ m.route + '">'
				+ '<span class="sidebar-icon" style="background-color: '+ m.color + '"><i class="'+ m.icon + '"></i></span>'
				+ '<span class="ellipsis">'+ m.label + '</span>'
				+ '</a>'
				+ '</li>';
				
				moduleHTML = moduleHTML + label_wrapper;
				addedIcons = true;
				
			});
		
			
			if(addedIcons === false)
			{
			}
			else
			{
				let title_div = document.createElement('div');
				title_div.setAttribute("class", "h6 uppercase");
				title_div.innerHTML = key + moduleHTML;				
				ul_wrapper.appendChild(title_div);
			}
			
		}
		
	
		sidebar_div.appendChild(ul_wrapper);
	
		
		return sidebar_div;
	},
	
	render_module_desktop_icons: function(modules,title) {
		
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("class", "desktop-icons");
				
		let title_div = document.createElement('div');
		title_div.setAttribute("class", "h6 uppercase");
		title_div.innerHTML = title;
		
		let icon_grid = document.createElement('div');
		icon_grid.setAttribute("class", "icon-grid");
				
		modules.sort((a, b) => (a.module_name > b.module_name) ? 1 : -1)
		var addedIcons = false;
		modules.forEach(m => {
			if (m.standard === 0 || m.blocked === 1 || m.type !=="module" || m.hidden === 1) { return; }
			if(!m.route) {
				if(m.link) {
					m.route=strip(m.link, "#");
				}
				else if(m.type==="doctype") {
					if(frappe.model.is_single(m._doctype)) {
						m.route = 'Form/' + m._doctype;
					} else {
						m.route="List/" + m._doctype;
					}
				}
				else if(m.type==="query-report") {
					m.route="query-report/" + item.module_name;
				}
				else if(m.type==="report") {
					m.route="List/" + m.doctype + "/Report/" + m.module_name;
				}
				else if(m.type==="page") {
					m.route=m.module_name;
				}
				else if(m.type==="module") {
					m.route="#modules/" + m.module_name;
				}
			}
			
			let label_wrapper = '<div class="kt-case-wrapper" title="'+m.label+'" data-name="'+m.module_name+'" data-link="'+m.route+'">'
			+ '<div class="kt-app-icon" style="background-color:'+ m.color +'"><i class="'+m.icon+'"></i>'
			+ '<div class="circle module-notis hide" data-doctype="'+m.module_name+'"><span class="circle-text"></span></div>'
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
				frappe.desktop.open_user_shortcut($(this).parent());
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
					$close.click(() => {
						// good enough to create dynamic dialogs?
						const dialog = new frappe.ui.Dialog({
							title: __(`Hide ${name}?`)
						});
						dialog.set_primary_action(__('Hide'), () => {
							frappe.call({
								method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.hide',
								args: { name: name },
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
	
	open_user_shortcut: function(parent) {
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
		} else {
			var module = frappe.get_module(parent.attr("data-name"));
			if (module && module.onclick) {
				module.onclick();
				return false;
			}
		}
	},
	
	open_module: function(parent) {
		
		if(frappe.boot.kard_settings.enable_links_by_module === 0)
		{
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
			} else {
				var module = frappe.get_module(parent.attr("data-name"));
				if (module && module.onclick) {
					module.onclick();
					return false;
				}
			}
		}
		
		
		
		/* 	var scroll_container = document.getElementsByClassName("content page-container")[0]
		scroll_container.setAttribute('style','overflow-y:hidden;overscroll-behavior:none;');
		*/
		
		var module = frappe.get_module(parent.attr("data-name"));

		var overlay_sidebar = document.getElementById("kt-overlay-sidebar");
		if(overlay_sidebar)
		{
			overlay_sidebar.innerHTML = "";
			let ul_element = document.createElement("ul");
			let li_element = document.createElement("li");
			$(li_element).addClass("kt-module-header");
			li_element.innerHTML = module.label;	
			
			
			ul_element.appendChild(li_element);
			ul_element.setAttribute('class','nav nav-pills nav-stacked')
			
			
			/* var li_divider = document.createElement("li");
			$(li_divider).addClass("divider");
			ul_element.appendChild(li_divider); */
			
			let module_items = [];
			for (key in frappe.desktop.modules)
			{
				let modules_in_category = frappe.desktop.modules[key];
				
				let module_info = modules_in_category.find(element => element.module_name == module.module_name);
				if(module_info)
				{
					module_items = module_info["items"];
					break;
				}
					
			}
			
		
			if(!module_items)
				return false;
											
			module_items.forEach(e => {
				
				let li_element = document.createElement("li");
				$(li_element).addClass("kt-module-section");

				li_element.innerHTML = e.label;	
				ul_element.appendChild(li_element);
		
				
				
				e.items.forEach(m => {
				
					let li_element = document.createElement("li");
					$(li_element).addClass("kt-module-link");
					
					// console.log(m)
					let link = "";
					
					if(m.type == "doctype"){
						link = '#List/' + m.name + "/List";
						if(m.is_single)
							link = '#Form/' + m.name;
					}
					else if(m.type == "page"){
						
					}
					else if(m.type == "report")
					{
						if(m.is_query_report === 1)
							link = '#query-report/' + m.name;
						else
							link = 'report/' + m.name;
					}
					
					
					li_element.innerHTML = '<a href="'+link+'">'+ m.name+'</a>';	
				
				
					ul_element.appendChild(li_element);
					
					
				})
				
				
			});
			
			overlay_sidebar.appendChild(ul_element);
	
			$(overlay_sidebar).addClass("opened");
			
			
			/* frappe.call({
				method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_module_info",
				args: {
						'module': parent.attr("data-name"),
					},
				callback: function(response) {
					
					
					
					
				}
			});
			 */
			
			
			
		}
		
		var close_sidebar_wrapper = document.getElementById("close-sidebar");
		if(close_sidebar_wrapper)
		{
			$(close_sidebar_wrapper).addClass("opened");
		}
		
		
		
	},

	make_sortable: function(wrapper) {
		return new Sortable(wrapper, {
			animation: 150,
			onUpdate: function(event) {
				var new_order = [];
				
				const $cases = $(wrapper).find('.kt-case-wrapper');

				$cases.each(function(i, e) {
					new_order.push($(this).attr("data-name"));
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
	
	show_pending_notifications: function() {
		var modules_list = frappe.get_desktop_icons();
		for (var i=0, l=modules_list.length; i < l; i++) {
			var module = modules_list[i];

			var module_doctypes = frappe.boot.notification_info.module_doctypes[module.module_name];

			var sum = 0;

			if(module_doctypes && frappe.boot.notification_info.open_count_doctype) {
				// sum all doctypes for a module
				for (var j=0, k=module_doctypes.length; j < k; j++) {
					var doctype = module_doctypes[j];
					let count = (frappe.boot.notification_info.open_count_doctype[doctype] || 0);
					count = typeof count == "string" ? parseInt(count) : count;
					sum += count;
				}
			}

			if(frappe.boot.notification_info.open_count_doctype
				&& frappe.boot.notification_info.open_count_doctype[module.module_name]!=null) {
				// notification count explicitly for doctype
				let count = frappe.boot.notification_info.open_count_doctype[module.module_name] || 0;
				count = typeof count == "string" ? parseInt(count) : count;
				sum += count;
			}

			if(frappe.boot.notification_info.open_count_module
				&& frappe.boot.notification_info.open_count_module[module.module_name]!=null) {
				// notification count explicitly for module
				let count = frappe.boot.notification_info.open_count_module[module.module_name] || 0;
				count = typeof count == "string" ? parseInt(count) : count;
				sum += count;
			}

			// if module found
			if(module._id.indexOf('/')===-1 && !module._report) {
				var notifier = $(".module-count-" + frappe.scrub(module._id));
				if(notifier.length) {
					notifier.toggle(sum ? true : false);
					var circle = notifier.find(".circle-text");
					var text = sum || '';
					if(text > 99) {
						text = '99+';
					}

					if(circle.length) {
						circle.html(text);
					} else {
						notifier.html(text);
					}
				}
			}
		}
	},

	get_desktop_icons: function(show_hidden, show_global) {
		// filter valid icons

		// hidden == hidden from desktop
		// blocked == no view from modules either

		var out = [];

		var add_to_out = function(module) {
			module = frappe.get_module(module.module_name, module);
			module.app_icon = frappe.ui.app_icon.get_html(module);
			out.push(module);
		};

		var show_module = function(m) {
			var out = true;
			if(m.type==="page") {
				out = m.link in frappe.boot.page_info;
			} else if(m.force_show) {
				out = true;
			} else if(m._report) {
				out = m._report in frappe.boot.user.all_reports;
			} else if(m._doctype) {
				//out = frappe.model.can_read(m._doctype);
				out = frappe.boot.user.can_read.includes(m._doctype);
			} else {
				if(frappe.user.has_role('System Manager')) {
					out = true;
				} else {
					out = frappe.boot.user.allow_modules.indexOf(m.module_name) !== -1;
				}
			}
			if(m.hidden && !show_hidden) {
				out = false;
			}
			if(m.blocked && !show_global) {
				out = false;
			}
			return out;
		};

		let m;
			
		for (var i=0, l=frappe.desktop.desktop_icons.length; i < l; i++) {
			m = frappe.desktop.desktop_icons[i];
			if ((['Core'].indexOf(m.module_name) === -1) && show_module(m)) {
				add_to_out(m);
			}
		}

		/* if(frappe.user_roles.includes('System Manager')) {
			m = frappe.get_module('Setup');
			if(show_module(m)) add_to_out(m);
		}

		if(frappe.user_roles.includes('Administrator')) {
			m = frappe.get_module('Core');
			if(show_module(m)) add_to_out(m);
		} */

		return out;
	},

	add_to_desktop: function(label, doctype, report) {
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_desktop_icon.kard_desktop_icon.add_user_icon',
			args: {
				'link': frappe.get_route_str(),
				'label': label,
				'type': 'link',
				'_doctype': doctype,
				'_report': report
			},
			callback: function(r) {
				if(r.message) {
					frappe.show_alert(__("Added"));
				}
			}
		});
	},

	add_to_desktop_link: function() {
		let route = frappe.get_route()
		let type = '';
		let doctype = '';
		let label = '';
		let report = '';
		
		// let new_link = document.getElementById('add-to-desktop');
		let new_link = '';
		
		// Find the div element with the specified classes and without display: none style
		const divElement = document.querySelector('div.content.page-container:not([style*="display: none"])');

		if (divElement) {
			// Find the ul element within the div element
			const ulElement = divElement.querySelector('ul.dropdown-menu.dropdown-menu-right');

			if (ulElement) {
				
				new_link = ulElement.querySelector('li#bookmark-btn');
				if (new_link) {

				} else {
					new_link = document.createElement('li');
					// new_link.setAttribute('id','add-to-desktop');
					new_link.setAttribute('id','bookmark-btn');
					ulElement.appendChild(new_link);
				}

				
			}
			else{
				console.log("no ulelement");
				return;
			}
		}
		else{
			console.log("no divelement");
			return;
		}
			

		new_link.innerHTML = '<a class="grey-link dropdown-item">'+__("Bookmark")+'</a>';
		new_link.classList.add('hide');
		$(new_link).unbind();
		
		if(!route) {
			
			new_link.innerHTML = '<a>'+__("Customize Desktop")+'</a>';
			$(new_link).on("click", function() {
						
				frappe.desktop.show_hide_cards_dialog();
			});
			new_link.classList.remove('hide');

			return;
		}
		else if (route[0] === 'List') {
			type = route[0];
			label = route[1];
			doctype = route[1];
		}
		else if (route[0] === 'Form') {
			type = route[0];
			label = route[1];
			doctype = route[1];
			if(!frappe.model.is_single(label)) {
				return;
			} 
		}
		else if (route[2] === 'Report') {
			type = route[2];
			label = route[1];
			report = route[1];
		}
		else if (route[0] === 'query-report') {
			type = route[0];
			label = route[1];
			report = route[1];
		}
		else if (route[0] === 'dashboard') {
			type = route[0];
			label = route[1];
		}
		else
		{
			return;
		}
		
		new_link.classList.remove('hide');

		var msg = __('Bookmark') + ' ' + label + '?';
		$(new_link).on("click", function() {
			let user_value = frappe.session.user;

			let fields = [
				// {
					// label: __('Setup For'),
					// fieldname: 'setup_for',
					// fieldtype: 'Select',
					// options: [
						// {
							// label: __('User ({0})', [frappe.session.user]),
							// value: user_value
						// }/* ,
						// {
							// label: __('Everyone'),
							// value: 'Everyone'
						// }
					// ],
					// default: user_value,
					// depends_on: doc => frappe.user_roles.includes('System Manager'),
					// onchange() {
						// let value = d.get_value('setup_for');
						// let field = d.get_field('setup_for');
						// let description = value === 'Everyone' ? __('Hide icons for all users') : '';
						// field.set_description(description);
					// }
				// }, */
				{
					label: __('Bookmark') ,
					fieldname: 'bookmark',
					fieldtype: 'Check',
				},
				{
					label: __('Pin'),
					fieldname: 'pin',
					fieldtype: 'Check',
				},
			];
						
			const d = new frappe.ui.Dialog({
				// title: __('Bookmark') + ' ' + label,
				title: msg,
				fields: fields,
				primary_action_label: __('Save'),
				primary_action: (values) => {
					if (values.setup_for === 'Everyone') {
						//this.update_global_modules(d);
					} else {
						//frappe.desktop.update_user_modules(d, old_values);
					}
				}
			}); 
			d.show();
		});
		
		if(!frappe.boot.kard_settings.enable_theme)
			return;

		if(!frappe.boot.kard_settings.enable_bookmarks)
			return;
				
	},

	show_hide_cards_dialog: function() {
		let user_options = frappe.desktop.desktop_icons;
		let global_options = frappe.desktop.modules;
		let user_value = frappe.session.user;
		let fields = [
			{
				label: __('Setup For'),
				fieldname: 'setup_for',
				fieldtype: 'Select',
				options: [
					{
						label: __('User ({0})', [frappe.session.user]),
						value: user_value
					}/* ,
					{
						label: __('Everyone'),
						value: 'Everyone'
					} */
				],
				default: user_value,
				depends_on: doc => frappe.user_roles.includes('System Manager'),
				onchange() {
					let value = d.get_value('setup_for');
					let field = d.get_field('setup_for');
					let description = value === 'Everyone' ? __('Hide icons for all users') : '';
					field.set_description(description);
				}
			}
		];
		
		let user_section = [];
		let global_section = [];
		
		user_options.sort((a, b) => (a.module_name > b.module_name) ? 1 : -1)
		
		let options=  [];
		let key = "Bookmarks";
		user_options.forEach(m => {
			
			let checked = (m.hidden === 1) ? 0 : 1;
				options.push({
					'category': m.category,
					'label': m.label,
					'value': m.module_name,
					'checked': checked
				})
			
		
			
			
			
		});
		
	/* 	if(options.length > 0)
		{
			
			user_section.push(
				{
				label: key,
				fieldname: `bookmarks:${key}`,
				fieldtype: 'MultiCheck',
				options,
				columns: 2
				}
			)
		
		} */

		for(key in global_options){
		
			let modules = global_options[key];
			modules.sort((a, b) => (a.module_name > b.module_name) ? 1 : -1)
			let options=  [];

			modules.forEach(m => {
				
				if(m.blocked === 0 && m.hidden_in_standard === 0){
					let checked = (m.hidden === 1) ? 0 : 1;
					options.push({
						'category': m.category,
						'label': m.label,
						'value': m.module_name,
						'checked': checked
					})				
				}
			});
			
			if(options.length > 0)
			{
				
				user_section.push(
					{
					label: key,
					fieldname: `user:${key}`,
					fieldtype: 'MultiCheck',
					options,
					columns: 2
					}
				)
			
			}
			
		
		}

		
		user_section = [
			{
				fieldtype: 'Section Break',
				depends_on: doc => doc.setup_for === user_value
			}
		].concat(user_section);
		
		
		for(key in global_options){
		
			let modules = global_options[key];
			modules.sort((a, b) => (a.module_name > b.module_name) ? 1 : -1)
								let options=  [];

			modules.forEach(m => {
				
				if(m.blocked === 0 && m.hidden_in_standard === 0){
					let checked = (m.hidden === 1) ? 0 : 1;
					options.push({
						'category': m.category,
						'label': m.label,
						'value': m.module_name,
						'checked': checked
					})				
				}
			});
			
			if(options.length > 0)
			{
				
				global_section.push(
					{
					label: key,
					fieldname: `global:${key}`,
					fieldtype: 'MultiCheck',
					options,
					columns: 2
					}
				)
			
			}
			
		
		}

		global_section = [
			{
				fieldtype: 'Section Break',
				depends_on: doc => doc.setup_for === 'Everyone'
			}
		].concat(global_section);

		fields = fields.concat(user_section,global_section);
		
		let old_values = null;
		const d = new frappe.ui.Dialog({
			title: __('Customize Desktop'),
			fields: fields,
			primary_action_label: __('Save'),
			primary_action: (values) => {
				if (values.setup_for === 'Everyone') {
					//this.update_global_modules(d);
				} else {
					frappe.desktop.update_user_modules(d, old_values);
				}
			}
		}); 
		d.show();
		// deepcopy
		old_values = JSON.parse(JSON.stringify(d.get_values()));
	},

	update_user_modules: function(d, old_values) {
		let new_values = d.get_values();
		
		let category_map = {};

		for (let category in frappe.desktop.modules) {		
			let old_modules = [];
			
			let modules = frappe.desktop.modules[category];
			modules.forEach(m => {
				if(m.blocked === 0 && m.hidden_in_standard === 0)
					old_modules.push(m.module_name);
			});

			let new_modules = new_values[`user:${category}`] || [];
			
		
			let removed = old_modules.filter(module => !new_modules.includes(module));
			let added = new_modules.filter(module => !old_modules.includes(module));
			category_map[category] = { added, removed };

			
		}
		
		frappe.call({
			method: 'kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.update_hidden_modules',
			args: { category_map },
			btn: d.get_primary_btn()
		}).then(r => {
			// frappe.update_desktop_settings(r.message);
			d.hide();
			window.location.reload();
		});
	},
	
});



