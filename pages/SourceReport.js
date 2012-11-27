var pages = pages || {}

pages.SourceReport = function(sourceUid, uid) {
    var page = this;

    function createSurvey(options) {
        var survey = (function() {
            var model = new surveys.SurveyModel();
            var sections = [], questions = [];

            questions.push(new surveys.TextQuestion({
                id : "notes",
                model : model,
                prompt : "Notes",
                multiline: true
            }));
            
            // Create list of options
            var questionOptions = [];
            questionOptions.push(['rawsewage', "Raw Sewage Present"]); 
            questionOptions.push(['foulodor', "Foul Odor"]); 

            questions.push(new surveys.MulticheckQuestion({
                id : "status",
                model : model,
                prompt : "Status",
                options : questionOptions
            }));

            sections.push(new surveys.Section({
                model : model,
                title : "General Information",
                contents : questions
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
    
    var needsSave = false;

    function saveResults() {
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
            } else if (needsSave) {
                page.model.updateRow(tx, report, {
                    results : report.results
                });
            }
        }, page.error, function() {
            page.pager.closePage();
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
            saveResults();
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
            }
            else 
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
        if (needsSave && confirm("Save changes?"))
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
