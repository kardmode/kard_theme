frappe.provide('frappe.desktop');


$(window).on('hashchange', function() {
	
	if(!frappe.boot.kard_settings.enable_theme)
		return;
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	
	if(!route_str)
	{
		frappe.desktop.refresh();	
	}	
	else if(route[0] == "modules")
	{
		// var page = frappe.ui.pages[route_str] 
		// console.log(page);
		// page.add_action_btn(section.icon,section.label, function(){
							
							// setup_rightbar(section.items,section.icon,section.label);
						// });
	}
	
	frappe.add_to_desktop_link();

	
});
 
$(document).ready(function() {
	
	if(!frappe.boot.kard_settings.enable_theme)
		return;
	
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	if(!route_str)
	{
		frappe.desktop.refresh();		
	}
	else if(route[0] == "modules")
	{
	}
	
	frappe.add_to_desktop_link();

	
});

$(document).ajaxComplete(function() {	
	
	if(!frappe.boot.kard_settings.enable_theme)
		return;
	setTimeout(() => {  
		var ajax_state = $('body').attr('data-ajax-state');
		if(ajax_state === "complete")
		{
			var labels = $(document).find('.custom-btn-group-label');			
			var added_doctypes = false;
			var added_reports = false;
			
			labels.each((i) => {
				if(labels[i].innerText == 'DocTypes')
					added_doctypes = true;
				
				if(labels[i].innerText == 'Reports')
					added_reports = true;

			});
			
			
			var doctypes_menu;
			var reports_menu;
			if(added_doctypes === false)
			{
				let $workspace_page = frappe.pages['Workspaces']['page'];
				doctypes_menu = $workspace_page.add_custom_button_group(__('DocTypes'));
				$workspace_page.add_custom_menu_item(doctypes_menu, __("Test"), function() {
					
				});

			}
			
			if(added_reports === false)
			{
				let $workspace_page = frappe.pages['Workspaces']['page'];
				reports_menu = $workspace_page.add_custom_button_group(__('Reports'));
			}
			
			
		}
	}, 
	
	2000);
	
	
	
	
	
	
	
	if(ajax_state === "complete")
	{
		frappe.add_to_desktop_link();
	}

});
 
$.extend(frappe.desktop, {
	refresh: function(wrapper) {
		var me = this;
		
		if (wrapper) {
			this.wrapper = $(wrapper);
		}
		
		frappe.desktop.load_shortcuts(wrapper);
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
	
	setup_sidebar: function(sidebar) {
		$(sidebar).on("click", function() {
			var layout_side_section = $('.layout-side-section');
			var overlay_sidebar = layout_side_section.find('.kt-overlay-sidebar');

			overlay_sidebar.addClass('opened');
			
			
		});
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

	render_help_messages: function(help_messages) {
		var me = this;
		var wrapper = me.wrapper.find('.help-message-wrapper');
		var $help_messages = wrapper.find('.help-messages');

		var set_current_message = function(idx) {
			idx = cint(idx);
			wrapper.current_message_idx = idx;
			wrapper.find('.left-arrow, .right-arrow').addClass('disabled');
			wrapper.find('.help-message-item').addClass('hidden');
			wrapper.find('[data-message-idx="'+idx+'"]').removeClass('hidden');
			if(idx > 0) {
				wrapper.find('.left-arrow').removeClass('disabled');
			}
			if(idx < help_messages.length - 1) {
				wrapper.find('.right-arrow').removeClass('disabled');
			}
		}

		if(help_messages) {
			wrapper.removeClass('hidden');
			help_messages.forEach(function(message, i) {
				var $message = $('<div class="help-message-item hidden"></div>')
					.attr('data-message-idx', i)
					.html(frappe.render_template('desktop_help_message', message))
					.appendTo($help_messages);

			});

			set_current_message(0);

			wrapper.find('.close').on('click', function() {
				wrapper.addClass('hidden');
			});
		}

		wrapper.find('.left-arrow').on('click', function() {
			if(wrapper.current_message_idx) {
				set_current_message(wrapper.current_message_idx - 1);
			}
		})

		wrapper.find('.right-arrow').on('click', function() {
			if(help_messages.length > wrapper.current_message_idx + 1) {
				set_current_message(wrapper.current_message_idx + 1);
			}
		});

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
					
					console.log(m)
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

	set_background: function() {
		frappe.ui.set_user_background(frappe.boot.user.background_image, null,
			frappe.boot.user.background_style);
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
	}
});

frappe.get_desktop_icons = function(show_hidden, show_global) {
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
};



frappe.add_to_desktop = function(label, doctype, report) {
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
};

frappe.add_to_desktop_link = function() {
	
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	var type = '';
	var doctype = '';
	var label = '';
	var report = '';
	
	var toolbar = document.getElementById('toolbar-user');		

	if(!toolbar)
		return;
	
	let new_link = document.getElementById('add-to-desktop');
	if(!new_link)
	{
		new_link = document.createElement('li');
		new_link.setAttribute('id','add-to-desktop');
		$(new_link).addClass("hide");
		toolbar.prepend(new_link);
	}
	
	$(new_link).addClass("hide");
	$(new_link).unbind();

	
	if(!frappe.boot.kard_settings.enable_theme)
		return;

	if(!frappe.boot.kard_settings.enable_bookmarks)
		return;

	
	if(!route_str) {
		
		new_link.innerHTML = '<a>'+__("Customize Desktop")+'</a>';
		$(new_link).on("click", function() {
					
			frappe.show_hide_cards_dialog();
		});
		$(new_link).removeClass("hide");
	
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
	// else if (route[0] === 'modules') {
		// type = route[0];
		// label = route[1];
	// }
	// else if (route[0] === 'dashboard') {
		// type = route[0];
		// label = route[1];
		// $(new_link).removeClass("hide");
	// }
	else
	{
		return;
	}
	
	if(!frappe.boot.kard_settings.enable_bookmarks)
		return;
	
	$(new_link).removeClass("hide");
	new_link.innerHTML = '<a>'+__("Add To Desktop")+'</a>';

	
	var msg = 'Add '+label+' To Desktop?';
	$(new_link).on("click", function() {
					
		frappe.confirm(__(msg), 
			function() {
				frappe.add_to_desktop(label,doctype,report);
			}
		)
	});
				
};

frappe.setup_module_rightbar = function(items,icon,title) {
	var layout_side_section = $('.layout-side-section.layout-right');
	layout_side_section.empty();
	
	var section_style = '';
	if(icon)
		section_style = 'margin-left:5px;';
	section_style = 'font-size:larger;';
	var $group = $('<div class="list-sidebar overlay-rightbar">').appendTo(layout_side_section);
	var $groupul = $('<ul class="list-unstyled sidebar-menu standard-actions"><li><div><span style="'+section_style+'" class="">' + title + '</span></div></li><li class="divider"></li>').appendTo($group);
	
	
	
	items.forEach(function(item) {
		var label = item.label || item.name;
		var style = '';
		if(item.icon)
			style = 'margin-left:5px;';
		var $li = $('<li class="list-sidebar-item"><a class="list-sidebar-link" href="'+ "#"+item.route +'"><i class="'+item.icon+'"></i><span style="'+style+'">'+ label +'</span></a></li>');
		$li.appendTo($groupul);
	});
	
	var overlay_sidebar = layout_side_section.find('.overlay-rightbar');

	overlay_sidebar.addClass('opened');
	overlay_sidebar.find('.reports-dropdown')
		.removeClass('dropdown-menu')
		.addClass('list-unstyled');
	overlay_sidebar.find('.kanban-dropdown')
		.removeClass('dropdown-menu')
		.addClass('list-unstyled');
	overlay_sidebar.find('.dropdown-toggle')
		.addClass('text-muted').find('.caret')
		.addClass('hidden-xs hidden-sm');

	var close_sidebar_div = $('.close-sidebar');
	var fadespeed = 50;
	if (close_sidebar_div.length !== 0)
	{
		close_sidebar_div.hide().fadeIn(fadespeed);
	}
	else{
		//$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn(fadespeed);
	}
	

	var scroll_container = $('html');
	scroll_container.css("overflow-y", "hidden");

	close_sidebar_div.on('click', close_sidebar);
				close_sidebar_div.on('touchmove', function (e) { e.preventDefault(); }); 

	layout_side_section.on("click", "a", close_sidebar);

	function close_sidebar(e) {
		scroll_container.css("overflow-y", "");

					close_sidebar_div.fadeOut(50,function() {
			overlay_sidebar.removeClass('opened')
				.find('.dropdown-toggle')
				.removeClass('text-muted');
			overlay_sidebar.find('.reports-dropdown')
				.addClass('dropdown-menu');
			overlay_sidebar.find('.kanban-dropdown')
				.addClass('dropdown-menu');
				
		});
	}
};

frappe.show_hide_cards_dialog = function() {
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
				frappe.update_user_modules(d, old_values);
			}
		}
	}); 
	d.show();
	// deepcopy
	old_values = JSON.parse(JSON.stringify(d.get_values()));
};


frappe.update_user_modules = function(d, old_values) {
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
};


function navigationType(){

    var result;
    var p;

    if (window.performance.navigation) {
        result=window.performance.navigation;
        if (result==255){result=4} // 4 is my invention!
    }

    if (window.performance.getEntriesByType("navigation")){
       p=window.performance.getEntriesByType("navigation")[0].type;

       if (p=='navigate'){result=0}
       if (p=='reload'){result=1}
       if (p=='back_forward'){result=2}
       if (p=='prerender'){result=3} //3 is my invention!
    }
    return result;
}
	