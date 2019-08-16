function load_desktop_shortcuts() {
	
	var wiggling = false;
	let page_desktop = document.getElementById('page-desktop');
						
	
	frappe.call({
		method: "kard_theme.kard_theme.utils.get_theme_info",
		callback: function(response) {
			
			let settings = response.message[1];
				
			
			if(!settings.enable_theme)
					return;
			
			if (page_desktop)
			{
				
				var desktop_icons_id = document.getElementById('desktop-icons');
				if (!desktop_icons_id)
				{
					desktop_icons_id = document.createElement('div');
					desktop_icons_id.setAttribute("id", "desktop-icons");
					
					if(settings.style == "Grid")
					{
						desktop_icons_id.setAttribute("class", "icon-grid");

					}
					else if(settings.style == "Horizontal")
					{
						desktop_icons_id.setAttribute("class", "icon-horizontal");
					}
					
					
					
						
				}
				else
				{
					desktop_icons_id.innerHTML = "";
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
					+ '</div>'
									
					desktop_icons_id.innerHTML = desktop_icons_id.innerHTML + label_wrapper;


				})
				
				
				if(settings.hide_default_desktop)
				{
					let default_desktop = document.getElementsByClassName('modules-page-container');
					// page_desktop.innerHTML = "";
					
					if(default_desktop)
					{
						default_desktop[0].innerHTML = '';

					}
					
				}
				else
				{
					
				}
				
				
				if(settings.location == "Top")
				{
					page_desktop.prepend(desktop_icons_id);	
						
				}
				else if(settings.location == "Bottom")
				{
					page_desktop.appendChild(desktop_icons_id);	

				}
				
				setup_module_click();
				make_sortable();
			
			}
			
			
			
			function setup_module_click() {
				wiggling = false;
				
				$( ".app-icon" ).bind( "click", function() {
					if ( !wiggling ) {
						open_module($(this).parent());
					}
				});
				
				$( ".circle" ).bind( "click", function() {
					var doctype = $(this).attr('data-doctype');
					if(doctype) {
						frappe.ui.notifications.show_open_count_list(doctype);
					}
				});

				/* desktop_icons_id.on("click", ".app-icon", function() {
					if ( !frappe.desktop.wiggling ) {
						frappe.desktop.open_module($(this).parent());
					}
				}); */
				
				/* desktop_icons_id.on("click", ".circle", function() {
					var doctype = $(this).attr('data-doctype');
					if(doctype) {
						frappe.ui.notifications.show_open_count_list(doctype);
					}
				}); */

				setup_wiggle();
			};
			
			function open_module(parent) {
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
			};
			
			function setup_wiggle() {
				// Wiggle, Wiggle, Wiggle.
				const DURATION_LONG_PRESS = 1000;

				var   timer_id      = 0;
				const $cases        = $('#desktop-icons').find('.case-wrapper');
				const $icons        = $('#desktop-icons').find('.app-icon');
				const $notis        = $($('#desktop-icons').find('.circle').toArray().filter((object) => {
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

					wiggling = false;
				};

				$('#desktop-icons').on('mousedown', '.app-icon', () => {
					timer_id     = setTimeout(() => {
						wiggling = true;
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
				$('#desktop-icons').on('mouseup mouseleave', '.app-icon', () => {
					clearTimeout(timer_id);
				});

				// also stop wiggling if clicked elsewhere.
				$('body').click((event) => {
					if ( wiggling ) {
						const $target = $(event.target);
						// our target shouldn't be .app-icons or .close
						const $parent = $target.parents('.case-wrapper');
						if ( $parent.length == 0 )
							clearWiggle();
					}
				});
				// end wiggle
			};
			
			function make_sortable() {
				if (frappe.dom.is_touchscreen()) {
					return;
				}

				new Sortable($("#desktop-icons").get(0), {
					animation: 150,
					onUpdate: function(event) {
						var new_order = [];
						$("#desktop-icons .case-wrapper").each(function(i, e) {
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
			};


		}
	});
			
	
};
 
 
 $(window).on('hashchange', function() {
	load_desktop_shortcuts();
});
 
 
$(document).ready(function() {
	// $('.modules-page-container').prepend('sdfsdf');
	//$('.navbar-header').prepend(frappe.render_template("sidebar-toggle"));

	load_desktop_shortcuts();
	
	
	
	// $('.modules-page-container').prepend(frappe.render_template("desktop_icons_id"));
	// $('header').addClass('main-header');
	// $('header .navbar').removeClass('navbar-fixed-top');
	// $('body').addClass('skin-blue sidebar-mini sidebar-collapse');	
	// $('#body_div').addClass('content-wrapper');	
	
});

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


/* $.extend(this, {
	refresh: function(wrapper) {
		if (wrapper) {
			this.wrapper = $(wrapper);
		}

		this.render();
		this.make_sortable();
	},

	render: function() {
		var me = this;
		frappe.utils.set_title(__("Desktop"));

		var template = frappe.list_desktop ? "desktop_list_view" : "desktop_icon_grid";

		var all_icons = frappe.get_desktop_icons();
		
		frappe.desktop.wrapper.html(frappe.render_template(template, {
			// all visible icons
			desktop_items: all_icons,
		}));

		frappe.desktop.setup_module_click();

		// notifications
		frappe.desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			me.show_pending_notifications();
		});

		$(document).trigger("desktop-render");

	},

	render_help_messages: function(help_messages) {
		var wrapper = frappe.desktop.wrapper.find('.help-message-wrapper');
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
		const DURATION_LONG_PRESS = 1000;

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
			const $closes   = $cases.find('.module-remove');
			$closes.hide();
			$notis.show();

			$icons.removeClass('wiggle');

			frappe.desktop.wiggling   = false;
		};

		frappe.desktop.wrapper.on('mousedown', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.desktop.wiggling = true;
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

		new Sortable($("#icon-grid").get(0), {
			animation: 150,
			onUpdate: function(event) {
				var new_order = [];
				$("#icon-grid .case-wrapper").each(function(i, e) {
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
}); */