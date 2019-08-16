function load_desktop_shortcuts() {
	
	
	let page_desktop = document.getElementById('page-desktop');
						
	
	frappe.call({
		method: "kard_theme.kard_theme.utils.get_theme_info",
		callback: function(response) {
			
			let settings = response.message[1];
				
			
			if(!settings.enable_theme)
					return;
			
			if (page_desktop)
			{
				
				// let container = document.createElement('div');
				// container.setAttribute("class", "container");
				
			
				
				
				
				let desktop_icons_id = document.getElementById('desktop-icons');
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
							item.route="query-report/" + item.name;
						}
						else if(item.type==="report") {
							item.route="List/" + item.doctype + "/Report/" + item.name;
						}
						else if(item.type==="page") {
							item.route=item.name;
						}
						else if(item.type==="module") {
							item.route="modules/" + item.module_name;
						}
					}
					
				
					
					
					let label_wrapper = '<div class="case-wrapper" data-name="'+item.label+'" data-link="'+item.route+'">'
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
				
				
				let desktop_icons_header = document.createElement('div');
				desktop_icons_header.setAttribute("id", "desktop-icons-header");
				desktop_icons_header.innerHTML = '<a class="btn-customize-desktop text-muted text-medium">Show / Hide Icons</a>';
				if(settings.location == "Top")
				{
					page_desktop.prepend(desktop_icons_id);	
					page_desktop.prepend(desktop_icons_header);	
						
				}
				else if(settings.location == "Bottom")
				{
					page_desktop.appendChild(desktop_icons_header);	
					page_desktop.appendChild(desktop_icons_id);	

				}
				
				
			}
			
			
			$( ".app-icon" ).bind( "click", function() {
			  // if ( !frappe.desktop.wiggling ) {
					open_module($(this).parent());
				// }
			});
			
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
			
			/* setup_module_click: function() {
				frappe.desktop.wiggling = false;

				if(frappe.list_desktop) {
					frappe.desktop.wrapper.on("click", ".desktop-list-item", function() {
						frappe.desktop.open_module($(this));
					});
				} else {
					frappe.desktop.wrapper.on("click", ".app-icon", function() {
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
			}, */

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