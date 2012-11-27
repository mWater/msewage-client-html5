i18n = {
	localizeField: function(field, value) {
		var key = field + "." + value;
		if (this[key])
			return i18n[key];
		return key;
	},
	"sources.source_type.0" : "Open defecation site",
	"sources.source_type.1" : "Toilet emptying to ground or water",
	"sources.source_type.2" : "Latrine tank",
	"sources.source_type.3" : "Septic tank",
	"sources.source_type.4" : "Raw sewage outflow",
	"sources.source_type.5" : "Treatment plant outflow",
	"sources.source_type.6" : "Combined sewer outflow",
	"sources.source_type.7" : "Animal manure",
	"sources.source_type.8" : "Industrial waste outflow",
	"sources.source_type.9" : "Open sewage canal or puddle"
}

