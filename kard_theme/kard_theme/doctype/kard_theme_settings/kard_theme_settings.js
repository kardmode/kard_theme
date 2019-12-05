// Copyright (c) 2019, kardmode and contributors
// For license information, please see license.txt

frappe.ui.form.on('Kard Theme Settings', {
	onload: function(frm) {
		
	},
	refresh: function(frm) {
		frm.add_custom_button(__("Show/Hide Standard Icons"), function() {
			
			frappe.route_options = {
				standard: 1
			}			
			frappe.set_route("List", "Desktop Icon");
		});

	},
	
	initialize_standard_icons: function(frm) {
		frappe.confirm(__('This will reset and initialize standard icons from module definitions. Do you want to proceed?'),
			function() {
				frappe.call({
					method: 'initialize_standard_icons',
					args: {},
					callback: function(r) {
					
					
						if (r.message)
						{	
						
						
							
							
						}
						
					},
					doc: frm.doc,
					freeze: true,
					freeze_message: 'Initializing Standard Icons...'
				});
			},
			function() {
				if(frappe.dom.freeze_count) {
					frappe.dom.unfreeze();
					frm.events.refresh(frm);
				}
			}
		);
	},
	clear_user_icons: function(frm) {
		frappe.confirm(__('This will clear all user desktop icons. Do you want to proceed?'),
			function() {
				frappe.call({
					method: 'clear_user_icons',
					args: {},
					callback: function(r) {
					
					
						if (r.message)
						{	
						
						
							
							
						}
						
					},
					doc: frm.doc,
					freeze: true,
					freeze_message: 'Clearing User Icons...'
				});
			},
			function() {
				if(frappe.dom.freeze_count) {
					frappe.dom.unfreeze();
					frm.events.refresh(frm);
				}
			}
		);
	},
	sync_standard_icons: function(frm) {
		frappe.confirm(__('This will update standard icons from module definitions. Do you want to proceed?'),
			function() {
				frappe.call({
					method: 'sync_standard_icons',
					args: {},
					callback: function(r) {
					
					
						if (r.message)
						{	
						
						
							
							
						}
						
					},
					doc: frm.doc,
					freeze: true,
					freeze_message: 'Initializing Standard Icons...'
				});
			},
			function() {
				if(frappe.dom.freeze_count) {
					frappe.dom.unfreeze();
					frm.events.refresh(frm);
				}
			}
		);
	},
	copy_desktop_icons: function(frm) {
		frappe.confirm(__('This will clear all kard desktop icons and copy from old desktop icons. Do you want to proceed?'),
			function() {
				frappe.call({
					method: 'copy_from_desktop_icons',
					args: {},
					callback: function(r) {
					
					
						if (r.message)
						{	
						
						
							
							
						}
						
					},
					doc: frm.doc,
					freeze: true,
					freeze_message: 'Copying Desktop Icons...'
				});
			},
			function() {
				if(frappe.dom.freeze_count) {
					frappe.dom.unfreeze();
					frm.events.refresh(frm);
				}
			}
		);
	},
});
