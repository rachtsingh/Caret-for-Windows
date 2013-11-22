define([
    "sessions",
    "file",
    "dialog",
    "command",
    "settings!", //not excited, it just runs as a RequireJS plugin,
    "manos"
  ], function(sessions, File, dialog, command, Settings, M) {

  var openFile = function() {
    //have to call chooseEntry manually to support multiple files
    var args = {
      type: "openWritableFile"
    };
    /*if (chrome.version >= 30) {
      args.acceptsMultiple = true;
    }*/
    var currentState = Windows.UI.ViewManagement.ApplicationView.value;
    if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
      !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
      // Fail silently if we can't unsnap
      return;
    }
    var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
    openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.list;
    openPicker.fileTypeFilter.replaceAll(["*"]);

    // Open the picker for the user to pick a file
    openPicker.pickSingleFileAsync().then(function (file) {
        if (file) {
            var f = new File(file);
            f.read(function(err, data) {
              if (err) {
                dialog(err);
                return;
              }
              sessions.addFile(data, f);
            });
        } else {
            // The picker was dismissed with no selected file
            WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
            return;
        }
    });
    /*chrome.fileSystem.chooseEntry(args, function(files) {
      //annoying array function test, since it's not apparently a real array
      if (!files.slice) {
        files = [ files ];
      };
      files.forEach(function(entry) {
        var f = new File(entry);
        f.read(function(err, data) {
          if (err) {
            dialog(err);
            return;
          }
          sessions.addFile(data, f);
        });
      });
    });*/
  };
  
  /*var openFromLaunchData = function() {
    if (window.launchData) {
      window.launchData.forEach(function(file) {
        var f = new File(file.entry);
        f.read(function(err, contents) {
          if (err) {
            dialog(err);
            return;
          }
          sessions.addFile(contents, f);
        });
      });
    }
  };*/
  
  command.on("session:new-file", function() { sessions.addFile() });
  command.on("session:open-file", openFile);
  command.on("session:save-file", function() { sessions.getCurrent().save() });
  command.on("session:save-file-as", function() { 
    var tab = sessions.getCurrent();
    tab.save(true, function() {
      sessions.setSyntax(tab);
    });  
  });
  
  command.on("session:revert-file", function() {
    var tab = sessions.getCurrent();
    if (!tab.file) return;
    tab.file.read(function(err, data) {
      if (err) return;
      tab.setValue(data);
      tab.modified = false;
      sessions.renderTabs();
    });
  });
  
  /*command.on("session:check-file", function() {
    var tab = sessions.getCurrent();
    if (!tab.file || tab.file.virtual) return;
    tab.file.entry.file(function(entry) {
      if (tab.modifiedAt && entry.lastModifiedDate > tab.modifiedAt) {
        if (tab.modified) {
          dialog(
            "This file has been modified since the last time it was saved. Would you like to reload?",
            [{label: "Reload", value: true}, {label: "Cancel", value: false, focus: true}],
            function(confirmed) {
              if (confirmed) {
                command.fire("session:revert-file");
              } else {
                tab.modifiedAt = new Date();
              }
            }
          );
        } else {
          command.fire("session:revert-file");
        }
      }
    });
  });*/
  
  command.on("session:open-settings-file", function(name) {
    Settings.load(name, function() {
      var data = Settings.getAsString(name);
      var file = Settings.getAsFile(name);
      sessions.addFile(data, file);
    });
  });
  
  //defaults don't get loaded as files, just as content
  command.on("session:open-settings-defaults", function(name) {
    sessions.addDefaultsFile(name);
  });
  
  //command.on("session:open-launch", openFromLaunchData);
  
  var init = function() {
    //openFromLaunchData();
    /*chrome.storage.local.get("retained", function(data) {
      var failures = [];
      if (data.retained && data.retained.length) {
        //try to restore items in order
        M.map(
          data.retained,
          function(id, i, c) {
            var file = new File();
            M.chain(
              function(next) {
                file.restore(id, next);
              },
              function(err, _, next) {
                if (err) {
                  failures.push(id);
                  return c(false);
                }
                file.read(next);
              },
              function(err, data) {
                if (err) {
                  failures.push(id);
                  return c(false);
                }
                c({
                  value: data,
                  file: file
                });
              }
            );
          },
          function(restored) {
            restored = restored.filter(function(d) { return d });
            for (var i = 0; i < restored.length; i++) {
              var tab = restored[i];
              sessions.addFile(tab.value, tab.file);
            }
            if (!failures.length) return;
            chrome.storage.local.get("retained", function(data) {
              if (!data.retained) return;
              chrome.storage.local.set({
                retained: data.retained.filter(function(d) { return failures.indexOf(d) == -1 })
              });
            });
          }
        );
      }
    });*/
  };
  
  var reset = function() {
    var tabs = sessions.getAllTabs();
    tabs.forEach(function(tab) {
        if (tab.file && tab.file.virtual) {
            //debug.push(tab);
            var setting = tab.fileName.replace(".json", "");
            Settings.load(setting, function() {
                var value = Settings.getAsString(setting);
                tab.setValue(value);
                tab.modified = false;
                sessions.renderTabs();
            });
        }
    });
  };
  
  command.on("init:startup", init);
  command.on("init:restart", reset);

});