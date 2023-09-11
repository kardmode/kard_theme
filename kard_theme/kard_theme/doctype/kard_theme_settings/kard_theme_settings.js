// Copyright (c) 2019, kardmode and contributors
// For license information, please see license.txt

frappe.ui.form.on('Kard Theme Settings', {
	onload: function(frm) {
		
	},
	
	refresh: function(frm) {
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
});
