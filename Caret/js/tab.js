define(["command", "file"], function(command, File) {

  var EditSession = ace.require("ace/edit_session").EditSession;
  
  var Tab = function(contents, file) {
    contents = contents || "";
    EditSession.call(this, contents, "ace/mode/text");
    
    if (contents) {
      this.setValue(contents);
    }
    
    if (file) {
      this.setFile(file);
    } else {
      this.fileName = "untitled.txt";
    }
    
    this.modified = false;

    // added a line endings
    this.ending = ['txt'];
    this.prettyEnding = "Plain Text";
    
    this.setUndoManager(new ace.UndoManager());
    
    var self = this;
    
    this.on("change", function() {
      if (self.modified) return;
      self.modified = true;
      command.fire("session:render");
    });
    
    this.animationClass = "enter";
    
  };
  
  //hopefully this never screws up unaugmented Ace sessions.
  Tab.prototype = EditSession.prototype;
  
  Tab.prototype.setFile = function(file) {
    this.file = file;
    this.fileName = file.entry.name;
    this.ending = [file.entry.name.split('.')[1] || 'txt'];
    this.modifiedAt = new Date();
  }
  
  Tab.prototype.save = function(as, c) {
    if (typeof as == "function") {
      c = as;
      as = false;
    }
    var content = this.getValue();
    var self = this;

    var whenOpen = function() {
      self.file.write(content, function() {
        self.modifiedAt = new Date();
        if (c) c();
      });
      self.modified = false;
      editor.focus();
      command.fire("session:render");
    };

    var fileending = ["txt"];
    
    //parse the syntaxMode to a file ending ??! Already done somewhere else? THIS IS A TOTAL HACK
    

    if (!this.file || as) {
        console.log("NEW FILE I THINK?");
        var file = new File();
        return file.open("save", function (err) {
                self.file = file;
                if (err) {
                    //dialog(err); BUGGY
                    return;
                }
                self.fileName = file.entry.name;
                delete self.syntaxMode;
                whenOpen();
            }, self.ending, self.prettyEnding || self.syntaxMode);
    }
    //console.log("THIS IS GETTING CALLED");
    whenOpen();
  };
  
  Tab.prototype.drop = function() {
    //let listeners know, like the project manager
    this._emit("close");
    /*if (!this.file) return;
    var id = this.file.retain();
    if (!id) return;
    chrome.storage.local.get("retained", function(data) {
      if (!data.retained) return;
      var filtered = data.retained.filter(function(item) { return item != id });
      chrome.storage.local.set({ retained: filtered });
    });*/
  };

  Tab.prototype.getEnding = function (mode, c) {
      var ending;
      var prettyEnding;
      var url = new Windows.Foundation.Uri("ms-appx:///config/ace.json");
      Windows.Storage.StorageFile.getFileFromApplicationUriAsync(url).then(function (file) {
          Windows.Storage.FileIO.readTextAsync(file).then(function (text) {
              var jsonobj = JSON.parse(text);
              //debug.push(jsonobj);
              console.log(mode);
              jsonobj.modes.forEach(function (language) {
                  //console.log(language.name);
                  if (language.name == mode) {
                      ending = language.extensions;
                  }
              });
              //console.log(fileending);
              c(ending, prettyEnding);
          });
      });
  }
  
  /*
  
  HACK HACK HACKETY HACK: Since Chrome won't give us a file path, we have to
  find our own ways to identify unique files (so that we don't re-open them).
  In order to do that, we'll try to get the unique information about a file,
  and return it as a concatenated string that the sessions module can use to
  check against a new file. This should work in the short term, but it could
  be fooled by any files that are different, but A) named the same, B) the
  same size, and C) dated the same. Rare, but possible.
  
  Oh, and for added suck, it's async.
  
  */
  
  Tab.prototype.getFingerprint = function(c) {
    if (!this.file || this.file.virtual) return false;
    c(this.file.name);
  };
  
  return Tab;

});