(function() {
  var Choosealicense, LicenseSuggestion,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Choosealicense = (function() {
    Choosealicense.prototype.selectText = function(element) {
      var range, selection;
      if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        return range.select();
      } else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        return selection.addRange(range);
      }
    };

    Choosealicense.prototype.qtip_position = {
      my: "top center",
      at: "bottom center"
    };

    Choosealicense.prototype.ruletypes = {
      permissions: "Permission",
      conditions: "Condition",
      limitations: "Limitation"
    };

    function Choosealicense() {
      this.initTooltips();
      this.initClipboard();
      this.initLicenseSuggestion();
    }

    Choosealicense.prototype.initTooltips = function() {
      var i, label, len, ref, ref1, rule, rules, ruletype;
      ref = window.annotations;
      for (ruletype in ref) {
        rules = ref[ruletype];
        for (i = 0, len = rules.length; i < len; i++) {
          rule = rules[i];
          $(".license-" + ruletype + " ." + rule["tag"]).attr("title", rule["description"]);
        }
      }
      ref1 = this.ruletypes;
      for (ruletype in ref1) {
        label = ref1[ruletype];
        $(".license-" + ruletype + " li, .license-" + ruletype + " .license-sprite").qtip({
          content: {
            text: false,
            title: {
              text: label
            }
          },
          position: this.qtip_position,
          style: {
            classes: "qtip-shadow qtip-" + ruletype
          }
        });
      }
      return false;
    };

    Choosealicense.prototype.initClipboard = function() {
      var clip;
      $(".js-clipboard-button").data("clipboard-prompt", $(".js-clipboard-button").text());
      clip = new Clipboard(".js-clipboard-button");
      clip.on("mouseout", this.clipboardMouseout);
      return clip.on("complete", this.clipboardComplete);
    };

    Choosealicense.prototype.clipboardMouseout = function(client, args) {
      return this.textContent = $(this).data("clipboard-prompt");
    };

    Choosealicense.prototype.clipboardComplete = function(client, args) {
      return this.textContent = "Copied!";
    };

    Choosealicense.prototype.initLicenseSuggestion = function() {
      var inputEl, licenseId, statusIndicator;
      inputEl = $("#repository-url");
      licenseId = inputEl.attr("data-license-id");
      statusIndicator = $(".status-indicator");
      return new LicenseSuggestion(inputEl, licenseId, statusIndicator);
    };

    return Choosealicense;

  })();

  LicenseSuggestion = (function() {
    function LicenseSuggestion(inputEl1, licenseId1, statusIndicator1) {
      this.inputEl = inputEl1;
      this.licenseId = licenseId1;
      this.statusIndicator = statusIndicator1;
      this.setStatus = bind(this.setStatus, this);
      this.bindEventHandlers = bind(this.bindEventHandlers, this);
      this.setupTooltips = bind(this.setupTooltips, this);
      this.setupTooltips();
      this.bindEventHandlers();
    }

    LicenseSuggestion.prototype.setupTooltips = function() {
      return this.inputEl.qtip({
        content: {
          text: false,
          title: {
            text: "message"
          }
        },
        show: false,
        hide: false,
        position: {
          my: "top center",
          at: "bottom center"
        },
        style: {
          classes: "qtip-shadow"
        }
      });
    };

    LicenseSuggestion.prototype.bindEventHandlers = function() {
      return this.inputEl.on("input", (function(_this) {
        return function(event) {
          return _this.setStatus("");
        };
      })(this)).on("keyup", (function(_this) {
        return function(event) {
          var repositoryFullName;
          if (event.keyCode === 13 && event.target.value) {
            try {
              repositoryFullName = _this.parseUserInput(event.target.value);
            } catch (error) {
              _this.setStatus("Error", "Invalid URL.");
              return;
            }
            _this.setStatus("Fetching");
            return _this.fetchInfoFromGithubAPI(repositoryFullName, function(err, repositoryInfo) {
              var license, licenseUrl;
              if (repositoryInfo == null) {
                repositoryInfo = null;
              }
              if (err) {
                _this.setStatus("Error", err.message);
                return;
              }
              if (repositoryInfo.license) {
                license = repositoryInfo.license;
                return _this.setStatus("Error", _this.repositoryLicense(repositoryFullName, license));
              } else {
                licenseUrl = encodeURIComponent("https://github.com/" + repositoryFullName + "/community/license/new?template=" + _this.licenseId);
                window.location.href = "https://github.com/login?return_to=" + licenseUrl;
                _this.setStatus("");
                return _this.inputEl.val("");
              }
            });
          }
        };
      })(this));
    };

    LicenseSuggestion.prototype.parseUserInput = function(userInput) {
      var _, project, repository, username;
      repository = /https?:\/\/github\.com\/(.*?)\/(.+)(\.git)?$/.exec(userInput);
      _ = repository[0], username = repository[1], project = repository[2];
      project = project.split(/\/|\.git/).filter(function(str) {
        return str;
      }).slice(0, 1).join("");
      return username + '/' + project;
    };

    LicenseSuggestion.prototype.setStatus = function(status, message) {
      var displayQtip, statusClass;
      if (status == null) {
        status = "";
      }
      if (message == null) {
        message = "";
      }
      statusClass = status.toLowerCase();
      displayQtip = (function(_this) {
        return function(status, message) {
          return _this.inputEl.qtip("api").set("content.text", message).set("content.title", status).set("style.classes", "qtip-shadow qtip-" + statusClass).show();
        };
      })(this);
      switch (status) {
        case "Fetching":
          return this.statusIndicator.removeClass('error').addClass(statusClass);
        case "Error":
          this.statusIndicator.removeClass('fetching').addClass(statusClass);
          return displayQtip(status, message);
        default:
          this.inputEl.qtip("api").hide();
          return this.statusIndicator.removeClass('fetching error');
      }
    };

    LicenseSuggestion.prototype.fetchInfoFromGithubAPI = function(repositoryFullName, callback) {
      return $.getJSON("https://api.github.com/repos/" + repositoryFullName, function(info) {
        return callback(null, info);
      }).fail(function(e) {
        if (e.status === 404) {
          return callback(new Error("Repository <b>" + repositoryFullName + "</b> not found."));
        } else {
          return callback(new Error("Network error when trying to get information about <b>" + repositoryFullName + "</b>."));
        }
      });
    };

    LicenseSuggestion.prototype.repositoryLicense = function(repositoryFullName, license) {
      var foundLicense;
      foundLicense = window.licenses.find(function(lic) {
        return lic.spdx_id === license.spdx_id;
      });
      if (foundLicense) {
        return "The repository <b> " + repositoryFullName + "</b> is already licensed under the <a href='/licenses/" + (foundLicense.spdx_id.toLowerCase()) + "'><b>" + foundLicense.title + "</b></a>.";
      } else {
        return "The repository <b> " + repositoryFullName + "</b> is already licensed.";
      }
    };

    return LicenseSuggestion;

  })();

  $(function() {
    return new Choosealicense();
  });

}).call(this);
