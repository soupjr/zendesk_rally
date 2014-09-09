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
			'app.activated'                     : 'init',
			'click .btn_search_rally_alm'       : 'searchForDefects',
			'click .associate_artifact'         : 'associateArtifact',
			'click .back_to_start'              : 'renderStartPage',
			'fetchNumberSearchResults.done'     : 'renderSearchResults',
			'fetchTextSearchResults.done'       : 'renderSearchResults',
			'postAssociateWithTicket.done'      : 'renderAssociatedArtifact',
			'fetchAuthorizationKey.done'        : 'postInit',
			'fetchNumberSearchResults.fail'     : 'fail',
			'fetchTextSearchResults.fail'       : 'fail',
			'postAssociateWithTicket.fail'      : 'fail',
			'fetchAuthorizationKey.fail'        : 'fail'
		},
		// @formatter:on

		init: function () {
			this.username = this.setting('username');
			this.password = this.setting('password');
			this.workspace = this.setting('workspace');
			this.project = this.setting('project');

			// Authorize with Rally and store it
			this.ajax('fetchAuthorizationKey');
		},

		postInit: function (data) {
			if (data.OperationResult.SecurityToken) {
				this.store('rally.key', data.OperationResult.SecurityToken);
				console.log("Generated and stored this Rally security token: " + data.OperationResult.SecurityToken);
			} else {
				console.error(data);
				services.notify("Could not authorize your credentials with Rally. Check your settings");
			}

			var apiField = this.ticket().customField("custom_field_22430739");
			console.log("ticket's API link field: " + apiField);
			// if the ticket has a link, display it
			if (apiField || apiField === "") {
				// show details page
				services.notify('show the details page, but it is not created yet so you are going to the start anyway');
				this.switchTo('start_page');
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
			// console.log(data.QueryResult.Results);
			// populate handlebars template with correct info
			this.switchTo('artifact_list', {
				artifacts: data.QueryResult.Results
			});
		},

		associateArtifact: function (event) {
			var attributes = event.target.name.split(';');

			console.log(attributes[0]);
			// get the objectID from the _ref. As of 2.0 this is the only way I can get it
			var webserviceRefURLParts = attributes[0].split("/");
			var objectId = webserviceRefURLParts[webserviceRefURLParts.length - 1];

			// Need to determind what type of artifact
			var artifactType = attributes[1] === "Defect" ? "defect" : "userstory";

			// save the webservices URL
			ticket.customField("custom_field_22430739", attributes[1]);

			// save details URL to ticket for users to view in Rally on web
			var ticket = this.ticket();
			ticket.customField("custom_field_22448315",
							"https://rally1.rallydev.com/#/detail/" + artifactType + "/" + objectId);

			// update the associated ticket count
			var updatedTicketCount = parseInt(attributes[2], 0);
			if (isNaN(updatedTicketCount)) {
				updatedTicketCount = 1;
			} else {
				updatedTicketCount = updatedTicketCount + 1;
			}

			// create expected object format
			var data = {};
			data.Defect = {};
			data.Defect.c_NumberofTickets = updatedTicketCount;
			//console.log(JSON.stringify(data));

			// call out to Rally to update the ticket count
			var mykey = this.store('rally.key');
			console.log("Going to use this URL to POST an update: " + attributes[0] + "?key=" + mykey);
			this.ajax('postAssociateWithTicket', attributes[0] + "?key=" + mykey, data);

			this.switchTo('loading_screen');
		},

		renderAssociatedArtifact: function (data) {
			console.log(data);
			// display details about associated artifact
			services.notify("Everything went okay.");
			this.switchTo('start_page');
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