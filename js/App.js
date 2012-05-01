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

    launch: function () {		
        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');
		
		this.filterContainer = Ext.create('Ext.panel.Panel', {
			title: 'Chart Filtering',
			flex: 1,
			layout: {
				type: 'vbox'
			},
			defaults: {
				padding: '2 2 0 2'
			}
		});
		
		// State Picker
		this.defectStatePicker = Ext.create('Rally.ui.AttributeComboBox', {
				model: 'Defect',
				field: 'State',
				fieldLabel: 'State',
				multiSelect: true
			});
		
		this.defectStatePickerContainer = Ext.create('Ext.Container', {
			items: [this.defectStatePicker]
		});
		
		this.startTimePicker = Ext.create('Rally.ui.DateField', {
			fieldLabel: 'Start Date',
			value: new Date().add(-1).month()
		});
		this.startTimePickerContainer = Ext.create('Ext.Container', {
			items: [this.startTimePicker]
		});
		
		this.endTimePicker = Ext.create('Rally.ui.DateField', {
			fieldLabel: 'End Date',
			value: new Date().add(1).days()
		});
		this.endTimePickerContainer = Ext.create('Ext.Container', {
			items: [this.endTimePicker]
		});
		
		// Customer Filter Picker
		this.defectFieldPicker = Ext.create('DefectFieldComboBox', {
			model: 'Defect',
			fieldLabel: 'Custom Filters',
			multiSelect: true,
			listeners:{
				change: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		
		this.defectFieldPickerContainer = Ext.create('Ext.Container', {
			items: [this.defectFieldPicker ]
		});
		
		// Custom Filter Container
		this.customFilterContainer = Ext.create('Ext.panel.Panel', {
			title: 'Custom Filters',
			hidden: true,
			padding: '5 5 5 5',
			items: [],
			layout: 'fit',
			defaults: {
				padding: '2 0 0 0'
			}
		});
		
		// Button
		var runQueryButton = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallybutton',
				text: 'Build Chart',
				handler: Ext.bind(this._refreshChart, this)
			}]
		});
		
		this.filterContainer.add( this.defectStatePickerContainer );
		this.filterContainer.add( this.startTimePickerContainer );
		this.filterContainer.add( this.endTimePickerContainer );
		this.filterContainer.add( this.defectFieldPickerContainer );
		this.filterContainer.add( this.customFilterContainer );
		this.filterContainer.add( runQueryButton );
		this.add(this.filterContainer);
		this.add({
			id: 'chartCmp',
			flex: 2
		});
    },
	
	_defectFieldSelectionChanged: function(comboBox, newFields, oldFields){
		newFields = _.isUndefined(newFields) ? [] : newFields;
		oldFields = _.isUndefined(oldFields) ? [] : oldFields;
		
		var added = _.difference(newFields, oldFields);
		var removed = _.difference(oldFields, newFields);
		
		if(newFields.length === 0)
			this.customFilterContainer.hide();
		else
			this.customFilterContainer.show();
		
		var labelWidth = 120;
		for (var i in added) {
			if(this.defectFieldPicker.fieldTypes[added[i]] === 'bool') {
				var filterStore = Ext.create('Ext.data.Store', {
					fields: ['display', 'value'],
					data: [
						{"display":'True', value: true},
						{"display":'False', value: false}
					]
				});
				
				var newFilter = Ext.create('Ext.form.ComboBox', {
					id: added[i],
					fieldLabel: added[i],
					labelWidth: labelWidth,
					multiSelect: true,
					store: filterStore,
					queryMode: 'local',
					displayField: 'display',
					valueField: 'value'
				});
			}
			else {
				var newFilter = Ext.create('Rally.ui.AttributeComboBox', {
					id: added[i],
					model: 'Defect',
					field: added[i],
					fieldLabel: added[i],
					labelWidth: labelWidth,
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
		
		var defectStates = this.defectStatePicker.getValue();
		chartQuery.find.State = {$in:defectStates};
		
		var filterItems = this.customFilterContainer.query('pickerfield');
		for (var i in filterItems)
		{
			var filterItem = filterItems[i];
			chartQuery.find[filterItem.id] = {$in:filterItem.getValue()};
		}
		
		return chartQuery;
	}
});
