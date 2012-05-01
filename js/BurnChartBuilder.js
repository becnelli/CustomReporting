(function () {

    Ext.define('Rally.app.analytics.BurnChartBuilder', {
        build:function (requestedQuery, startTime, endTime, chartTitle, buildFinishedCallback) {
			this.requestedQuery = requestedQuery;
			this.startTime = startTime;
			this.endTime = endTime;
			this.chartTitle = chartTitle;
			this.buildFinishedCallback = buildFinishedCallback;
		
            this.workspace = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.workspace._ref);
			
            var singleDefectQuery = {
                find:Ext.encode(this.requestedQuery.find),
                pagesize:1
            };
			
			// query to get earliest defect    
            Ext.Ajax.request({
                url:"https://rally1.rallydev.com/analytics/1.27/" + this.workspace + "/artifact/snapshot/query.js?" + Ext.Object.toQueryString(singleDefectQuery) +
                    "&fields=['_ValidFrom']&sort={_ValidFrom:1}",
                method:"GET",
                success:function (response) {
                    this._earliestDefectFound(JSON.parse(response.responseText));
                },
                scope:this
            });

        },
		
		_earliestDefectFound: function(response) {
			var earliestValidFrom = this.endTime;
			if (response.Results.length > 0) {
				earliestValidFrom = response.Results[0]._ValidFrom;
			}
			
			this.requestedQuery.find._ValidFrom = {
				$gte: earliestValidFrom,
				$lt: this.endTime
			};
			
			this._buildChart();
		},
		
		_buildChart: function() {
            this.query = {
                find:Ext.encode(this.requestedQuery.find),
                pagesize:10000
            };
            this.requestedFields = Ext.Array.union(['_ValidFrom', '_ValidTo', 'ObjectID'], this.requestedQuery.fields ? this.requestedQuery.fields : []);


			this._queryAnalyticsApi();
		},
		
        _queryAnalyticsApi:function () {
            Ext.Ajax.request({
                url:"https://rally1.rallydev.com/analytics/1.27/" + this.workspace + "/artifact/snapshot/query.js?" + Ext.Object.toQueryString(this.query) +
                    "&fields=" + JSON.stringify(this.requestedFields) + "&sort={_ValidFrom:1}",
                method:"GET",
                success:function (response) {
                    this._afterQueryReturned(JSON.parse(response.responseText));
                },
                scope:this
            });
        },

        _afterQueryReturned:function (queryResultsData) {
            if (queryResultsData.TotalResultCount > 0) {
                this._buildChartConfigAndCallback(queryResultsData);
            } else {
                this.buildFinishedCallback(false);
            }
        },

        _buildChartConfigAndCallback: function(queryResultsData) {
            var lumenize = require('./lumenize');
                var contextWorkspaceConfig = Rally.environment.getContext().context.scope.workspace.WorkspaceConfiguration;
                var workspaceConfiguration = {
                    // Need to grab from Rally for this user
                    DateFormat:contextWorkspaceConfig.DateFormat,
                    DateTimeFormat:contextWorkspaceConfig.DateTimeFormat,
                    //TODO: Have context code fetch these values for the workspace config, instead of hardcoding them
                    IterationEstimateUnitName:'Points',
                    // !TODO: Should we use this?
                    ReleaseEstimateUnitName:'Points',
                    TaskUnitName:'Hours',
                    TimeTrackerEnabled:true,
                    TimeZone:'America/Denver',
                    WorkDays:'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'
                    // They work on Sundays
                };

                var burnConfig = {
                    workspaceConfiguration:workspaceConfiguration,
                    upSeriesType:'Story Count',
                    // 'Points' or 'Story Count'
                    series:[
                        'scope'
                    ],

                    acceptedStates:[],
                    start:this.startTime,
                    // Calculated either by inspecting results or via configuration. pastEnd is automatically the last date in results
                    holidays:[
                        {
                            month:12,
                            day:25
                        },
                        {
                            year:2011,
                            month:11,
                            day:26
                        },
                        {
                            year:2011,
                            month:1,
                            day:5
                        }
                    ]
                };

                lumenize.ChartTime.setTZPath("");
                var tscResults = burnCalculator(queryResultsData.Results, burnConfig);

                var categories = tscResults.categories;
                var series = tscResults.series;
                var chartConfiguration = {
                    chart:{
                        defaultSeriesType:'column',
                        zoomType: 'xy'
                    },
                    credits:{
                        enabled:false
                    },
                    title:{
                        text:this.chartTitle
                    },
                    subtitle:{
                        text:''
                    },
                    xAxis:{
                        categories:categories,
                        tickmarkPlacement:'on',
                        tickInterval:Math.floor(categories.length / 13) + 1,
                        // set as a function of the length of categories
                        title:{
                            enabled:false
                        }
                    },
                    yAxis:[
                        {
                            title:{
                                text:'Defect Count'
                            },
                            labels:{
                                formatter:function () {
                                    return this.value / 1;
                                }
                            },
                            min:0
                        },
                        {
                            title:{
                                text:''
                            },
                            opposite:true,
                            labels:{
                                formatter:function () {
                                    return this.value / 1;
                                }
                            },
                            min:0
                        }
                    ],
                    tooltip:{
                        formatter:function () {
                            return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                        }
                    },
                    plotOptions:{
                        column:{
                            stacking:null,
                            lineColor:'#666666',
                            lineWidth:1,
                            marker:{
                                lineWidth:1,
                                lineColor:'#666666'
                            }
                        }
                    },
                    series:series
                };

                this.buildFinishedCallback(true, chartConfiguration);
        }
    });
})();