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
        this.startTime = '2012-01-01T00:00:00Z';
        this.chartQuery = {
            find:{
                _Type:'Defect',
                Children:null,
                _ValidFrom: {
                    $gte: this.startTime
                }
            }
        };

        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');
		var project = Rally.environment.getContext().getScope().project.ObjectID;
		console.log( project );
		this._refreshChart(project, "Test");

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

    _refreshChart: function(projectId, title) {
        this.chartQuery.find._ProjectHierarchy = projectId;
        this.chartConfigBuilder.build(this.chartQuery, title, Ext.bind(this._afterChartConfigBuilt, this));
    }
});
