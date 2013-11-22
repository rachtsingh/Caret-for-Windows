define(["manos"], function(M) {
  
  /*
  
  Unfortunately, mimicking Node isn't really feasible given the Chrome OS security model, but we still don't want to deal with the annoying Chrome filesystem APIs. This module wraps those in a more usable File object.
    
  */
  
  var noop = function() {};
  
  var File = function(entry) {
    this.entry = entry || null;
    this.onWrite = noop;
  };
  
  File.prototype = {
    open: function(mode, c, ending, prettyending) {
      var self = this;
      if (typeof mode == "function") {
        c = mode;
        mode = "open";
      }
      //mode is "open" or "save"
      var modes = {
        "open": "openWritableFile",
        "save": "saveFile"
      };
      // changes here to use WinJS API

      /*
      chrome.fileSystem.chooseEntry({
        type: modes[mode]
      }, function(entry) {
        //cancelling acts like an error, but isn't.
        if (!entry) return;
        self.entry = entry;
        c(null, self)
      });*/


      var currentState = Windows.UI.ViewManagement.ApplicationView.value;
      if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
        !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
          // Fail silently if we can't unsnap
          return;
      }

      // switch cases depending on whether this is a new file or not
      if (mode == "open") {
          var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
          openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.list;
          openPicker.fileTypeFilter.replaceAll(["*"]);
          // Open the picker for the user to pick a file
          openPicker.pickSingleFileAsync().then(function (file) {
              if (file) {
                  // Application now has read/write access to the picked file
                  //WinJS.log && WinJS.log("Picked photo: " + file.name, "sample", "status");
                  self.entry = file;
                  c(null, self);
              } else {
                  // The picker was dismissed with no selected file
                  WinJS.log && WinJS.log("Operation cancelled.", "sample", "status");
                  return;
              }
          });
      }
      else if (mode == "save") {
          // Create the picker object and set options
          var savePicker = new Windows.Storage.Pickers.FileSavePicker();
          savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
          // Dropdown of file types the user can save the file as\
          if (ending && prettyending) {
              console.log(ending);
              ending = ending.map(function(end){
                  return '.' + end;
              })
              savePicker.fileTypeChoices.insert(prettyending, ending);
          }
          else {
              savePicker.fileTypeChoices.insert("Plain Text", [".txt"]);
          }
          // savePicker.fileTypeChoices.insert("All Files", [""]);
          // Default file name if the user does not type one in or select a file to replace
          savePicker.suggestedFileName = "untitled";
          savePicker.pickSaveFileAsync().done(function (file) {
              if (file) {
                  self.entry = file;
                  c(null, self);
              }
              else {
                  c("File save not successful");
                  return;
              }
          });
      }
      else {
          c("Tab save method is not defined");
      }
      

    },
    read: function(c) {
      if (!this.entry) {
        console.error(this);
        c("File not opened", null);
      }

      // add error handling this is bad
      Windows.Storage.FileIO.readTextAsync(this.entry).then(function (contents) {
          c(null, contents);
      });
      /*
      var reader = new FileReader();
      reader.onload = function() {
        c(null, reader.result);
      };
      reader.onerror = function() {
        console.error("File read error!");
        c(err, null);
      };
      this.entry.file(function(f) {
        reader.readAsText(f);
      });
      */
    },
    write: function(data, c) {
      var self = this;
      if (!this.entry) {
        //guard against cases where we accidentally write before opening
        self.open("save", function() {
          self.write(data, c);
        });
        return;
      }
      c = c || function() {};
      M.chain(
        //check permissions
        /*function(next) {
          chrome.fileSystem.isWritableEntry(self.entry, next);
        },*/
        //if read-only, try to open as writable
        /*function(ok, next) {
          if (!ok) {
            return chrome.fileSystem.getWritableEntry(self.entry, function(entry) {
              if (entry) {
                self.entry = entry;
                next();
              } else {
                c("Couldn't open file as writable", self);
              }
            });
          }
          next();
        },*/
        //write file
        function() {
          Windows.Storage.FileIO.writeTextAsync(self.entry, data).then(function () {              
              c(null, self);
              self.onWrite();
          });
          // commented because chrome
          /*
          self.entry.createWriter(function(writer) {
            writer.onerror = function(err) {
              console.error(err);
              c(err, self);
            }
            writer.onwriteend = function() {
              //after truncation, actually write the file
              writer.onwriteend = function() {
                c(null, self);
                self.onWrite();
              }
              var blob = new Blob([data]);
              writer.write(blob);
            };
            writer.truncate(0);
          });
          */
        }
      );
    },
    stat: function(c) {
      if (this.entry) {
        return this.entry.file(function(f) {
          c(null, f);
        });
      }
      return c("No entry");
    },
    /*retain: function() {
      return chrome.fileSystem.retainEntry(this.entry);
    },*/
    /*restore: function(id, c) {
      var self = this;
      chrome.fileSystem.isRestorable(id, function(is) {
        if (is) {
          chrome.fileSystem.restoreEntry(id, function(entry) {
            if (!entry) return c("restoreEntry() failed for " + id, null);
            self.entry = entry;
            c(null, self);
          });
        } else {
          c("isRestorable() returned false for " + id, null);
        }
      });
    },*/
    /*getPath: function(c) {
      chrome.fileSystem.getDisplayPath(this.entry, c);
    }*/
  };
  
  return File;

});