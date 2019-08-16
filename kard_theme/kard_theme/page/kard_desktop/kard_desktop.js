frappe.provide('frappe.kard_desktop');

frappe.pages['kard-desktop'].on_page_load = function(wrapper) {
	/* var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Desktop',
		single_column: true
	});
	
	frappe.utils.set_title(__("Home")); */
	
	// load desktop
/* 	if(!frappe.list_desktop) {
		frappe.kard_desktop.set_background();
	} */
	frappe.kard_desktop.refresh(wrapper);
};


frappe.pages['kard-desktop'].on_page_show = function(wrapper) {
	/* if(frappe.list_desktop) {
		$("body").attr("data-route", "list-desktop");
	} */
};

$.extend(frappe.kard_desktop, {
	refresh: function(wrapper) {
		var me = this;
		
		if (wrapper) {
			this.wrapper = $(wrapper);
		}
		
		frappe.call({
			method: "kard_theme.kard_theme.utils.get_theme_info",
			callback: function(response) {
				me.render(response);
				me.sort_inst = me.make_sortable();
				me.sortableDisable();
			}
		});
	},

	render: function(response) {
		var me = this;
		frappe.utils.set_title(__("Desktop"));
		
		let fields = response.message[0];
		
		var desktop_icons_id = document.createElement('div');
		desktop_icons_id.setAttribute("id", "desktop-icons");
		desktop_icons_id.setAttribute("class", "icon-grid");
						
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
			+ '</div>'
							
			desktop_icons_id.innerHTML = desktop_icons_id.innerHTML + label_wrapper;

		})
		
		frappe.kard_desktop.wrapper.html(desktop_icons_id);
		
		frappe.kard_desktop.setup_module_click();

		// notifications
		/* frappe.kard_desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			me.show_pending_notifications();
		});

		$(document).trigger("desktop-render"); */

	},

	render_help_messages: function(help_messages) {
		var wrapper = frappe.kard_desktop.wrapper.find('.help-message-wrapper');
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
		frappe.kard_desktop.wiggling = false;

		if(frappe.list_desktop) {
			frappe.kard_desktop.wrapper.on("click", ".desktop-list-item", function() {
				frappe.kard_desktop.open_module($(this));
			});
		} else {
			frappe.kard_desktop.wrapper.on("click", ".app-icon, .app-icon-svg", function() {
				if ( !frappe.kard_desktop.wiggling ) {
					frappe.kard_desktop.open_module($(this).parent());
				}
			});
		}
		frappe.kard_desktop.wrapper.on("click", ".circle", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

		frappe.kard_desktop.setup_wiggle();
	},

	setup_wiggle: function() {
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1500;

		var   timer_id      = 0;
		const $cases        = frappe.kard_desktop.wrapper.find('.case-wrapper');
		const $icons        = frappe.kard_desktop.wrapper.find('.app-icon');
		const $notis        = $(frappe.kard_desktop.wrapper.find('.circle').toArray().filter((object) => {
			// This hack is so bad, I should punch myself.
			// Seriously, punch yourself.
			const text      = $(object).find('.circle-text').html();

			return text;
		}));

		const clearWiggle   = () => {
			const $closes   = $cases.find('.module-remove');
			$closes.hide();
			$notis.show();

			$icons.removeClass('wiggle');

			frappe.kard_desktop.wiggling   = false;
			frappe.kard_desktop.sortableDisable();
		};

		frappe.kard_desktop.wrapper.on('mousedown', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.kard_desktop.sortableEnable();
				
				frappe.kard_desktop.wiggling = true;
				// hide all notifications.
				$notis.hide();

				$cases.each((i) => {
					const $case    = $($cases[i]);
					const template =
					`
						<div class="circle module-remove" style="background-color:#E0E0E0; color:#212121">
							<div class="circle-text">
								<b>
									&times
								</b>
							</div>
						</div>
					`;

					$case.append(template);
					const $close  = $case.find('.module-remove');
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
		frappe.kard_desktop.wrapper.on('mouseup mouseleave', '.app-icon', () => {
			clearTimeout(timer_id);
		});

		// also stop wiggling if clicked elsewhere.
		$('body').click((event) => {
			if ( frappe.kard_desktop.wiggling ) {
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
				const $cases        = frappe.kard_desktop.wrapper.find('.case-wrapper');
				
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
		frappe.kard_desktop.sort_inst.options["sort"] = true;
		// frappe.kard_desktop.sort_inst.options["disabled"] = false;
		return false;
	},
	sortableDisable: function() {
		frappe.kard_desktop.sort_inst.options["sort"] = false;
		// frappe.kard_desktop.sort_inst.options["disabled"] = true;
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
