## Caret for Windows

### Pre Alpha
This is definitely pre alpha software - many major features don't work properly. See Features for a list.
If anyone would like to tackle the following problem: WinJS doesn't allow filePicker objects to have wildcard filetype extensions (see [here](http://msdn.microsoft.com/en-us/library/windows/apps/windows.storage.pickers.filesavepicker.filetypechoices.aspx)) - any way around that?

### Caret
This is a port of the excellent Caret chrome app to the WinJS platform. [Caret](https://github.com/thomaswilburn/Caret) is maintained by Thomas Wilburn.

### Features
WinJS Port features:
+ use WinJS API to select and open files (saving files has above problems, needs extensive tests)
+ user defined settings (not working, settings.js needs to be rewritten entirely)
+ key mapping parity with Sublime (a long way off)

#### known issues
+ dragging tabs throws an error
+ trying to save a modified setting just reflushes it

### Note
As I'm new to open source, please let me know if there's anything I could be doing better. Thanks!
