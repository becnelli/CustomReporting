(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * ComboBox for choosing allowed values for the field of a model
     *
     *     @example
     *     Ext.create('Ext.Container', {
     *         items: [{
     *             xtype: 'rallyattributecombobox',
     *             model: 'UserStory',
     *             field: 'ScheduleState'
     *         }],
     *         renderTo: Ext.getBody().dom
     *     });
     */
    Ext.define('FieldComboBox', {
        requires: ['Ext.Array'],
        extend: 'Rally.ui.AttributeMultiComboBox',
        alias: 'widget.defectfieldcombobox',

        config: {
            /**
             * @cfg {Ext.data.Model/String} model (required) The model containing the specified field used to populate the store.
             * Not required if field is an instance of Ext.data.Field.
             */
            model: undefined,

            /**
             * @cfg {Ext.data.Field/String} field (required) The model's field, whose allowed values will be used to populate the store.
             */
            field: undefined,

            /**
             * @cfg {Object} context An object specifying the scoping settings for retrieving the specified model
             * If not specified the values provided by {Rally.env.Environment#getContext} will be used.
             */
            context: undefined,

            /**
             * @cfg {Object} storeConfig A configuration object which will be passed to the underlying data store
             */
            storeConfig: undefined,

            queryMode: 'local',
            editable: false,
            valueField: 'value',
            displayField: 'name'
        },

        /**
         * @constructor
         */
        constructor: function(config) {

            this.mergeConfig(config);

            this.store = Ext.create('Ext.data.Store', {
                fields: [this.valueField, this.displayField],
                data: []
            });

            return this.callParent(arguments);
        },

        initComponent: function() {

            this.callParent(arguments);

            if(this.storeConfig && this.storeConfig.listeners) {
                this.store.on(this.storeConfig.listeners);
            }
            this.on('afterrender', this._onAfterRender, this);

            if (Ext.isString(this.model)) {
                this._fetchModel();
            } else {
                if (Ext.isString(this.field)) {
                    this.field = this.model.getField(this.field);
                }
                this._populateStore();
            }
        },

        _fetchModel: function() {
            Rally.data.ModelFactory.getModel({
                context: this.context,
                type: this.model,
                success: this._onModelRetrieved,
                scope: this
            });
        },

        _onModelRetrieved: function(model) {
            this.model = model;
			
			var ignoredFields = [];
			var allowedTypes = ['string', 'bool'];
			var filterableFields = _.filter(model.getFields(), function(model){
				var allowed = true;
				allowed &= !model.hidden;
				allowed &= _.indexOf(ignoredFields, model.name) === -1;
				allowed &= (model.type.type === 'string' && model.allowedValues.length !== 0 || model.type.type === 'bool');
				return allowed;
			});
			
			var fieldTypes = {};
			_.each(filterableFields, function(field){
				fieldTypes[field.name] = field.type.type;
			});
			this.fieldTypes = fieldTypes;
			
			var fields = _.pluck(filterableFields, 'name');
			
            this._populateStore(fields);
        },

         _populateStore: function(fields) {
             var allowedValues = [];
			 for( var i in fields ){
                 var allowedValue = {};
                 allowedValue[this.valueField] = fields[i];
                 allowedValue[this.displayField] = fields[i];
                 allowedValues.push(allowedValue);
			 }
             this.store.loadRawData(allowedValues);
         },

        _onAfterRender: function() {
            this._afterRender = true;
            if(this._storeLoaded) {
                this.fireEvent('ready', this);
            }
        },

        onReady: function() {
            this._storeLoaded = true;
            if(this._afterRender) {
                this.fireEvent('ready', this);
            }
        }
    });
})();