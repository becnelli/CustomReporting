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
        this.startTime = '2012-03-01T00:00:00Z';
        this.chartQuery = {
            find:{
                _Type:'Defect',
                _ValidFrom: {
                    $gte: this.startTime
                }
            }
        };
		
        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');
		
		this.filterContainer = Ext.create('Ext.Container', {
			layout: 'vbox'
		});
				
		this.defectStatePicker = Ext.create('Rally.ui.AttributeComboBox', {
				model: 'Defect',
				field: 'State',
				fieldLabel: 'State',
				multiSelect: true
			});
		
		this.defectStatePickerContainer = Ext.create('Ext.Container', {
			items: [this.defectStatePicker]
		});
		
		this.defectFieldPicker = Ext.create('DefectFieldComboBox', {
			model: 'Defect',
			fieldLabel: 'Custom Filters',
			multiSelect: true,
			listeners:{
				select: Ext.bind(this._defectFieldSelectionChanged, this)
			}
		});
		
		this.defectFieldPickerContainer = Ext.create('Ext.Container', {
			items: [this.defectFieldPicker ]
		});
		
		this.customFilterContainer = Ext.create('Ext.Container', {
			items: [],
			layout: 'fit'
		});
		
		var runQueryButton = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallybutton',
				text: 'Build Chart',
				handler: Ext.bind(this._refreshChart, this)
			}]
		});
		
		this.filterContainer.add( this.defectStatePickerContainer );
		this.filterContainer.add( this.defectFieldPickerContainer );
		this.filterContainer.add( this.customFilterContainer );
		this.filterContainer.add( runQueryButton );
		this.add(this.filterContainer);
		
		this._customFilters = [];
    },
	
	_defectFieldSelectionChanged: function(comboBox, fieldsSelected){
		var newFieldNames = _.map(fieldsSelected, function(field){
			return field.data.name;
		});
		
		var added = _.difference(newFieldNames, this._customFilters);
		var removed = _.difference(this._customFilters, newFieldNames);
		
		for (var i in added) {
			console.log('Added: ' + added[i]);
			var newFilter = Ext.create('Rally.ui.AttributeComboBox', {
				id: added[i],
				model: 'Defect',
				field: added[i],
				fieldLabel: added[i],
				multiSelect: true
			});
			this.customFilterContainer.add(newFilter);
		}
		for (var i in removed) {
			console.log('Removed: ' + removed[i]);
		}
		
		this.customFilterContainer.doLayout();
		
		this._customFilters = newFieldNames;
	},
	
	_afterChartConfigBuilt: function (success, chartConfig) {
        this._removeChartComponent();
        if (success){
            this.add({
                id: 'chartCmp',
                xtype: 'highchart',
                flex: 1,
                chartConfig: chartConfig
            });
        } else {
            this.add({
                id: 'chartCmp',
                xtype: 'component',
                html: '<div>No user story data found starting from: ' + this.startTime + '</div>'
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
		var defectStates = this.defectStatePicker.getValue();
        this.chartQuery.find._ProjectHierarchy = Rally.environment.getContext().getScope().project.ObjectID;
		this.chartQuery.find.State = {$in:defectStates};
        this.chartConfigBuilder.build(this.chartQuery, "Defect Count", Ext.bind(this._afterChartConfigBuilt, this));
    }
});
