(function () {

	return {

		defaultState: 'loading_screen',

		resources: {},

		requests: {

			fetchTextSearchResults: function (searchTerm) {
				//console.log("search term " + searchTerm);

				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact?query=((Name contains ' + searchTerm +
							') OR (Description contains ' + searchTerm + '))&fetch=FormattedID,Name,Description,c_NumberofTickets',
					type: 'GET',
					dataType: 'json',
					username: 'tcampbell@bidpalnetwork.com',
					password: 'QjXYYbUFiu7iMD2Adq'
				};
			},

			fetchNumberSearchResults: function (searchTerm) {
				// console.log("search term " + searchTerm);
				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact?query=((FormattedID = DE' + searchTerm +
							') OR (FormattedID = US' + searchTerm + '))&fetch=FormattedId,Name,Description,c_NumberofTickets',
					type: 'GET',
					dataType: 'json',
					username: 'tcampbell@bidpalnetwork.com',
					password: 'QjXYYbUFiu7iMD2Adq'
				};
			},

			fetchArtifact: function (url) {
				return {
					url: url + '?fetch=FormattedID,Name,Description',
					type: 'GET',
					dataType: 'json',
					username: 'tcampbell@bidpalnetwork.com',
					password: 'QjXYYbUFiu7iMD2Adq'
				};
			},

			fetchAuthorizationKey: function () {
				return {
					url: 'https://rally1.rallydev.com/slm/webservice/v2.0/security/authorize',
					type: 'GET',
					dataType: 'json',
					username: 'tcampbell@bidpalnetwork.com',
					password: 'QjXYYbUFiu7iMD2Adq'
				};
			},

			postAssociateWithTicket: function (url, data) {
				return {
					url: url,
					type: 'POST',
					dataType: 'json',
					contentType: 'application/json; charset=UTF-8',
					data: JSON.stringify(data)
				};
			}
		},
		// @formatter:off
		events: {
			'app.activated'                     : 'postInit',
			'click .btn_search_rally_alm'       : 'searchForDefects',
			'click .associate_artifact'         : 'associateArtifact',
			'click .back_to_start'              : 'renderStartPage',
			'click .btn_remove_artifact'        : 'removeAssociatedArtifact',
			'click .btn_new_defect'             : 'renderNewDefectForm',
			'click .btn_cancel_new_defect'      : 'postInit',
			'click .btn_save_new_defect'        : 'postInit',
			'fetchNumberSearchResults.done'     : 'renderSearchResults',
			'fetchTextSearchResults.done'       : 'renderSearchResults',
			'postAssociateWithTicket.done'      : 'tempRenderAssociatedArtifact',
			'fetchAuthorizationKey.done'        : 'postInit',
			'fetchArtifact.done'                : 'renderAssociatedArtifact',
			'fetchNumberSearchResults.fail'     : 'fail',
			'fetchTextSearchResults.fail'       : 'fail',
			'postAssociateWithTicket.fail'      : 'fail',
			'fetchAuthorizationKey.fail'        : 'fail',
			'fetchArtifact.fail'                : 'fail'
		},
		// @formatter:on

//		init: function () {
//			this.username = this.setting('username');
//			this.password = this.setting('password');
//			this.workspace = this.setting('workspace');
//			this.project = this.setting('project');
//
//			// Authorize with Rally and store it
//			this.ajax('fetchAuthorizationKey');
//		},

		postInit: function (data) {
//			if (data.OperationResult.SecurityToken) {
//				this.store('rally.key', data.OperationResult.SecurityToken);
//				console.log("Generated and stored this Rally security token: " + data.OperationResult.SecurityToken);
//			} else {
//				console.error(data);
//				services.notify("Could not authorize your credentials with Rally. Check your settings");
//			}

			var apiURL = this.ticket().customField("custom_field_22430739");

			// if the ticket has a link, display it
			if (apiURL || apiURL === "") {
				// show details page
				this.ajax('fetchArtifact', apiURL);
			} else {
				// no artifact, so search
				this.switchTo('start_page');
			}
		},

		searchForDefects: function (event) {
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
			ticket.customField("custom_field_22430739", attributes[0]);

			// update the associated ticket count
			var updatedTicketCount = parseInt(attributes[1], 0);
			if (isNaN(updatedTicketCount)) {
				updatedTicketCount = 1;
			} else {
				updatedTicketCount = updatedTicketCount + 1;
			}

			// create expected object format
			var data = {};
			data.Defect = {};
			data.Defect.c_NumberofTickets = updatedTicketCount;

			// call out to Rally to update the ticket count
			var mykey = '_LYHgRC3mSs6oiO8Uk9HheAFlbLDaC03InO4hMvydFM';
			//var mykey = this.store('rally.key');
			console.log("Going to use this URL to POST an update: " + attributes[0] + "?key=" + mykey);
			this.ajax('postAssociateWithTicket', attributes[0] + "?key=" + mykey, data);

			this.switchTo('loading_screen');
		},

		renderAssociatedArtifact: function (data) {
			var artifact = data.Defect;

			// create user friendly link
			var webserviceRefURLParts = artifact._ref.split('/');
			var objectId = webserviceRefURLParts[webserviceRefURLParts.length - 1];
			var artifactType = webserviceRefURLParts[webserviceRefURLParts.length - 2];

			artifact.weblink = 'https://rally1.rallydev.com/#/detail/' + artifactType + '/' + objectId;

			// display details about associated artifact
			this.switchTo('artifact_details', {artifact: artifact});
		},

		removeAssociatedArtifact: function (event) {
			// remove association from
			this.ticket().customField("custom_field_22430739", null);
			this.switchTo('start_page');
		},

		tempRenderAssociatedArtifact: function (data) {
			// need to do something here.
			console.log(data);
			//show search page
			this.switchTo('start_page');
		},

		renderNewDefectForm: function (event) {
			this.switchTo('new_defect');
		},

		fail: function (data) {
			console.log(data);
			services.notify(JSON.stringify(data));
		},

		/* Additional helpers - borrowed from Zendesk demo app (thanks!) */
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

		renderStartPage: function () {
			this.switchTo('start_page');
		}
	};

}());