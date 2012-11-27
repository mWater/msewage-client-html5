var pages = pages || {}

/* Displays details of a source */
pages.Source = function(uid, setLocation, hideLocation) {
	this.uid = uid;

	var page = this;
	var source;

	var locationWatchId;
	var position;

	this.refresh = function() {
		function displaySource() {
			// Display photo
			new PhotoDisplayer(page, page.$("#photo"), source, page.error);

			page.$("#location_set").on("tap", function() {
				if (confirm("Set to current location?")) {
					setLocation = true;
					displayLocation();
				}
			});

			page.$("#location_map").on("tap", function() {
				if (source.latitude)
					page.pager.loadPage("Map", [{
						latitude : source.latitude,
						longitude : source.longitude
					}]);
			});

			if (hideLocation)
				page.$("#location").hide();

			page.$("#edit_source_button").on("tap", function() {
				page.pager.loadPage("SourceEdit", [source.uid]);
			});

			page.$("#add_report_button").on("tap", function() {
				page.pager.loadPage("SourceReport", [source.uid]);
			});

			Pager.makeTappable(page.$("#reports"), function(row) {
				page.pager.loadPage("SourceReport", [source.uid, row.id]);
			});

			if (!page.auth.canEdit(source)) {
				page.$("#edit_source_button, #location_set").attr("disabled", true);
			}

			if (!page.auth.canAdd("source_reports")) {
				page.$("#add_report_button").attr("disabled", true);
			}

			if (!hideLocation)
				displayLocation();

			// Fill reports
			page.model.querySourceReports(source.uid, function(reports) {
				var view = {
					reports : _.map(reports, function(n) {
					    return _.extend(n, { notes: JSON.parse(n.results).notes });
					})
				}
				page.template("source_reports", view, $("#reports"));
			}, page.error);
		}


		this.model.querySourceByUid(this.uid, function(src) {
			if (src == null) {
				alert("Source not found");
				page.pager.closePage();
				return;
			}
			source = src;
			page.template("source", source, function(out) {
				page.$el.html(out);
				displaySource();
			});
		}, page.error);
	};

	function displayLocation() {
		if (!source)
			return;

		page.$("#location_map").attr("disabled", !source.latitude);

		// If setting location and position available, set position
		if (setLocation && position) {
			setLocation = false;
			// Set in source
			page.model.transaction(function(tx) {
				page.model.updateRow(tx, source, {
					latitude : position.coords.latitude,
					longitude : position.coords.longitude,
				});
			}, page.error, function() {
				page.refresh();
			});
			return;
		}

		// If setting location, indicate
		if (setLocation)
			page.$("#location_relative").text("Setting location...");
		else if (!source.latitude)// If no position, indicate
			page.$("#location_relative").html('Unspecified location');
		else if (!position)// If waiting for position
			page.$("#location_relative").html('<img src="images/ajax-loader.gif"/>Waiting for GPS');
		else
			page.$("#location_relative").text(utils.getRelativeLocation(position.coords.longitude, position.coords.latitude, source.longitude, source.latitude));
	}


	this.activate = function() {
		this.refresh();

		function geolocationSuccess(pos) {
			position = pos;
			displayLocation();
		}

		function geolocationError(error) {
			//page.$("#location").text("Error finding location");
		}

		// Start location watch
		if (displayLocation) {
			locationWatchId = navigator.geolocation.watchPosition(geolocationSuccess, geolocationError, {
				maximumAge : 3000,
				enableHighAccuracy : true
			});
		}
	};


	this.deactivate = function() {
		// End location watch
		if (displayLocation) 
			navigator.geolocation.clearWatch(locationWatchId);
	};


	this.actionbarMenu = [{
		id : "delete",
		title : "Delete",
	}];

	this.actionbarTitle = "Source";

	this.actionbarMenuClick = function(id) {
		if (id == "delete") {
			if (!page.auth.canDelete(source)) {
				alert("Insufficient permissions");
				return;
			}

			if (confirm("Permanently delete source?")) {
				page.model.transaction(function(tx) {
					page.model.deleteRow(tx, source);
				}, page.error, function() {
					page.pager.closePage();
				});
			}
		}
	}

}
