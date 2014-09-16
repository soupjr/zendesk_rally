(function () {

	return {

		defaultState: 'loading_screen',

		resources: {
		},

		requests: {

			fetchTextSearchResults: function (searchTerm) {
				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact?query=((Name contains ' + searchTerm +
							') OR (Description contains ' + searchTerm + '))&fetch=FormattedID,Name,Description,c_NumberofTickets',
					type: 'GET',
					dataType: 'json',
					headers: {'zsessionid': this.apikey}
				};
			},

			fetchNumberSearchResults: function (searchTerm) {
				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact?query=((FormattedID = DE' + searchTerm +
							') OR (FormattedID = US' + searchTerm + '))&fetch=FormattedId,Name,Description,c_NumberofTickets',
					type: 'GET',
					dataType: 'json',
					headers: {'zsessionid': this.apikey}
				};
			},

			fetchArtifact: function (url) {
				return {
					url: url + '?fetch=FormattedID,Name,Description',
					type: 'GET',
					dataType: 'json',
					headers: {'zsessionid': this.apikey}
				};
			},

			postAssociateWithTicket: function (url, data) {
				return {
					url: url,
					headers: {'zsessionid': this.apikey},
					type: 'POST',
					dataType: 'json',
					contentType: 'application/json; charset=UTF-8',
					data: JSON.stringify(data)
				};
			},

			postNewDefect: function (data) {
				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/defect/create',
					headers: {'zsessionid': this.apikey},
					type: 'POST',
					dataType: 'json',
					contentType: 'application/json; charset=UTF-8',
					data: JSON.stringify(data)
				};
			}
		},
// @formatter:off
		events: {
			'app.activated'                     : 'init',
			'click .btn_search_rally_alm'       : 'searchForArtifacts',
			'click .associate_artifact'         : 'associateArtifact',
			'click .back_to_start'              : 'renderSearchPage',
			'click .btn_remove_artifact'        : 'removeAssociatedArtifact',
			'click .btn_new_defect'             : 'renderNewDefectForm',
			'click .btn_cancel_new_defect'      : 'renderDefaultPage',
			'click .btn_save_new_defect'        : 'saveDefect',
			'fetchNumberSearchResults.done'     : 'renderSearchResults',
			'fetchTextSearchResults.done'       : 'renderSearchResults',
			'postAssociateWithTicket.done'      : 'afterAssociateArtifact',
			'postNewDefect.done'                : 'addReferenceToTicket',
			'fetchArtifact.done'                : 'renderAssociatedArtifact',
			'fetchNumberSearchResults.fail'     : 'fail',
			'fetchTextSearchResults.fail'       : 'fail',
			'postAssociateWithTicket.fail'      : 'fail',
			'postNewDefect.fail'                : 'fail',
			'fetchArtifact.fail'                : 'fail'
		},
		// @formatter:on

		init: function () {
			this.apikey = this.setting('apikey');
			this.customfield = 'custom_field_' + this.setting('customfieldid');
			this.renderDefaultPage(null);
		},

		renderDefaultPage: function (data) {

			var apiURL = this.ticket().customField(this.customfield);

			// if the ticket has a link, display it
			if (apiURL || apiURL === '') {
				// show details page
				this.ajax('fetchArtifact', apiURL);
			} else {
				// no artifact, so search
				this.switchTo('search_page');
			}
		},

		searchForArtifacts: function (event) {
			event.preventDefault();
			this.serializeFormData();
			// perform an ajax call to search for defects.
			if (!isNaN(this.dataObjectArray.searchTerm)) {
				this.ajax('fetchNumberSearchResults', this.dataObjectArray.searchTerm);
			} else {
				this.ajax('fetchTextSearchResults', this.dataObjectArray.searchTerm);
			}
			this.switchTo('loading_screen');
		},

		renderSearchResults: function (data) {
			// populate template with correct info
			this.switchTo('artifact_list', {
				artifacts: data.QueryResult.Results
			});
		},

		associateArtifact: function (event) {
			var attributes = event.target.name.split(';');
			var ticket = this.ticket();

			// save the webservices URL
			ticket.customField(this.customfield, attributes[0]);

			// create expected object format
			var data = this.createDefectObject();

			// update the associated ticket count if necessary
			var ticketCount = parseInt(attributes[1], 0);
			if (isNaN(ticketCount)) {
				data.Defect.c_NumberofTickets = 1;
			} else {
				data.Defect.c_NumberofTickets = ticketCount + 1;
			}

			// call out to Rally to update the ticket count
			this.ajax('postAssociateWithTicket', attributes[0], data);

			this.switchTo('loading_screen');
		},

		renderAssociatedArtifact: function (data) {
			var artifact, artifactType;
			if (data.Defect) {
				artifact = data.Defect;
				artifactType = 'defect';
			} else if (data.HierarchicalRequirement) {
				artifact = data.HierarchicalRequirement;
				artifactType = 'userstory';
			} else {
				services.notify(this.I18n.t('cannot_associate'));
				this.switchTo('search_page');
			}

			// create user friendly link
			var webserviceRefURLParts = artifact._ref.split('/');
			var objectId = webserviceRefURLParts[webserviceRefURLParts.length - 1];

			artifact.weblink = 'https://rally1.rallydev.com/#/detail/' + artifactType + '/' + objectId;

			// display details about associated artifact
			this.switchTo('artifact_details', {artifact: artifact});
		},

		removeAssociatedArtifact: function (event) {
			// remove association from ticket
			this.ticket().customField(this.customfield, null);
			this.switchTo('search_page');
		},

		saveDefect: function (event) {
			this.serializeFormData();
			var data = this.createDefectObject();
			data.Defect = this.dataObjectArray;
			data.Defect.c_NumberofTickets = 1;

			this.ajax('postNewDefect', data);
			this.switchTo('loading_screen');
		},

		addReferenceToTicket: function (data) {
			services.notify(this.I18n.t('save_successful'));
			if (data.CreateResult.Object) {
				this.ticket().customField(this.customfield, data.CreateResult.Object._ref);
			}
			this.renderDefaultPage(null);
		},

		afterAssociateArtifact: function (data) {
			services.notify(this.I18n.t('save_successful'));
			this.renderDefaultPage();
		},

		serializeFormData: function () {
			this.dataObjectArray = {};
			this.$userForm = this.$('.form-horizontal').eq(0);
			this.userFormData = this.$userForm.serializeArray();
			_.each(this.userFormData, function (data) {
				if (data.value === '') {
					data.value = undefined;
				}
				this.dataObjectArray[data.name] = data.value;
			}.bind(this));
		},

		createDefectObject: function () {
			var data = {};
			data.Defect = {};
			return data;
		},

		renderNewDefectForm: function (event) {
			this.switchTo('new_defect');
		},

		renderSearchPage: function () {
			this.switchTo('search_page');
		},

		fail: function (data) {
			services.notify(JSON.stringify(data));
		}
	};
}());