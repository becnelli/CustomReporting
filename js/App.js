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
		
		this.defectStatePicker = Ext.create('Rally.ui.AttributeComboBox', {
				model: 'Defect',
				field: 'State',
				multiSelect: true
			});
		
		this.defectStatePickerContainer = Ext.create('Ext.Container', {
			items: [this.defectStatePicker]
		});
		
		var runQueryButton = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallybutton',
				text: 'Build Chart',
				handler: Ext.bind(this._refreshChart, this)
			}]
		});
		
		this.defectFieldPicker = Ext.create('DefectFieldComboBox', {
			model: 'Defect',
			multiSelect: true
		});
		
		this.defectFieldPickerContainer = Ext.create('Ext.Container', {
			items: [this.defectFieldPicker ]
		});
		
		this.add( this.defectFieldPickerContainer );
		this.add( this.defectStatePickerContainer );
		this.add( runQueryButton );
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
