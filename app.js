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
			'postAssociateWithCase.done'        : 'renderAssociatedArtifact',
			'fetchNumberSearchResults.fail'     : 'fail',
			'fetchTextSearchResults.fail'       : 'fail',
			'postAssociateWithCase.fail'        : 'fail'
		},
		// @formatter:on

		init: function () {
			this.api_url = this.setting('api_url');
			this.api_token = this.setting('api_token');

			// get current ticket's rally link

			// if the link isn't blank, try to fetch the artifact

			if (false) {
				// if an artifact returns
				// show details page
			} else {
				// no artifact, so search
				this.switchTo('start_page');
			}
		},

		searchForDefects: function (event) {
			console.log(event);
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
			//console.log(data.QueryResult.Results);
			// populate handlebars template with correct info
			this.switchTo('artifact_list', {
				artifacts: data.QueryResult.Results
			});
		},

		associateArtifact: function (event) {
			console.log(event);

			// save URL to ticket
			var ticket = this.ticket();
			//console.log('custom field: ' + ticket.customField("custom_field_22448315", 'troyistheman'));
			ticket.customField("custom_field_22448315", 'troyistheman');

			// call out to Rally to update the ticket count
			//this.ajax('fetchArtifact');

			//this.switchTo('loading_screen');
		},

		renderAssociatedArtifact: function () {
			// display details about associated artifact
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
				if (data.name === 'friends') {
					data.value = _.map(data.value.split(';'), function (name) {
						return name.trim();
					});
					data.value = _.filter(data.value, function (name) {
						return name !== '';
					});
					if (data.value.length === 0) {
						data.value = undefined;
					}
				}
				if (data.name === 'married') {
					data.value = !!data.value;
				}
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