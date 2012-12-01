var pages = pages || {}

pages.SourceReport = function(sourceUid, uid) {
    var page = this;

    var saveNeeded = false;

    function createSurvey(options) {
        var survey = (function() {
            var model = new (surveys.SurveyModel.extend({
                defaults : {
                    details : false
                }
            }))();
            var sections = [], questions = [];

            questions.push(new surveys.TextQuestion({
                id : "notes",
                model : model,
                prompt : "Notes",
                multiline : true
            }));

            // Create list of options
            var questionOptions = [];
            questionOptions.push(['rawsewage', "Raw Sewage Present"]);
            questionOptions.push(['foulodor', "Foul Odor"]);
            questionOptions.push(['flowingintowater', "Flowing into nearby water body"]);
            if (page.source.source_type >= 1 && page.source.source_type <= 3) {
                questionOptions.push(['overflowing', "Overflowing"]);
                questionOptions.push(['emptyingpipe', "Emptying from a pipe"]);
                questionOptions.push(['cracked', "Cracked"]);
                questionOptions.push(['brokenopen', "Broken open"]);
            }
            if (page.source.source_type >= 2 && page.source.source_type <= 3)
                questionOptions.push(['missingcover', "Missing cover"]);

            questions.push(new surveys.MulticheckQuestion({
                id : "status",
                model : model,
                prompt : "Status",
                options : questionOptions
            }));

            questions.push(new surveys.DropdownQuestion({
                id : "fullness",
                model : model,
                prompt : "How full is the latrine/septic tank/cesspool?",
                options : [[0, 'Empty'], [1, 'Half-full'], [2, 'Nearly full'], [3, 'Full'], [4, 'Overflowing']],
                conditional : function() {
                    if (page.source.source_type >= 2 && page.source.source_type <= 3)
                        return true;
                    return false;
                }

            }));

            questions.push(new surveys.DropdownQuestion({
                id : "pipesize",
                model : model,
                prompt : "What is the approximate pipe diameter?",
                options : [[5, 'Very small (2 inch / 5 cm)'], [10, 'Small (4 inch / 10 cm)'], [15, 'Medium (6 inch / 15 cm)'], [30, 'Large (12 inch / 30 cm)'], [60, 'Very Large (24 inch / 60 cm)']],
                conditional : function() {
                    if (page.source.source_type >= 4 && page.source.source_type <= 6)
                        return true;
                    if (page.source.source_type == 8)
                        return true;
                    if (page.source.source_type >= 1 && page.source.source_type <= 2)
                        if (_.contains(model.get('status') || [], 'emptyingpipe'))
                            return true;
                    return false;
                }

            }));

            questions.push(new surveys.DropdownQuestion({
                id : "flowrate",
                model : model,
                prompt : "What is the flow rate?",
                options : [[0, 'Not flowing'], [1, 'Trickle'], [2, 'Small steady flow'], [3, 'Medium flow (half of pipe/opening)'], [4, 'Heavy flow (all of pipe/opening)']],
                conditional : function() {
                    if (page.source.source_type >= 1 && page.source.source_type <= 6)
                        return true;
                    if (page.source.source_type == 8)
                        return true;
                    return false;
                }
            }));

            questions.push(new surveys.RadioQuestion({
                id : "details",
                model : model,
                prompt : "Add more details?",
                options : [[false, 'No'], [true, 'Yes']]
            }));

            sections.push(new surveys.Section({
                model : model,
                title : "General Information",
                contents : questions
            }));
            questions=[]

            questions.push(new surveys.TextQuestion({
                id : "locationname",
                model : model,
                prompt : "Village or neighborhood name",
            }));

            questions.push(new surveys.TextQuestion({
                id : "ownername",
                model : model,
                prompt : "Owner's name",
            }));

            questions.push(new surveys.DropdownQuestion({
                id : "toilettype",
                model : model,
                prompt : "What is the type of toilet?",
                options : [['flush', 'Flush Toilet'], ['hanging', 'Trickle'], ['composting', 'Composting toilet'], ['pit', 'Pit latrine'], ['vip', 'Ventilated improved pit latrine']],
                conditional : function() {
                    if (page.source.source_type == 1)
                        return true;
                    return false;
                }
            }));
            
            questions.push(new surveys.NumberQuestion({
                id : "toiletsconnected",
                model : model,
                prompt : "How many toilets are connected to this source?",
                conditional : function() {
                    return (page.source.source_type == 3 || page.source.source_type == 9);
                }

            }));

            questions.push(new surveys.RadioQuestion({
                id : "ownership",
                model : model,
                prompt : "Is publically or privately owned?",
                options : [['private', 'Private'], ['public', 'Public']],
            }));

            questions.push(new surveys.DropdownQuestion({
                id : "connectsto",
                model : model,
                prompt : "The toilet connects to:",
                options : [['unknown', 'Unknown'], ['drainage', 'Drainage ditch/canal'], ['ground', 'Open to ground'], ['sewer', 'Sewer'], ['latrine', 'Latrine'], ['tank', 'Septic tank/cesspool']],
                conditional : function() {
                    if (page.source.source_type == 1 && model.get('toilettype')=='flush')
                        return true;
                    return false;
                }
            }));
            
            questions.push(new surveys.MulticheckQuestion({
                id : "latrinefeatures",
                model : model,
                prompt : "Latrine has:",
                options : [['slab', 'Slab'], ['pourflush', 'Pourflush']],
                conditional : function() {
                    if (page.source.source_type == 1 && model.get('toilettype')=='pit')
                        return true;
                    return false;
                }
            }));

            sections.push(new surveys.Section({
                model : model,
                title : "Details",
                contents : questions,
                conditional : function() {
                    return this.model.get('details') == true;
                }
            }));

            var view = new surveys.SurveyView({
                title : '',
                sections : sections,
                model : model
            });
            return {
                model : model,
                view : view
            };
        })();

        return survey;
    }

    function saveResults(callback) {
        // Read values
        report.results = JSON.stringify(page.survey.model.toJSON());

        page.model.transaction(function(tx) {
            // Insert if required
            if (!report.uid) {
                report.uid = utils.createUid();
                report.created_on = Math.floor(new Date().getTime() / 1000);
                report.source = sourceUid;
                report.created_by = page.syncServer.getUsername();
                page.model.insertRow(tx, "reports", report);
            } else if (saveNeeded) {
                page.model.updateRow(tx, report, {
                    results : report.results
                });
            }
        }, page.error, function() {
            saveNeeded = false;
            if (callback)
                callback();
        });
    }


    this.create = function(callback) {
        this.template("source_report", {}, function(out) {
            page.$el.html(out);
            callback();
        });

    };

    function displayReport() {
        // Create survey
        page.survey = createSurvey();
        page.survey.view.options.onFinish = function() {
            // Save results
            saveResults(function() {
                page.pager.closePage();
            });
        };

        // Load data
        if (report.results)
            page.survey.model.set(JSON.parse(report.results));

        // Record when save needed, or revert change with warning
        page.survey.model.on("change", function() {
            if (uid && !page.auth.canEdit(report)) {
                // Revert change
                page.survey.model.set(page.survey.model.previousAttributes());
                alert("Report is not editable");
            } else
                saveNeeded = true;
        });

        // Display survey
        page.$("#survey").append(page.survey.view.$el);
    }


    this.activate = function() {
        // Get source
        this.model.querySourceByUid(sourceUid, function(source) {
            if (source == null) {
                alert("Source not found");
                page.pager.closePage();
                return;
            }
            page.source = source;

            // Get report
            if (uid) {
                page.model.queryReportByUid(uid, function(r) {
                    report = r;
                    displayReport();
                }, page.error);
            } else {
                report = {};
                displayReport();
            }
        }, page.error);
    };

    this.deactivate = function() {
        // Offer to save changes
        if (saveNeeded && confirm("Save changes?"))
            saveResults();
    };

    this.actionbarTitle = "Source Report";

    this.actionbarMenu = [{
        id : "reset",
        title : "Reset",
    }];

    this.actionbarMenuClick = function(id) {
        if (id == "reset") {
            if (confirm("Reset entire report?")) {
                page.survey.model.clear();
            }
        }
    }

};
