frappe.provide('frappe.desktop');

$(window).on('hashchange', function() {
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	if(!route_str)
	{
		frappe.desktop.load_shortcuts();	
	}	
	else if(route[0] == "modules")
	{
		// var page = frappe.ui.pages[route_str] 
		// console.log(page);
		// page.add_action_btn(section.icon,section.label, function(){
							
							// setup_rightbar(section.items,section.icon,section.label);
						// });
	}
});
 
$(document).ready(function() {
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	if(!route_str)
	{
		frappe.desktop.load_shortcuts();		
	}
	else if(route[0] == "modules")
	{
		// var page = frappe.ui.pages[route_str] 
		// console.log(page);
		// page.add_action_btn(section.icon,section.label, function(){
							
							// setup_rightbar(section.items,section.icon,section.label);
						// });
	}
});



$(document).ajaxComplete(function() {
	var ajax_state = $('body').attr('data-ajax-state');
	
	if(ajax_state === "complete")
	{
		var toolbar = document.getElementById('toolbar-user');		
		if(toolbar)
		{
			frappe.add_to_desktop_link(toolbar);
		}
	}
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	if(!route_str)
	{
		// frappe.desktop.load_shortcuts();		
	}
	

});
 
$.extend(frappe.desktop, {
	
	load_shortcuts: function(wrapper) {
		
		var wrapper = document.getElementById('page-desktop');
		if(wrapper){
			this.container_wrapper = $(wrapper).find('.container')[0];
		}
		else
		{
			return;
		}			
		
		// if(!frappe.boot.kard_settings.enable_theme)
			// return;
		
		var check_wrapper = document.getElementById('layout-main-section');
		if (!check_wrapper)
		{
			frappe.call({
				method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_theme_info",
				callback: function(response) {
					
					let settings = response.message[0];
					if(!settings.enable_theme)
						return;
					
					frappe.desktop.render(response.message[0],response.message[1],response.message[2]);
										
				}
			});
				// frappe.desktop.render(frappe.boot.kard_settings,frappe.boot.kard_user_icons,frappe.boot.kard_standard_icons);

			
		}
	},

	render: function(settings,user_icons,standard_icons) {
		var me = this;
		frappe.utils.set_title(__("Desktop"));

				
		new_container_div = document.createElement('div');
		new_container_div.setAttribute("id", "layout-main-section");
		$(new_container_div).addClass("layout-main-section-wrapper");
		
		frappe.desktop.desktop_icons = user_icons;		
		frappe.desktop.modules = standard_icons;		
		frappe.desktop.sort_inst = [];
		
	
		
		if(settings.enable_bookmarks)
		{
			let desktop_icons_id = frappe.desktop.render_user_desktop_icons(frappe.desktop.desktop_icons);
			new_container_div.appendChild(desktop_icons_id);	
			frappe.desktop.setup_user_bookmark_click( $(desktop_icons_id));
			frappe.desktop.setup_wiggle($(desktop_icons_id));
			// frappe.desktop.sort_inst.push(frappe.desktop.make_sortable($(desktop_icons_id).get(0)));			
		}
		
		if(settings.enable_module_header == 1)
		{
			let newNode = frappe.desktop.render_module_desktop_icons(frappe.desktop.modules);
			new_container_div.appendChild(newNode);
			frappe.desktop.setup_module_click($(newNode));
			// frappe.desktop.setup_wiggle($(newNode));
			// frappe.desktop.sort_inst.push(frappe.desktop.make_sortable($(newNode).get(0)));			
						
			var overlay_sidebar = document.createElement('div');
			overlay_sidebar.setAttribute("id", "overlay-sidebar");
			overlay_sidebar.setAttribute("class", "hide layout-side-section layout-right overlay-rightbar");
			
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
		// new_container_div.appendChild(div_clearfix);
		frappe.desktop.container_wrapper.prepend(div_clearfix);

		frappe.desktop.container_wrapper.prepend(new_container_div);
		if(settings.enable_module_sidebar)
		{
			let sidebar_icons_id = frappe.desktop.render_module_sidebar(frappe.desktop.modules);
			frappe.desktop.container_wrapper.prepend(sidebar_icons_id);	
			// frappe.desktop.setup_user_bookmark_click( $(sidebar_icons_id));
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
		
		setTimeout(function(){ if(settings.hide_default_desktop == 1)
		{
			$('#page-desktop').find('.modules-page-container').addClass("hide");
		}
		else
		{
			
			$('#page-desktop').find('.modules-page-container').removeClass("hide");
		} }, 500);

		
		
	},
	
	setup_sidebar: function(sidebar) {
		$(sidebar).on("click", function() {
			var layout_side_section = $('.layout-side-section');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			overlay_sidebar.addClass('opened');
			
			
		});
	},
	
	render_user_desktop_icons: function(modules) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-icons");
		
		let title = document.createElement('div');
		title.setAttribute("class", "h6 uppercase");
		title.innerHTML = "Bookmarks";

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
		
		desktop_icons_id.prepend(icon_grid);
		desktop_icons_id.prepend(title);
		
		if(addedIcons === false)
		{
			let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			msg.innerHTML = "No Bookmarks Added"
			desktop_icons_id.appendChild(msg);
			
		}
			
		
		return desktop_icons_id;
	
	},
	
	render_module_sidebar: function(modules) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-sidebar");
		$(desktop_icons_id).addClass("col-md-3 layout-side-section layout-left");
		
		let ul_wrapper = document.createElement('ul');
		$(ul_wrapper).addClass("module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked");

		
		let sidebar_html = '<div id="desktop-sidebar" class="col-md-3 layout-side-section layout-left">'
			+ '<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">'
			
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
			+ '<i class="fa fa-chevron-right pull-right" style="display: none;"></i>'
			+ '<span class="sidebar-icon" style="background-color: '+ m.color + '"><i class="'+ m.icon + '"></i></span>'
			+ '<span class="ellipsis">'+ m.label + '</span>'
			+ '</a>'
			+ '</li>';

			ul_wrapper.innerHTML = ul_wrapper.innerHTML + label_wrapper;
			
		});
		
		desktop_icons_id.prepend(ul_wrapper);
		return desktop_icons_id;
	},
	
	render_module_desktop_icons: function(modules) {
		
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-modules");
				
		let title = document.createElement('div');
		title.setAttribute("class", "h6 uppercase");
		title.innerHTML = "Modules";
		
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
		
		desktop_icons_id.prepend(icon_grid);
		desktop_icons_id.prepend(title);
		
		if(addedIcons === false)
		{
			let msg = document.createElement('div');
			// msg.setAttribute("class", "h6 uppercase");
			msg.innerHTML = "No Bookmarks Added";

			desktop_icons_id.appendChild(msg);
			
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
		
	/* 	var scroll_container = document.getElementsByClassName("content page-container")[0]
		scroll_container.setAttribute('style','overflow-y:hidden;overscroll-behavior:none;');
 */
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
		
		
		var module = frappe.get_module(parent.attr("data-name"));
		var overlay_sidebar = document.getElementById("overlay-sidebar");
		if(overlay_sidebar)
		{
			overlay_sidebar.innerHTML = "";
			let ul_element = document.createElement("ul");
			let li_element = document.createElement("li");
			li_element.setAttribute("class", "h2 uppercase");
			li_element.innerHTML = module.label;	
			
			
			ul_element.appendChild(li_element);
			ul_element.setAttribute('class','nav nav-pills nav-stacked')
			
			frappe.call({
				method: "kard_theme.kard_theme.doctype.kard_theme_settings.kard_theme_settings.get_module_info",
				args: {
						'module': parent.attr("data-name"),
					},
				callback: function(response) {
					
					var sections = response.message;
					
					sections.forEach(e => {
						
						let li_element = document.createElement("li");
						li_element.setAttribute("class", "h4");
						li_element.innerHTML = e.label;	
						ul_element.appendChild(li_element);
						
						var obj = e.items;
						
						obj.forEach(e => {
						
							let li_element = document.createElement("li");
							li_element.setAttribute("class", "h6");
							
							let link = 'modules/' + e.name;
							li_element.innerHTML = '<a href="'+link+'">'+ e.name+'</a>';	
						
						
							ul_element.appendChild(li_element);
							
							
						})
						
						
					})
					
					overlay_sidebar.appendChild(ul_element);
			
					$(overlay_sidebar).addClass("opened");
					
					
				}
			});
			
			
			
			
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
			}
		});
	},
	
	sortableEnable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		for (var i=0, l=frappe.desktop.sort_inst.length; i < l; i++) {
			frappe.desktop.sort_inst[i].options["sort"] = true;
		}
	
		return false;
	},
	sortableDisable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		
		for (var i=0, l=frappe.desktop.sort_inst.length; i < l; i++) {
			frappe.desktop.sort_inst[i].options["sort"] = false;
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

frappe.add_to_desktop_link = function(toolbar) {
	let route_str = frappe.get_route_str();
	let route = route_str.split('/');
	var type = '';
	var label = '';
	var report = '';

	if(toolbar)
	{
		let new_link = document.getElementById('add-to-desktop');
		if(new_link)
		{
			$(new_link).addClass("hide");
		}
		else
		{
			new_link = document.createElement('li');
			new_link.setAttribute('id','add-to-desktop');
			$(new_link).addClass("hide");
			
			
		
			$('<a>'+__("Add To Desktop")+'</a>').appendTo(new_link);
			
			toolbar.prepend(new_link);
		}
		
		
		
		
		if (route[0] === 'List') {
			type = route[0];
			label = route[1];
			
			$(new_link).removeClass("hide");
		}
		else if (route[0] === 'Form') {
			type = route[0];
			label = route[1];
			
			if(frappe.model.is_single(label)) {
				$(new_link).removeClass("hide");
			} 
			
			
		}
		else if (route[2] === 'Report') {
			type = route[2];
			// label = route[1];
			report = route[1];
			$(new_link).removeClass("hide");
		}
		else if (route[0] === 'query-report') {
			type = route[0];
			// label = route[1];
			report = route[1];
			$(new_link).removeClass("hide");
		}
		// else if (route[0] === 'modules') {
			// type = route[0];
			// label = route[1];
		// }
		// else if (route[0] === 'dashboard') {
			// add_to_desktop_link(route[0],route[1]);
		// }
		else
		{
	
		}
		
		
		var msg = 'Add '+label+' To Desktop?';
		$(new_link).unbind();
		$(new_link).on("click", function() {
			
		console.log(label);
			
			frappe.confirm(__(msg), 
				function() {
					frappe.add_to_desktop(label,label,report);
				}
			)
		});
		
	}
		
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
	
	