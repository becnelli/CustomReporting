Ext.define('OnDemandCustomAnalytics', {
    extend:'Rally.app.App',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    appName:'On-Demand Custom Analytics',
    cls:'burnchart',
	_labelWidth: 120,
	_padding: '2 0 0 0',

    launch: function () {		
        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');
		
		var reportControls = this._buildReportControls();
		var chartFilteringControls = this._buildChartFilteringControls();

		// Button
		var runQueryButton = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallybutton',
				text: 'Build Chart',
				handler: Ext.bind(this._refreshChart, this)
			}]
		});
		
		var leftNavigation = Ext.create('Ext.Container', {
			items: [reportControls, chartFilteringControls, runQueryButton],
			flex: 1,
			defaults: {
				padding: '5 0 0 5'
			}
		});
		
		this.add(leftNavigation);
		this.add({
			id: 'chartCmp',
			flex: 2,
			border: 0
		});
    },
	
	_buildReportControls: function () {
		var reportContainer = Ext.create('Ext.panel.Panel', {
			title: 'Standard Reports',
			layout: {
				type: 'anchor'
			},
			defaults: {
				padding: this._padding,
				anchor: '100%'
			}
		});
		
		this.reportStore = Ext.create('Ext.data.Store', {
			fields: ['display'],
			data: [
				{'display': 'Defects: Not Closed, Released and Critical/High'},
				{'display': 'Defects: Not Closed and Blocked'},
				{'display': 'Defects: Fixed/Resolved'},
				{'display': 'User Stories: In-Progress and Blocked'}
			],
			filterInfo: {
				'Defects: Not Closed, Released and Critical/High': {
					Type: 'Defect',
					State: ['Submitted', 'Open', 'Fixed/Resolved'],
					ReleasedDefect: [true],
					Priority: ['Critical', 'High']
				},
				"Defects: Not Closed and Blocked": {
					Type: 'Defect',
					State: ['Submitted', 'Open', 'Fixed/Resolved'],
					Blocked: [true]
				},
				"Defects: Fixed/Resolved": {
					Type: 'Defect',
					State: ['Fixed/Resolved']
				},
				"User Stories: In-Progress and Blocked": {
					Type: 'HierarchicalRequirement',
					ScheduleState: ['In-Progress'],
					Blocked: [true]
				}
			}
		});
		
		this.reportComboBox = Ext.create('Ext.form.field.ComboBox', {
			fieldLabel: "Report",
			labelWidth: this._labelWidth,
			store: this.reportStore,
			queryMode: 'local',
			displayField: 'display',
			valueField: 'display',
			padding: this._padding,
			editable: false
		});
		this.reportComboBox.addListener('select', this._reportSelected, this);
		
		reportContainer.add(this.reportComboBox);
	
		return reportContainer;
	},
	
	_reportSelected: function(comboBox, records){
		var selectedReport = records[0].data.display;
		var filterInfo = this.reportStore.filterInfo[selectedReport];
		
		// select filter first
		this._typeFilterSelected(null, [{
			data: {
				value: filterInfo['Type']
			}
		}]);
		
		// then set the custom filters
		this._setCustomFilters(filterInfo);
	},
	
	_setCustomFilters: function(filterInfo) {
		var fields = _.keys(filterInfo);
		this.currentTypeFilter.setValue(fields);
		
		for(var key in filterInfo)
		{
			var cntrl = Ext.getCmp(key);
			if(_.isUndefined(cntrl)) {
				alert('Missing control: ' + key);
			}
			else {
				cntrl.setValue(filterInfo[key]);
			}
		}
	},
	
	_buildChartFilteringControls: function() {	
		var filterContainer = Ext.create('Ext.panel.Panel', {
			title: 'Chart Filtering',
			layout: {
				type: 'anchor'
			},
			defaults: {
				padding: this._padding,
				anchor: '100%'
			}
		});
		
		var typeStore = Ext.create('Ext.data.Store', {
			fields: ['display', 'value'],
			data: [
				{'display': 'Defect', value: 'Defect'},
				{'display': 'User Story', value: 'HierarchicalRequirement'},
				{'display': 'Task', value: 'Task'}
			]
		});
		
		// Type Filter
		this.typeFilter = Ext.create('Rally.ui.ComboBox', {
			id: 'Type',
			fieldLabel: 'Data Type',
			labelWidth: this._labelWidth,
			store: typeStore,
			queryMode: 'local',
			displayField: 'display',
			valueField: 'value',
			listeners: {
				select: Ext.bind(this._typeFilterSelected, this)
			}
		});
		this.typeFilterContainer = Ext.create('Ext.Container', {
			items: [this.typeFilter],
			layout: 'anchor',
			defaults: {
				anchor: '100%'
			}
		});
		filterContainer.add( this.typeFilterContainer );
		
		// Start and End time
		this.startTimePicker = Ext.create('Rally.ui.DateField', {
			fieldLabel: 'Start Date',
			labelWidth: this._labelWidth,
			value: new Date().add(-3).month()
		});
		this.startTimePickerContainer = Ext.create('Ext.Container', {
			items: [this.startTimePicker],
			layout: 'anchor',
			defaults: {
				anchor: '100%'
			}
		});
		filterContainer.add( this.startTimePickerContainer );
		
		this.endTimePicker = Ext.create('Rally.ui.DateField', {
			fieldLabel: 'End Date',
			labelWidth: this._labelWidth,
			value: new Date().add(1).days()
		});
		this.endTimePickerContainer = Ext.create('Ext.Container', {
			items: [this.endTimePicker],
			layout: 'anchor',
			defaults: {
				anchor: '100%'
			}
		});
		filterContainer.add( this.endTimePickerContainer );
		
		// Customer Filter Picker
		this.defectFieldPicker = Ext.create('FieldComboBox', {
			model: 'Defect',
			fieldLabel: 'Custom Filters',
			labelWidth: this._labelWidth,
			multiSelect: true,
			hidden: true,
			listeners:{
				change: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		this.storyFieldPicker = Ext.create('FieldComboBox', {
			model: 'HierarchicalRequirement',
			fieldLabel: 'Custom Filters',
			labelWidth: this._labelWidth,
			multiSelect: true,
			hidden: true,
			listeners:{
				change: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		this.taskFieldPicker = Ext.create('FieldComboBox', {
			model: 'Task',
			fieldLabel: 'Custom Filters',
			labelWidth: this._labelWidth,
			multiSelect: true,
			hidden: true,
			listeners:{
				change: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		
		this.typeFieldPickerContainer = Ext.create('Ext.Container', {
			items: [this.defectFieldPicker, this.storyFieldPicker, this.taskFieldPicker ],
			layout: 'anchor',
			defaults: {
				anchor: '100%'
			}
		});
		filterContainer.add( this.typeFieldPickerContainer );
		
		// Custom Filter Container
		this.customFilterContainer = Ext.create('Ext.panel.Panel', {
			title: 'Custom Filters',
			hidden: true,
			padding: '5 5 5 5',
			items: [],
			layout: 'anchor',
			defaults: {
				padding: this._padding,
				anchor: '100%'
			}
		});
		filterContainer.add( this.customFilterContainer );
		
		return filterContainer;
	},
	
	_typeFilterSelected: function(comboBox, records) {
		// set custom filters
		if(this.currentTypeFilter) {
			this.currentTypeFilter.hide();
			this._setCustomFilters({});
		}
			
		if(records[0].data.value === 'Defect') {
			this.currentTypeFilter = this.defectFieldPicker;
			this._setCustomFilters(
				{
					State: ['Submitted', 'Open', 'Fixed/Resolved']
				}
			);
		} else if (records[0].data.value === 'HierarchicalRequirement')  {
			this.currentTypeFilter = this.storyFieldPicker;
			this._setCustomFilters(
				{
					ScheduleState: [ 'In-Progress' ]
				}
			);
		} else if (records[0].data.value === 'Task') {
			this.currentTypeFilter = this.taskFieldPicker;
			this._setCustomFilters(
				{
				}
			);
		}
		this.currentTypeFilter.show();
		
	},
	
	_defectFieldSelectionChanged: function(comboBox, newFields, oldFields){
		newFields = _.isUndefined(newFields) || newFields.length === 0 ? [] : newFields.split(', ');
		oldFields = _.isUndefined(oldFields) || oldFields.length === 0  ? [] : oldFields.split(', ');

		var added = _.difference(newFields, oldFields);
		var removed = _.difference(oldFields, newFields);
		
		if(newFields.length === 0)
			this.customFilterContainer.hide();
		else
			this.customFilterContainer.show();
		
		for (var i in added) {
			if(this.currentTypeFilter.fieldTypes[added[i]] === 'bool') {
				var filterStore = Ext.create('Ext.data.Store', {
					fields: ['display', 'value'],
					data: [
						{"display":'True', value: true},
						{"display":'False', value: false}
					]
				});
				
				var newFilter = Ext.create('Ext.ux.form.field.BoxSelect', {
					id: added[i],
					fieldLabel: added[i],
					labelWidth: this._labelWidth,
					multiSelect: true,
					store: filterStore,
					queryMode: 'local',
					displayField: 'display',
					valueField: 'value'
				});
			}
			else {
				var newFilter = Ext.create('Rally.ui.AttributeMultiComboBox', {
					id: added[i],
					model: this.typeFilter.getValue(),
					field: added[i],
					fieldLabel: added[i],
					labelWidth: this._labelWidth,
					multiSelect: true
				});
			}
			this.customFilterContainer.add(newFilter);
		}
		for (var i in removed) {
			this.customFilterContainer.remove(Ext.getCmp(removed[i]));
		}
		
		this.customFilterContainer.doLayout();	
	},
	
	_afterChartConfigBuilt: function (success, chartConfig) {
		this.getEl().unmask('Loading...');
        this._removeChartComponent();
        if (success){
            this.add({
                id: 'chartCmp',
                xtype: 'highchart',
                flex: 2,
                chartConfig: chartConfig
            });
        } else {
            this.add({
                id: 'chartCmp',
				flex: 2,
                xtype: 'component',
                html: '<div>No ' + this.typeFilter.getRawValue() + ' data found for the specified query.</div>'
            });
        }
    },

    _removeChartComponent: function() {
        var chartCmp = this.down('#chartCmp');
        if (chartCmp) {
            this.remove(chartCmp);
        }
    },

    _refreshChart: function() {
		this.chartQuery = this._buildChartQuery();
		this.getEl().mask('Loading...');
		this.chartConfigBuilder.build(this.chartQuery, this.startTimePicker.getValue().toISOString(), this.endTimePicker.getValue().toISOString(), 
			this.typeFilter.getRawValue() + " Count", Ext.bind(this._afterChartConfigBuilt, this));
    },
	
	_buildChartQuery: function(){
        var chartQuery = {
            find:{
                _Type: this.typeFilter.getValue()
            }
        };
		
		chartQuery.find._ProjectHierarchy = Rally.environment.getContext().getScope().project.ObjectID;
		
		var filterItems = this.customFilterContainer.query('pickerfield');
		for (var i in filterItems)
		{
			var filterItem = filterItems[i];
			chartQuery.find[filterItem.id] = {$in:filterItem.getValue()};
		}
		
		return chartQuery;
	}
});
