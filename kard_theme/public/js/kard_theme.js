frappe.provide('frappe.desktop');

$(window).on('hashchange', function() {
	let route_str = frappe.get_route_str();
	if(!route_str)
	{
		var wrapper = document.getElementById('page-desktop');
		if(wrapper){
			frappe.desktop.load_shortcuts(wrapper);		
		}
	}	
	
});
 
$(document).ready(function() {
	let route_str = frappe.get_route_str();
	if(!route_str)
	{
		var wrapper = document.getElementById('page-desktop');
		if(wrapper){
			frappe.desktop.load_shortcuts(wrapper);		
		}
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
	
	
});
 
$.extend(frappe.desktop, {
	
	load_shortcuts: function(wrapper) {
				
		var container_wrapper = $(wrapper).find('.container')[0];
		this.container_wrapper = container_wrapper;
		
		frappe.call({
			method: "kard_theme.kard_theme.utils.get_theme_info",
			callback: function(response) {
				frappe.desktop.render(response);
				frappe.desktop.sort_inst = frappe.desktop.make_sortable();
				frappe.desktop.sortableDisable();
			}
		});
		
	},

	render: function(response) {
		var me = this;
		frappe.utils.set_title(__("Desktop"));

		let settings = response.message[1];
			
		if(!settings.enable_theme)
			return;
		
		var default_desktop = $(frappe.desktop.container_wrapper).find('.modules-page-container');

		frappe.desktop.container_wrapper.innerHTML = "";		
		
		new_container_div = document.createElement('div');
		new_container_div.setAttribute("id", "layout-main-section");
		$(new_container_div).addClass("layout-main-section-wrapper");
		
		var modules = response.message[2];
		frappe.desktop.desktop_icons = response.message[0];		

		
		if(settings.enable_module_sidebar)
		{
			frappe.desktop.container_wrapper.prepend(frappe.desktop.render_module_sidebar(frappe.desktop.desktop_icons));
			$(new_container_div).addClass("col-md-9");
		}		
		
		
		
		if(default_desktop)
		{
			
			if(settings.hide_default_desktop)
			{
			}
			else
			{
				if(default_desktop[0])
					new_container_div.prepend(default_desktop[0]);
			}
		}
		
		var desktop_icons_id = frappe.desktop.render_user_desktop_icons(frappe.desktop.desktop_icons,settings.style);
				
		if(settings.location == "Top")
		{			
			new_container_div.prepend(desktop_icons_id);			
		}
		else if(settings.location == "Bottom")
		{
			new_container_div.appendChild(desktop_icons_id);	
		}
		
		if(settings.enable_module_header)
		{
			let newNode = frappe.desktop.render_module_desktop_icons(frappe.desktop.desktop_icons);
			desktop_icons_id.parentNode.insertBefore(newNode, desktop_icons_id.nextSibling);
			frappe.desktop.setup_module_click(newNode);
			
			var overlay_sidebar = document.createElement('div');
			overlay_sidebar.setAttribute("id", "overlay-sidebar");
			overlay_sidebar.setAttribute("class", "hide layout-side-section layout-right overlay-rightbar");
			
			var close_sidebar_wrapper = document.createElement('div');
			close_sidebar_wrapper.setAttribute("id", "close-sidebar");
			close_sidebar_wrapper.setAttribute("class", "hide");
			
			// new_container_div.appendChild(overlay_sidebar);
			desktop_icons_id.parentNode.insertBefore(overlay_sidebar, new_container_div.nextSibling);			
			desktop_icons_id.parentNode.insertBefore(close_sidebar_wrapper, new_container_div.nextSibling);			
			
			

			$(close_sidebar_wrapper).on('click', close_sidebar);
			// overlay_sidebar.on("click", "a:not(.dropdown-toggle)", close_sidebar);

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
		

		
		
		
		frappe.desktop.container_wrapper.appendChild(new_container_div);
		
		frappe.desktop.wrapper = $(desktop_icons_id);

		frappe.desktop.setup_user_bookmark_click();
		

		// notifications
		frappe.desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			frappe.desktop.show_pending_notifications();
		});

		//$(document).trigger("desktop-render");

	},
	
	setup_sidebar: function(sidebar) {
		$(sidebar).on("click", function() {
			var layout_side_section = $('.layout-side-section');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			overlay_sidebar.addClass('opened');
			

			
		});
	},
	
	render_user_desktop_icons: function(modules,style) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-icons");
		
		let title = document.createElement('div');
		title.setAttribute("class", "h6 uppercase");
		title.innerHTML = "Bookmarks";


		
		if(style == "Grid")
		{
			desktop_icons_id.setAttribute("class", "icon-grid");
		}
		else if(style == "Horizontal")
		{
			desktop_icons_id.setAttribute("class", "icon-horizontal");
		}
					
		var addedIcons =false;	
		modules.forEach(item => {
			if (item.hidden === 1 || item.blocked ===1 || item.type ==="module") { return; }
			if(!item.route) {
				if(item.link) {
					item.route=strip(item.link, "#");
				}
				else if(item.type==="doctype") {
					if(frappe.model.is_single(item._doctype)) {
						item.route = 'Form/' + item._doctype;
					} else {
						item.route="List/" + item._doctype;
					}
				}
				else if(item.type==="query-report") {
					item.route="query-report/" + item.module_name;
				}
				else if(item.type==="report") {
					item.route="List/" + item.doctype + "/Report/" + item.module_name;
				}
				else if(item.type==="page") {
					item.route=item.module_name;
				}
				else if(item.type==="module") {
					item.route="modules/" + item.module_name;
				}
			}
			
		
			
			
			let label_wrapper = '<div class="case-wrapper" title="'+item.label+'" data-name="'+item.module_name+'" data-link="'+item.route+'">'
			+ '<div class="app-icon" style="background-color:'+ item.color +'"><i class="'+item.icon+'"></i></div>'
			+ '<div class="case-label ellipsis">'
			+ '<div class="circle module-notis hide" data-doctype="'+item.module_name+'"><span class="circle-text"></span></div>'
			+ '<span class="case-label-text">' + item.label + '</span>' 
			+ '</div>'
			+ '<div class="circle hide module-remove"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>';
							
			desktop_icons_id.innerHTML = desktop_icons_id.innerHTML + label_wrapper;
			addedIcons = true;
		})
		
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
	
	render_module_sidebar: function(modules) {
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-sidebar");
		$(desktop_icons_id).addClass("col-md-3 layout-side-section layout-left");
		
		let ul_wrapper = document.createElement('ul');
		$(ul_wrapper).addClass("module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked");

		
		let sidebar_html = '<div id="desktop-sidebar" class="col-md-3 layout-side-section layout-left">'
			+ '<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">'
			
		modules.forEach(m => {
			if (m.hidden === 1 || m.blocked ===1 || m.type !== 'module') { return; }
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
			let module_link = '<li class="strong module-sidebar-item">'
			+ '<a class="module-link" data-name="'+ m.module_name + '" href="'+ m.route + '">'
			+ '<i class="fa fa-chevron-right pull-right" style="display: none;"></i>'
			+ '<span class="sidebar-icon" style="background-color: '+ m.color + '"><i class="'+ m.icon + '"></i></span>'
			+ '<span class="ellipsis">'+ m.label + '</span>'
			+ '</a>'
			+ '</li>';
			ul_wrapper.innerHTML = ul_wrapper.innerHTML + module_link;
			
		});
		
		desktop_icons_id.prepend(ul_wrapper);
		return desktop_icons_id;
	},
	
	render_module_desktop_icons: function(modules) {
		
		let desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-modules");
		$(desktop_icons_id).addClass("icon-grid");
				
		let title = document.createElement('div');
		title.setAttribute("class", "h6 uppercase");
		title.innerHTML = "Modules";
		
		var addedIcons = false;
		modules.forEach(m => {
			if (m.hidden === 1 || m.blocked ===1 || m.type !=="module") { return; }
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
			
			let module_link = '<div class="case-wrapper" title="'+m.label+'" data-name="'+m.module_name+'" data-link="'+m.route+'">'
			+ '<div class="app-icon" style="background-color:'+ m.color +'"><i class="'+m.icon+'"></i></div>'
			+ '<div class="case-label ellipsis">'
			+ '<div class="circle module-notis hide" data-doctype="'+m.module_name+'"><span class="circle-text"></span></div>'
			+ '<span class="case-label-text">' + m.label + '</span>' 
			+ '</div>'
			+ '<div class="circle hide module-remove" style="background-color:#E0E0E0; color:#212121"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>';
			desktop_icons_id.innerHTML = desktop_icons_id.innerHTML + module_link;
			addedIcons = true;
		});
		
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

	setup_user_bookmark_click: function() {
		frappe.desktop.wiggling = false;

		if(frappe.list_desktop) {
			frappe.desktop.wrapper.on("click", ".desktop-list-item", function() {
				frappe.desktop.open_user_shortcut($(this));
			});
		} else {
			frappe.desktop.wrapper.on("click", ".app-icon, .app-icon-svg", function() {
				if ( !frappe.desktop.wiggling ) {
					frappe.desktop.open_user_shortcut($(this).parent());
				}
			});
		}
		frappe.desktop.wrapper.on("click", ".circle .modile-notis", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

		frappe.desktop.setup_wiggle();
	},
	
	setup_module_click: function(wrapper) {
		frappe.desktop.wiggling = false;

		if(frappe.list_desktop) {
			$(wrapper).on("click", ".desktop-list-item", function() {
				frappe.desktop.open_module($(this));
			});
		} else {
			$(wrapper).on("click", ".app-icon, .app-icon-svg", function() {
				if ( !frappe.desktop.wiggling ) {
					
					frappe.desktop.open_module($(this).parent());
				}
			});
		}
		
		
		
		
		/* wrapper.on("click", ".circle .modile-notis", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		}); */

		// frappe.desktop.setup_wiggle();
	},

	setup_wiggle: () => {
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1200;

		var   timer_id      = 0;
		const $cases        = frappe.desktop.wrapper.find('.case-wrapper');
		const $icons        = frappe.desktop.wrapper.find('.app-icon');
		
		const clearWiggle   = () => {
			const $cases        = frappe.desktop.wrapper.find('.case-wrapper');
			const $icons        = frappe.desktop.wrapper.find('.app-icon');
			let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
				const text      = $(object).find('.circle-text').html();
				
				if(text)
					return object;
				else
					return null;
			}));
			
			const $closes    = frappe.desktop.wrapper.find('.module-remove');
	
			// $closes.hide();			
			$closes.addClass('hide');

			// $notis.show();
			$notis.removeClass('hide');
			$icons.removeClass('wiggle');
			
			frappe.desktop.wiggling   = false;
			frappe.desktop.sortableDisable();
			
		};
			
		
		
		frappe.desktop.wrapper.on('mousedown touchstart', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.desktop.sortableEnable();
				
				frappe.desktop.wiggling = true;
				// hide all notifications.
				let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
					const text      = $(object).find('.circle-text').html();
					
					if(text)
						return object;
					else
						return null;
				}));
				
				
				
				// $notis.hide();
				$notis.addClass('hide');
				
				$cases.each((i) => {
					const $case    = $($cases[i]);
					

					const $close  = $case.find('.module-remove');
					// $close.show();
					$close.removeClass('hide');
					const name    = $case.attr('title');
					$close.click(() => {
						// good enough to create dynamic dialogs?
						const dialog = new frappe.ui.Dialog({
							title: __(`Hide ${name}?`)
						});
						dialog.set_primary_action(__('Hide'), () => {
							frappe.call({
								method: 'frappe.desk.doctype.desktop_icon.desktop_icon.hide',
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
		frappe.desktop.wrapper.on('mouseup mouseleave touchend', '.app-icon', () => {
			clearTimeout(timer_id);
		});
		
		

		// also stop wiggling if clicked elsewhere.
		$('body').click((event) => {
			if ( frappe.desktop.wiggling ) {
				const $target = $(event.target);
				// our target shouldn't be .app-icons or .close
				const $parent = $target.parents('.case-wrapper');
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
			console.log(module);
			let ul_element = document.createElement("ul");
			let li_element = document.createElement("li");
			li_element.setAttribute("class", "h2 uppercase");
			li_element.innerHTML = module.label;	
			
			
			ul_element.appendChild(li_element);
			ul_element.setAttribute('class','nav nav-pills nav-stacked')
			
			frappe.call({
				method: "kard_theme.kard_theme.utils.get_module_info",
				args: {
						'module': parent.attr("data-name"),
					},
				callback: function(response) {
					console.log(response);
					
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

	make_sortable: function() {
		/* if (frappe.dom.is_touchscreen() || frappe.list_desktop) {
			return;
		}
		 */
		return new Sortable($("#desktop-icons").get(0), {
			animation: 150,
			onUpdate: function(event) {
				var new_order = [];
				
				const $cases        = frappe.desktop.wrapper.find('.case-wrapper');

				$cases.each(function(i, e) {
					new_order.push($(this).attr("data-name"));
				});
				
				frappe.call({
					method: 'frappe.desk.doctype.desktop_icon.desktop_icon.set_order',
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
		
		
		frappe.desktop.sort_inst.options["sort"] = true;
		return false;
	},
	sortableDisable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		
		frappe.desktop.sort_inst.options["sort"] = false;
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
		method: 'frappe.desk.doctype.desktop_icon.desktop_icon.add_user_icon',
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
		
		
		if (route[0] === 'List') {
			type = route[0];
			label = route[1];
		}
		else if (route[0] === 'Form') {
			type = route[0];
			label = route[1];
			
			if(!frappe.model.is_single(label)) {
				let new_link = document.getElementById('add-to-desktop');
				if(new_link)
				{
					new_link.outerHTML = '';
				}
				
				return;
			} 
			
			
		}
		// else if (route[2] === 'Report') {
			// add_to_desktop_link(route[2],route[1]);
		// }
		// else if (route[0] === 'query-report') {
			// add_to_desktop_link(route[0],route[1]);
		// }
		// else if (route[0] === 'modules') {
			// type = route[0];
			// label = route[1];
		// }
		// else if (route[0] === 'dashboard') {
			// add_to_desktop_link(route[0],route[1]);
		// }
		else
		{
			let new_link = document.getElementById('add-to-desktop');
			if(new_link)
			{
				new_link.outerHTML = '';
			}
			
			return;
		}		
		
				

		if(toolbar)
		{
			let new_link = document.getElementById('add-to-desktop');
			if(new_link)
			{
				new_link.innerHTML = '';
			}
			else
			{
				new_link = document.createElement('li');
				new_link.setAttribute('id','add-to-desktop');
			}
			
			
			var msg = 'Add '+label+' To Desktop?';
			
			$('<a>'+__("Add To Desktop")+'</a>')
			.appendTo(new_link)
			.on("click", function() {
				frappe.confirm(__(msg), 
					function() {
						frappe.add_to_desktop(label,label);
					}
				)
			})
			
			toolbar.prepend(new_link);
			
		}
		
	};
	