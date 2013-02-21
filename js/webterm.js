
var webterm = (function($, undefined){

  var WEBTERM_CONTAINER = 'body';
  var WEBTERM_ROOT_PATH = '';

  var myCurrentFolder = WEBTERM_ROOT_PATH + '/';
  var myCurrentPath = myCurrentFolder;
  var myTree = {};
  var myFlatTree = {};
  var myHistory = [];
  var myHistoryPointer = -1;
  var myHostname = "webterm";
  var myPath = [];

  function rebuildTree(node, name, previous){
    var _previous = previous + name + '/';
    myFlatTree[_previous] = node;
    for(var childNode in node){
      rebuildTree(node[childNode], childNode, _previous);
    }
  }

  return {
    cmd_cd : {
      description : '<dir> : Changes the current directory to <dir>.',
      execute : function(folder){
        var _folder = webterm.getAbsolutePath(folder);
        if(typeof myFlatTree[_folder] !== 'undefined'){
          myCurrentPath = _folder;
          myCurrentPath.replace(/([^\/]+)?\/$/g, function(p, folder){
            myCurrentFolder = typeof folder !== 'undefined' ? folder : '/';
          });
        }
        else{
          webterm.error('cd', folder, 'No such file or directory');
        }
        webterm.prompt();
      }
    },
    cmd_clear : {
      description : ': Clears your screen',
      execute : function(){
        webterm.clear();
        webterm.prompt();
      }
    },
    cmd_echo : {
      description : '<text> : Writes <text> to the standard output.',
      execute : function(text){
        webterm.printAndPrompt(text);
      }
    },
    cmd_help : {
      description : ': Shows this help.',
      execute : function(){
        webterm.printHelp();
      }
    },
    cmd_hostname : {
      description : '[ <hostname> ] : Prints name of current host system or set it to <hostname>.',
      execute : function(newHostname){
        if(typeof newHostname === 'string'){
          myHostname = newHostname;
        }
        webterm.printAndPrompt(myHostname);
      }
    },
    cmd_mkdir : {
      description : '<dir> : Creates the directory <dir>.',
      execute : function(dir){
        if(typeof dir !== 'string'){
          webterm.errorAndPrompt('mkdir', 'specify a directory to create');
        }
        else{
          myFlatTree[myCurrentPath][dir] = {};
          webterm.rebuildTree();
          webterm.prompt();
        }
      }
    },
    cmd_ls : {
      description : '[ <dir> ] : Lists current directory content or <dir> content if specified.',
      execute : function(path){
        var _ouput = ['.'];
        var _path = myCurrentPath;
        if(typeof path === 'string'){
          _path = webterm.getAbsolutePath(path);
        }
        for(var i in myFlatTree[_path]){
          _ouput.push(i);
        }
        webterm.printAndPrompt(_ouput.join('<br>'));
      }
    },
    cmd_pwd : {
      description : ': Prints working directory name.',
      execute : function(){
        webterm.printAndPrompt(webterm.path());
      }
    },
    autoCompletePath : function(){
      var _prompt = webterm.getPromptValue();
      var _split = _prompt.split(' ');
      var _lastIndex = _split.length - 1;
      var _lastPromptStr = _split[_lastIndex];
      var _path = webterm.getAbsolutePath(_lastPromptStr);
      var _matchedPath = webterm.getFirstMatchedPath(_path);
      var _regex = new RegExp(_path.slice(0, -1), 'g');
      var _strCompleted = _prompt + ( _matchedPath.replace(_regex, '') );
      webterm.replacePrompt(_strCompleted);
    },
    clear : function(){
      $(WEBTERM_CONTAINER).html('');
    },
    commandNotFound : function(command){
      webterm.printAndPrompt('Error: ' + command + ': command not found');
    },
    disabledCurrentPrompt : function(){
      webterm.getLastPrompt().attr({
        'disabled' : 'disabled',
        'readonly' : 'readonly'
      });
    },
    encapsulateResult : function(content){
      return '<div class="result">' + content + '</div>';
    },
    errorAndPrompt : function(){
      webterm.error.apply(webterm, arguments);
      webterm.prompt();
    },
    error : function(){
      var _error = ['Error'];
      for (var i = 0; i < arguments.length; i++) {
        _error.push(arguments[i]);
      }
      webterm.print(_error.join(': '));
    },
    executeCommand : function(command){
      var _split = command.split(' ');
      var _command = _split[0];
      var _params = _split.slice(1);
      if(webterm.existsCommand(_command)){
        webterm['cmd_' + _command].execute.apply(webterm, _params);
      }
      else{
        webterm.commandNotFound(_command);
      }
    },
    executePromptCommand : function(e){
      if(e.keyCode === 9){
        e.preventDefault();
        webterm.autoCompletePath();
      }
      else{
        if(e.keyCode === 13){
          e.preventDefault();
          var _this = $(this);
          webterm.disabledCurrentPrompt();
          var _command = _this.val();
          if(_command.replace(/ /g, '') === ''){
            webterm.prompt();
            var _scroller = document.querySelector(WEBTERM_CONTAINER);
            _scroller.scrollTop = _scroller.scrollHeight;
          }
          else{
            webterm.history(_command);
            webterm.executeCommand(_command);
          }
        }
        else if(e.keyCode === 38){
          e.preventDefault();
          webterm.historyPrevious();
        }
        else if(e.keyCode === 40){
          e.preventDefault();
          webterm.historyNext();
        }
      }
    },
    existsCommand : function(command){
      return (typeof webterm['cmd_' + command] === 'object');
    },
    focusLastPrompt : function(){
      webterm.getLastPrompt().focus();
    },
    getAbsolutePath : function(path){
      var _path = (myCurrentPath + path + '/').replace('\/\/', '/');
      if(path.charAt(0) === '/'){
        _path = path.replace(/(\/[^\/]+)$/g, '$1/');
      }
      while(_path.indexOf('..') !== -1){
        _path = _path
                  .replace(/[^\/]+\/\.\./g, '')
                  .replace(/^\/?\.\.[^\/]+/g, '/')
                  .replace(/\/\//g, '/')
                  .replace(/^\/?\.\.\/?$/g, '/');
      }
      return _path;
    },
    getFirstMatchedPath : function(absolutePath){
      absolutePath = absolutePath.slice(0, -1);
      var _path = absolutePath;
      for(var f in myFlatTree){
        if(f.indexOf(absolutePath) !== -1){
          _path = f;
          break;
        }
      }
      return _path;
    },
    getLastPrompt : function(){
      return $(WEBTERM_CONTAINER).find('.prompt:last input');
    },
    getPromptValue : function(){
      return webterm.getLastPrompt().val();
    },
    history : function(command){
      if(myHistory[myHistoryPointer] !== command){
        myHistory.push(command);
      }
      myHistoryPointer = myHistory.length - 1;
    },
    historyNext : function(){
      if(myHistoryPointer !== myHistory.length - 1){
        myHistoryPointer++;
        webterm.replacePrompt(myHistory[myHistoryPointer+1]);
      }
    },
    historyPrevious : function(){
      if(myHistoryPointer !== -1){
        webterm.replacePrompt(myHistory[myHistoryPointer]);
        myHistoryPointer--;
      }
    },
    hostname : function(hostname){
      if(typeof hostname !== 'string'){
        return myHostname;
      }
      else{
        return (myHostname = hostname);
      }
    },
    init : function(tree){
      myTree[WEBTERM_ROOT_PATH] = tree || {};
      webterm.rebuildTree();
      webterm.prompt();
      $(document).on('keydown', '.prompt input', webterm.executePromptCommand);
      $(document).on('click', webterm.focusLastPrompt);
    },
    path : function(){
      return myCurrentPath;
    },
    print : function(content){
      $(WEBTERM_CONTAINER).append(
        webterm.encapsulateResult(content)
      );
    },
    printAndPrompt : function(content){
      webterm.print(content);
      webterm.prompt();
    },
    printHelp : function(){
      var _commands = [];
      for(var w in webterm){
        if(w.slice(0, 4) === 'cmd_'){
          var _description = webterm[w].description
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          _commands.push(w.slice(4) + ' ' + _description);
        }
      }
      webterm.printAndPrompt(_commands.join('<br>'));
    },
    prompt : function(value){
      value = typeof value === 'string' ? value : '';
      webterm.disabledCurrentPrompt();
      var _container = $(WEBTERM_CONTAINER);
      var _prompt = webterm.hostname() + ':' + myCurrentFolder + '$';
      var _tmpl = $('<div>').append(_prompt)
                            .css({
                              'position' : 'absolute',
                              'top' : '-9999px'
                            });
      _container.append(_tmpl);
      var _leftMargin = parseFloat(_tmpl.outerWidth()) + 5;
      _tmpl.remove();
      _tmpl = $('<div class="prompt">' + _prompt + '<input type="text" style="left: ' + _leftMargin + 'px;"></div>');
      _container.append(_tmpl);
      var _input = _tmpl.find('input');
      setTimeout(function(){
        _input.get(0).value = value;
        _input.focus();
      });
    },
    rebuildTree : function(){
      for(var node in myTree){
        return rebuildTree(myTree[node], node, '');
      }
    },
    replacePrompt : function(prompt){
      webterm.getLastPrompt().val(prompt);
    }
  };
})($);
