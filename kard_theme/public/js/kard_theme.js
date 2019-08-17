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



$( document ).ajaxComplete(function() {
	
	var toolbar = document.getElementById('toolbar-user');		
	if(toolbar)
	{
		frappe.add_to_desktop_link(toolbar);
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
		
		
		if(settings.enable_module_sidebar)
		{
			let sidebar_html = '<div id="desktop-sidebar" class="col-md-3 layout-side-section layout-left">'
			+ '<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">'
			
			let modules = response.message[2];
			modules.forEach(m => {
				if (m.hidden === 1 || m.blocked ===1) { return; }
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
				sidebar_html = sidebar_html + module_link;
				
			});
			
			sidebar_html = sidebar_html + '</ul></div>';
			frappe.desktop.container_wrapper.innerHTML = sidebar_html;
			$(new_container_div).addClass("col-md-9");
		}		
	
		
		var desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-icons");
		
		if(settings.style == "Grid")
		{
			desktop_icons_id.setAttribute("class", "icon-grid");
		}
		else if(settings.style == "Horizontal")
		{
			desktop_icons_id.setAttribute("class", "icon-horizontal");
		}
					
		let fields = response.message[0];				
		fields.forEach(item => {
			if (item.hidden === 1 || item.blocked ===1) { return; }
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
			+ '<div class="circle" data-doctype="" style="display: none;"><span class="circle-text"></span></div>'
			+ '<span class="case-label-text">' + item.label + '</span>' 
			+ '</div>'
			+ '<div class="circle hide module-remove" style="background-color:#E0E0E0; color:#212121"><div class="circle-text"><b>&times</b></div></div>'
			+ '</div>';
							
			desktop_icons_id.innerHTML = desktop_icons_id.innerHTML + label_wrapper;

		})
		
		
		
		if(default_desktop)
		{
			
			if(settings.hide_default_desktop)
			{
			}
			else
			{
				new_container_div.prepend(default_desktop[0]);
			}
		}
		
		
		
		
		if(settings.location == "Top")
		{			
			new_container_div.prepend(desktop_icons_id);			
		}
		else if(settings.location == "Bottom")
		{
			new_container_div.appendChild(desktop_icons_id);	
		}
		
		frappe.desktop.container_wrapper.appendChild(new_container_div);
		
		frappe.desktop.wrapper = $(desktop_icons_id);

		frappe.desktop.setup_module_click();

		// notifications
		/* frappe.desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			frappe.desktop.show_pending_notifications();
		});

		$(document).trigger("desktop-render"); */

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

	setup_module_click: function() {
		frappe.desktop.wiggling = false;

		if(frappe.list_desktop) {
			frappe.desktop.wrapper.on("click", ".desktop-list-item", function() {
				frappe.desktop.open_module($(this));
			});
		} else {
			frappe.desktop.wrapper.on("click", ".app-icon, .app-icon-svg", function() {
				if ( !frappe.desktop.wiggling ) {
					frappe.desktop.open_module($(this).parent());
				}
			});
		}
		frappe.desktop.wrapper.on("click", ".circle", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

		frappe.desktop.setup_wiggle();
	},

	setup_wiggle: () => {
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1200;

		var   timer_id      = 0;
		const $cases        = frappe.desktop.wrapper.find('.case-wrapper');
		const $icons        = frappe.desktop.wrapper.find('.app-icon');
		const $notis        = $(frappe.desktop.wrapper.find('.circle').toArray().filter((object) => {
			// This hack is so bad, I should punch myself.
			// Seriously, punch yourself.
			const text      = $(object).find('.circle-text').html();

			return text;
		}));
		
		const clearWiggle   = () => {
			const $cases        = frappe.desktop.wrapper.find('.case-wrapper');
			const $icons        = frappe.desktop.wrapper.find('.app-icon');
			const $notis        = $(frappe.desktop.wrapper.find('.circle').toArray().filter((object) => {
				const text      = $(object).find('.circle-text').html();
				return text;
			}));
			
			const $closes    = frappe.desktop.wrapper.find('.module-remove');
	
			// $closes.hide();			
			$closes.addClass('hide');

			// $notis.show();
			$icons.removeClass('wiggle');
			
			frappe.desktop.wiggling   = false;
			frappe.desktop.sortableDisable();
			
		};

		frappe.desktop.wrapper.on('mousedown', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.desktop.sortableEnable();
				
				frappe.desktop.wiggling = true;
				// hide all notifications.
				// $notis.hide();

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
		frappe.desktop.wrapper.on('mouseup mouseleave', '.app-icon', () => {
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

	open_module: function(parent) {
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

	make_sortable: function() {
		if (frappe.dom.is_touchscreen() || frappe.list_desktop) {
			return;
		}
		
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
		frappe.desktop.sort_inst.options["sort"] = true;
		// me.sort_inst.options["disabled"] = false;
		return false;
	},
	sortableDisable: function() {
		frappe.desktop.sort_inst.options["sort"] = false;
		// me.sort_inst.options["disabled"] = true;
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
			if(m.module_name==='Learn') {
				// no permissions necessary for learn
				out = true;
			} else if(m.module_name==='Setup' && frappe.user.has_role('System Manager')) {
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
	for (var i=0, l=frappe.boot.desktop_icons.length; i < l; i++) {
		m = frappe.boot.desktop_icons[i];
		if ((['Setup', 'Core'].indexOf(m.module_name) === -1) && show_module(m)) {
			add_to_out(m);
		}
	}

	if(frappe.user_roles.includes('System Manager')) {
		m = frappe.get_module('Setup');
		if(show_module(m)) add_to_out(m);
	}

	if(frappe.user_roles.includes('Administrator')) {
		m = frappe.get_module('Core');
		if(show_module(m)) add_to_out(m);
	}

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
			
			
			
			
			$('<a>'+__("Add To Desktop")+'</a>')
			.appendTo(new_link)
			.on("click", function() {
				frappe.confirm(__("Add To Desktop"), 
					function() {
						
						console.log(type);
						console.log(label);
						// frappe.add_to_desktop(label, type);
					}
				)
			})
			
			toolbar.prepend(new_link);
			// console.log(window.cur_page);
			
			/* this.page.add_menu_item(__('Add to Desktop'), function () {
				frappe.add_to_desktop(me.frm.doctype, me.frm.doctype);
			}, true); */
		}
		
	};
	