Ext.define('BurnChartApp', {
    extend:'Rally.app.App',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    appName:'Burn Chart',
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
				{'display': 'Released - Critical/High'},
				{'display': 'Blocked'}
			],
			filterInfo: {
				'Released - Critical/High': {
					State: ['Submitted', 'Open', 'Fixed/Resolved'],
					ReleasedDefect: [true],
					Priority: ['Critical', 'High']
				},
				"Blocked": {
					State: ['Submitted', 'Open', 'Fixed/Resolved'],
					Blocked: [true]
				}
			}
		});
		
		this.reportComboBox = Ext.create('Ext.form.ComboBox', {
			fieldLabel: "Report",
			labelWidth: this._labelWidth,
			store: this.reportStore,
			queryMode: 'local',
			displayField: 'display',
			valueField: 'display',
			padding: this._padding,
			listeners: {
				select: Ext.bind(this._reportSelected, this)
			}
		});
		
		reportContainer.add(this.reportComboBox);
	
		return reportContainer;
	},
	
	_reportSelected: function(comboBox, records){
		var selectedReport = records[0].data.display;
		var filterInfo = this.reportStore.filterInfo[selectedReport];
		
		var fields = _.keys(filterInfo);
		//fields = _.without(fields, 'State');
		this.defectFieldPicker.setValue(fields);
		
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
		
		// // State Picker
		// this.defectStatePicker = Ext.create('Rally.ui.AttributeMultiComboBox', {
				// id: 'State',
				// model: 'Defect',
				// field: 'State',
				// fieldLabel: 'State',
				// labelWidth: this._labelWidth,
				// multiSelect: true,
				// listeners:{
					// ready: function(comboBox){
						// comboBox.setValue(['Submitted', 'Open']);
					// }
				// }
			// });
		
		
		// this.defectStatePickerContainer = Ext.create('Ext.Container', {
			// items: [this.defectStatePicker],
			// layout: 'anchor',
			// defaults: {
				// anchor: '100%'
			// }
		// });
		// filterContainer.add( this.defectStatePickerContainer );
		
		this.startTimePicker = Ext.create('Rally.ui.DateField', {
			fieldLabel: 'Start Date',
			labelWidth: this._labelWidth,
			value: new Date().add(-1).month()
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
		this.defectFieldPicker = Ext.create('DefectFieldComboBox', {
			model: 'Defect',
			fieldLabel: 'Custom Filters',
			labelWidth: this._labelWidth,
			multiSelect: true,
			listeners:{
				change: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		
		this.defectFieldPickerContainer = Ext.create('Ext.Container', {
			items: [this.defectFieldPicker ],
			layout: 'anchor',
			defaults: {
				anchor: '100%'
			}
		});
		filterContainer.add( this.defectFieldPickerContainer );
		
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
			if(this.defectFieldPicker.fieldTypes[added[i]] === 'bool') {
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
					model: 'Defect',
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
                html: '<div>No user story data found. :(</div>'
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
			"Defect Count", Ext.bind(this._afterChartConfigBuilt, this));
    },
	
	_buildChartQuery: function(){
        var chartQuery = {
            find:{
                _Type:'Defect'
            }
        };
		
		chartQuery.find._ProjectHierarchy = Rally.environment.getContext().getScope().project.ObjectID;
		
		// var defectStates = this.defectStatePicker.getValue();
		// chartQuery.find.State = {$in:defectStates};
		
		var filterItems = this.customFilterContainer.query('pickerfield');
		for (var i in filterItems)
		{
			var filterItem = filterItems[i];
			chartQuery.find[filterItem.id] = {$in:filterItem.getValue()};
		}
		
		return chartQuery;
	}
});
