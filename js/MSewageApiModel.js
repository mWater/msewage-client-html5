function MSewageApiModel(syncServer) {
	var that = this;

	this.init = function(success, error) {
		success();
	};

	this.transaction = function(callback, error, success) {
		var tx = {
			jqXhrs : [],
		};
		callback(tx);
		$.when.apply(window, tx.jqXhrs).done(success).fail(error);
	};

	function makeUrl(addr) {
		return syncServer.baseUrl + addr + "?clientuid=" + syncServer.getClientUid();
	}


	this.insertRow = function(tx, table, values) {
		tx.jqXhrs.push($.ajax(makeUrl(table + "/" + values.uid), {
			type : "PUT",
			data : values,
		}));
	};


	this.updateRow = function(tx, row, values) {
		tx.jqXhrs.push($.ajax(makeUrl(row.table + "/" + row.uid), {
			type : "POST",
			data : values,
		}));
	};


	this.deleteRow = function(tx, row) {
		tx.jqXhrs.push($.ajax(makeUrl(row.table + "/" + row.uid), {
			type : "DELETE",
		}));
	};

	function Row(table) {
		this.table = table;
	}

	function rowifyArray(array, table) {
	    var i;
		for (i = 0; i < array.length; i++)
			_.extend(array[i], new Row(table));
		return array;
	}


	this.queryNearbySources = function(latitude, longitude, search, success, error) {
		console.log("Begin query");
		var lat = (latitude - 1) + "," + (latitude + 1);
		var lng = (longitude - 1) + "," + (longitude + 1);

		$.get(makeUrl("sources"), {
			latitude : lat,
			longitude : lng
		}, function(data) {
			var src = data.sources;
			src = _.sortBy(src, function(s) {
				return (latitude - s.latitude) * (latitude - s.latitude) + (longitude - s.longitude) * (longitude - s.longitude);
			});

			if (search)
				src = _.filter(src, function(s) {
					return (s.name && s.name.indexOf(search) != -1) || (s.code && s.code.indexOf(search) != -1);
				});

			rowifyArray(src, "sources");
			success(src);
		}).error(error);
	};


	this.queryUnlocatedSources = function(createdBy, search, success, error) {
		$.get(makeUrl("sources"), {
			latitude : "null",
			created_by : createdBy
		}, function(data) {
			var src = data.sources;
			if (search)
				src = _.filter(src, function(s) {
					return (s.name && s.name.indexOf(search) != -1) || (s.code && s.code.indexOf(search) != -1);
				});
			rowifyArray(src, "sources");
			success(src);
		}).error(error);

	};


	this.querySourceByUid = function(uid, success, error) {
		$.get(makeUrl("sources/" + uid), function(data) {
			success(_.extend(data, new Row("sources")));
		}).error(error);
	};

	this.querySourceReports = function(sourceUid, success, error) {
		$.get(makeUrl("sources/" + sourceUid + "/reports"), function(data) {
			success(rowifyArray(data.reports, "reports"));
		}).error(error);
	};

	this.queryReportByUid = function(uid, success, error) {
		$.get(makeUrl("reports/" + uid), function(data) {
			success(_.extend(data, new Row("reports")));
		}).error(error);
	};

	// List of source type ids
	// TODO replace with query
	this.sourceTypes = _.range(10);
}
