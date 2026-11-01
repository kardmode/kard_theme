// Copyright (c) 2026, Kard Theme and contributors
// For license information, please see license.txt

frappe.provide("frappe.widget");
frappe.provide("frappe.workspace_block");

(function () {
	// Base WidgetDialog helper
	class FolderBaseWidgetDialog {
		constructor(opts) {
			Object.assign(this, opts);
			this.editing = Boolean(this.values && Object.keys(this.values).length);
		}

		make() {
			this.make_dialog();
			this.dialog.show();
			window.cur_dialog = this.dialog;
			this.editing && this.set_default_values();
		}

		make_dialog() {
			this.dialog = new frappe.ui.Dialog({
				title: this.get_title(),
				fields: this.get_fields(),
				primary_action: (data) => {
					data = this.process_data(data);
					if (!data) return;
					if (!this.editing && !data.name) {
						data.name = `${this.type}-${this.label}-${frappe.utils.get_random(20)}`;
					}
					this.dialog.hide();
					this.primary_action && this.primary_action(data);
				},
				primary_action_label: this.primary_action_label || __("Add"),
			});
		}

		get_title() {
			let action = this.editing ? "Edit" : "Add";
			return __(action + " " + frappe.model.unscrub(this.type));
		}

		get_fields() {
			return [];
		}

		set_default_values() {
			return this.dialog.set_values(this.values);
		}

		process_data(data) {
			return data;
		}
	}

	class FolderDialog extends FolderBaseWidgetDialog {
		get_fields() {
			return [
				{
					fieldtype: "Data",
					fieldname: "label",
					label: __("Folder Label"),
					reqd: 1,
				},
				{
					fieldtype: "Section Break",
					label: __("Folder Items"),
				},
				{
					fieldname: "items",
					fieldtype: "Table",
					label: __("Items"),
					editable_grid: 1,
					data: this.values ? this.values.items : [],
					get_data: () => {
						return this.values ? this.values.items : [];
					},
					fields: [
						{
							fieldname: "label",
							fieldtype: "Data",
							in_list_view: 1,
							label: __("Label"),
						},
						{
							fieldname: "icon",
							fieldtype: "Icon",
							in_list_view: 1,
							label: __("Icon"),
							default: "folder-normal",
						},
						{
							fieldname: "type",
							fieldtype: "Select",
							in_list_view: 1,
							label: __("Type"),
							options: ["DocType", "Report", "Page", "Dashboard", "URL"],
							default: "DocType",
						},
						{
							fieldname: "link_to",
							fieldtype: "Dynamic Link",
							in_list_view: 1,
							label: __("Link To"),
							get_options: (df) => df.doc.type,
							depends_on: (doc) => doc.type !== "URL",
						},
						{
							fieldname: "url",
							fieldtype: "Data",
							label: __("URL"),
							depends_on: (doc) => doc.type === "URL",
						},
						{
							fieldname: "doc_view",
							fieldtype: "Select",
							label: __("View"),
							options: ["List", "Report Builder", "Dashboard", "Tree", "New", "Calendar", "Kanban"],
							default: "List",
							depends_on: (doc) => doc.type === "DocType",
						},
					],
				},
			];
		}

		process_data(data) {
			if (!data.items || data.items.length === 0) {
				frappe.msgprint(__("Please add at least one item to the folder."));
				return false;
			}

			data.items.forEach((item) => {
				if (!item.label) {
					item.label = item.type === "URL" ? item.url : item.link_to;
				}

				if (item.type === "URL") {
					item.route = item.url;
				} else if (item.type === "DocType") {
					let route = item.link_to.trim().replace(/\s+/g, "-").toLowerCase();
					switch (item.doc_view) {
						case "List":
							item.route = `app/list/${route}`;
							break;
						case "Report Builder":
							item.route = `app/list/${route}/view/report`;
							break;
						case "Dashboard":
							item.route = `app/list/${route}/view/dashboard`;
							break;
						case "Tree":
							item.route = `app/list/${route}/view/tree`;
							break;
						case "New":
							item.route = `app/list/${route}/new`;
							break;
						case "Calendar":
							item.route = `app/list/${route}/view/calendar`;
							break;
						case "Kanban":
							item.route = `app/list/${route}/view/kanban`;
							break;
					}
				} else if (item.type === "Report") {
					item.route = `app/query-report/${item.link_to}`;
				} else if (item.type === "Dashboard") {
					item.route = `app/dashboard/${item.link_to}`;
				} else if (item.type === "Page") {
					item.route = `app/${item.link_to}`;
				}
			});

			return data;
		}
	}

	function register_folder_widgets() {
		if (!frappe.widget || !frappe.widget.widget_factory) return;

		const BaseWidget = frappe.widget.widget_factory.card ? 
			Object.getPrototypeOf(frappe.widget.widget_factory.card) : class {};

		class FolderWidget extends BaseWidget {
			constructor(opts) {
				opts = opts || {};
				opts.icon = opts.icon || "file";
				super(opts);
			}

			get_config() {
				return {
					name: this.name,
					label: this.label,
					icon: this.icon,
					items: this.items || [],
					hidden: this.hidden,
				};
			}

			set_body() {
				this.widget.addClass("folder-widget");
				this.render_preview();
			}

			set_title() {
				if (this.title_field) {
					this.title_field.empty();
				}
			}

			render_preview() {
				this.body.empty();
				const preview_container = $(`
					<div class="folder-preview-wrapper">
						<div class="folder-preview-grid"></div>
						<div class="folder-preview-label">${__(this.label)}</div>
					</div>
				`);
				const grid = preview_container.find(".folder-preview-grid");
				const items = this.items || [];

				items.slice(0, 4).forEach((item) => {
					const icon = frappe.utils.icon(item.icon || "folder-normal", "sm");
					$(`<div class="folder-preview-icon">${icon}</div>`).appendTo(grid);
				});

				preview_container.appendTo(this.body);
			}

			setup_events() {
				this.widget.on("click", (e) => {
					if (this.in_customize_mode) return;
					e.preventDefault();
					e.stopPropagation();
					this.open_folder();
				});
			}

			open_folder() {
				if (this.folder_overlay) {
					this.folder_overlay.remove();
				}

				this.folder_overlay = $(`
					<div class="folder-expanded-overlay">
						<div class="folder-expanded-container">
							<div class="folder-header">
								<div class="folder-title">${__(this.label)}</div>
								<div class="folder-close">${frappe.utils.icon("close", "sm")}</div>
							</div>
							<div class="folder-items-grid"></div>
						</div>
					</div>
				`).appendTo(document.body);

				const grid = this.folder_overlay.find(".folder-items-grid");
				const items = this.items || [];

				items.forEach((item) => {
					const $item = $(`
						<div class="folder-item">
							<div class="folder-item-icon-wrapper">
								${frappe.utils.icon(item.icon || "folder-normal", "lg")}
							</div>
							<div class="folder-item-label">${__(item.label)}</div>
						</div>
					`).appendTo(grid);

					$item.on("click", (e) => {
						e.stopPropagation();
						this.close_folder();
						if (item.route) {
							frappe.set_route(item.route);
						}
					});
				});

				this.folder_overlay.on("click", (e) => {
					if ($(e.target).hasClass("folder-expanded-overlay")) {
						this.close_folder();
					}
				});

				this.folder_overlay.find(".folder-close").on("click", () => {
					this.close_folder();
				});

				requestAnimationFrame(() => {
					this.folder_overlay.addClass("opened");
				});
			}

			close_folder() {
				if (this.folder_overlay) {
					this.folder_overlay.removeClass("opened");
					setTimeout(() => {
						if (this.folder_overlay) {
							this.folder_overlay.remove();
							this.folder_overlay = null;
						}
					}, 300);
				}
			}

			edit() {
				this.edit_dialog = new FolderDialog({
					for_workspace: this.options?.for_workspace,
					label: this.label,
					type: this.widget_type,
					values: this.get_config(),
					primary_action: (data) => {
						Object.assign(this, data);
						this.set_body();
						this.options?.on_edit && this.options.on_edit(this.get_config());
					},
				});

				this.edit_dialog.make();
			}
		}

		frappe.widget.widget_factory["folder"] = FolderWidget;

		// Register Folder Block if Workspace Blocks are available
		if (frappe.workspace_block && frappe.workspace_block.blocks) {
			const BaseBlock = frappe.workspace_block.blocks.card ? 
				Object.getPrototypeOf(frappe.workspace_block.blocks.card) : class {};

			class FolderBlock extends BaseBlock {
				static get toolbox() {
					return {
						title: "Folder",
						icon: frappe.utils.icon("folder-normal", "sm"),
					};
				}

				static get isReadOnlySupported() {
					return true;
				}

				constructor({ data, api, config, readOnly, block }) {
					super({ data, api, config, readOnly, block });
					this.col = this.data.col ? this.data.col : "2";
					this.allow_customization = !this.readOnly;
					this.options = {
						allow_sorting: this.allow_customization,
						allow_create: this.allow_customization,
						allow_delete: this.allow_customization,
						allow_hiding: false,
						allow_edit: true,
						allow_resize: true,
						min_width: 1,
					};
				}

				set_col_class(node, width) {
					if (width == 2) {
						let classes = $.grep(node.classList, function (item) {
							return item.indexOf("col-") !== 0;
						});

						node.classList = "";
						classes.forEach((cl) => {
							node.classList.add(cl);
						});

						node.classList.add("col-xs-12");
						node.classList.add("col-sm-6");
						node.classList.add("col-md-4");
						node.classList.add("col-lg-2");
						node.classList.add("col-xl-2");
						return;
					}
					super.set_col_class && super.set_col_class(node, width);
				}

				make(block, block_name, widget_type = block) {
					let block_data = this.data.folder_data;

					if (!block_data && this.config.page_data && this.config.page_data[block + "s"]) {
						block_data = this.config.page_data[block + "s"].items.find((obj) => {
							return (
								frappe.utils.unescape_html(obj.label) == frappe.utils.unescape_html(__(block_name))
							);
						});
					}

					if (!block_data) return false;

					this.wrapper.innerHTML = "";
					block_data.in_customize_mode = !this.readOnly;
					this.block_widget = new frappe.widget.SingleWidgetGroup({
						container: this.wrapper,
						type: widget_type,
						class_name: "",
						options: this.options,
						widgets: block_data,
						api: this.api,
						block: this.block,
					});
					this.wrapper.setAttribute(block + "_name", block_name);
					if (!this.readOnly) {
						this.block_widget.customize();
					}
					return true;
				}

				new(block, widget_type = block) {
					let me = this;
					let block_name = block + "_name";
					this.dialog = new FolderDialog({
						for_workspace: true,
						label: this.label,
						type: widget_type,
						primary_action: (widget) => {
							widget.in_customize_mode = 1;
							this.block_widget = frappe.widget.make_widget({
								...widget,
								widget_type: widget_type,
								container: this.wrapper,
								options: {
									...this.options,
									on_delete: () => this.api.blocks.delete(),
									on_edit: () => this.on_edit(this.block_widget),
								},
							});
							this.block_widget.customize(this.options);
							this.wrapper.setAttribute(block_name, this.block_widget.label);
							$(this.wrapper).find(".widget").addClass(`${widget_type} edit-mode`);
							this.new_block_widget = this.block_widget.get_config();
							this.add_settings_button();
						},
					});

					if (!this.readOnly && this.data && !this.data[block_name]) {
						this.dialog.make();
						this.dialog.dialog.get_close_btn().click(() => {
							me.wrapper.closest(".ce-block").remove();
						});
					}
				}

				render() {
					this.wrapper = document.createElement("div");
					this.new("folder");

					if (this.data && (this.data.folder_name || this.data.folder_data)) {
						let name = this.data.folder_name || (this.data.folder_data && this.data.folder_data.label);
						let has_data = this.make("folder", name);
						if (!has_data) return;
					}

					if (!this.readOnly) {
						$(this.wrapper).find(".widget").addClass("folder edit-mode");
						this.add_settings_button();
						this.add_new_block_button();
					} else {
						$(this.wrapper).append($(`<div class="divider"></div>`));
					}
					return this.wrapper;
				}

				validate(savedData) {
					return Boolean(savedData.folder_name);
				}

				save() {
					return {
						folder_name: this.wrapper.getAttribute("folder_name"),
						col: this.get_col(),
						folder_data: this.new_block_widget || this.data.folder_data,
					};
				}
			}

			frappe.workspace_block.blocks["folder"] = FolderBlock;

			// Hook Workspace initialization to ensure folder block is included in tools
			if (frappe.views && frappe.views.Workspace) {
				const original_init_editorjs = frappe.views.Workspace.prototype.initialize_editorjs;
				frappe.views.Workspace.prototype.initialize_editorjs = function (blocks) {
					if (this.blocks) {
						this.blocks["folder"] = FolderBlock;
					}
					const res = original_init_editorjs.apply(this, arguments);
					if (this.tools && !this.tools.folder) {
						this.tools.folder = {
							class: FolderBlock,
							config: {
								page_data: this.page_data || [],
							},
						};
					}
					return res;
				};

				const original_setup_customization = frappe.views.Workspace.prototype.setup_customization_buttons;
				frappe.views.Workspace.prototype.setup_customization_buttons = function () {
					const res = original_setup_customization.apply(this, arguments);
					if (this.editor && this.editor.configuration && this.editor.configuration.tools && this.editor.configuration.tools.folder) {
						this.editor.configuration.tools.folder.config.page_data = this.page_data;
					}
					return res;
				};
			}
		}
	}

	$(document).ready(function () {
		register_folder_widgets();
	});

	// Also attempt registration on route changes to ensure availability
	$(document).on("app_ready", function () {
		register_folder_widgets();
	});
})();
