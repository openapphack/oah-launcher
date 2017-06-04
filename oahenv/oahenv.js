var yaml = require('yamljs');
var shell = require('shell');
var bootbox = require('bootbox');

var oahenv_id = '';
var oahenv_name = '';
var oahenv_home = '';

var oahenv_config = '';

var oahenv_needsprovision = false;
var oahenv_running = false;

var OAHENV_START = "start";
var OAHENV_STOP = "stop";
var OAHENV_PROVISION = "provision";
var OAHENV_RELOAD = "reload";

$( document ).ready( function() {
  oahEnvProcessing("Reading configurations ...");
  checkPrerequisites() ;
  detectOAHEnv();
});

// ------ Event Hookups ------ //

$("#menu_oahenv_dashboard").click(function() {
  oahEnvBuildDashboard();
});

$("#menu_oahenv_sites").click(function() {
  oahEnvBuildSettings();
});

$("#menu_oahenv_tools").click(function() {
  oahEnvBuildTools();
});

$("#menu_oahenv_settings").click(function() {
  oahEnvBuildSettings();
});

$("#provisionLink").click(function() {
  if(oahenv_running) {
    controlEnv(OAHENV_PROVISION);
  }
  else {
    controlEnv(OAHENV_START);
  }
});

$("#oahenv_start").click(function() {
  controlEnv(OAHENV_START);
});


$("#oahenv_stop").click(function() {
  controlEnv(OAHENV_STOP);
});


$("#oahenv_provision").click(function() {
  if(oahenv_running) {
    controlEnv(OAHENV_PROVISION);
  }
  else {
    controlEnv(OAHENV_START);
  }
});

$("#vagrant_ip").change(function() {
  saveEnvSettings("vagrant_ip");
});

$("#vagrant_hostname").change(function() {
  saveEnvSettings("vagrant_hostname");
});

$("#vagrant_synced_folders").change(function() {
  saveEnvSettings("vagrant_synced_folders");
});

$("#vagrant_memory").change(function() {
  saveEnvSettings("vagrant_memory");
});

$("#vagrant_cpus").change(function() {
  saveEnvSettings("vagrant_cpus");
});

$("#oahenv_settings_filesync_default").click(function() {
  saveFileSyncType("");
})

$("#oahenv_settings_filesync_rsync").click(function() {
  saveFileSyncType("rsync");
})

$("#oahenv_settings_filesync_nfs").click(function() {
  saveFileSyncType("nfs");
})

$("#btnAdminer").click(function() {
  shell.openExternal('http://adminer.oahvm.dev');
})

$("#btnPimpMyLog").click(function() {
  shell.openExternal('http://pimpmylog.oahvm.dev');
})

$("#btnXHProf").click(function() {
  shell.openExternal('http://xhprof.oahvm.dev');
})


$("#addSite").click(function() {
  collectNewSiteDetails();
})

$("#oahEnvReset>button").click(function() {
  bootbox.confirm("Reset all settings?", function(result) {
    if(result) {
      oahEnvResetSettings();
    }
  });
});


// ------ Event Handlers ------ //

function oahEnvProcessing(modalTitle) {

  var contents = "<div class='progress'>";
  contents+= "<div class='progress-bar progress-bar-striped active' role=progressbar' aria-valuenow='100' aria-valuemin='0' aria-valuemax='100' style='width: 100%''>";
  contents+= "<span class='sr-only'>100% Complete</span>";
  contents+= "</div>";
  contents+= "</div>";
  contents+= "Details";
  contents+= "<div id='processingLog'>";
  contents+= "<pre></pre>";
  contents+= "</div>";

  var dialog = bootbox.dialog({
    title: modalTitle,
    message: contents
  });
}


function checkPrerequisites() {
  var errors = [];

  require('check-dependencies')().then(function (result) {
    if (!result.depsWereOk) {
      errors.push('Unmet npm dependencies. Please run "npm install" in the project directory.');
      // see result.error array for errors
    }
  });

  // TODO: do we want this to be a synchronous process, instead?
  var exec = require('child_process').exec;

  // software dependencies
  var dependencies = [
    // vagrant
    {
      name: 'Vagrant',
      command: 'vagrant --version',
      regex: /Vagrant (\d+\.\d+\.\d+)/i,
      version: '1.8.2'
    },
    // vagrant vb-guest plugin
    {
      name: 'Vagrant VBGuest Plugin',
      command: 'vagrant plugin list',
      regex: /vagrant-vbguest \((\d+\.\d+\.\d+)\)/i,
      version: '0.11.0'
    },
    // ansible
    {
      name: 'Ansible',
      command: 'ansible --version',
      regex: /ansible (\d+\.\d+\.\d+)/i,
      version: '1.9.4'
    },
    // virtualbox
    {
      name: 'VirtualBox',
      command: 'vboxmanage --version',
      regex: /(\d+\.\d+\.\d+)/i,
      version: '5.0.10'
    }
  ];

  // promise-based loop
  check_dependency(dependencies.shift());
  function check_dependency(item) {
    var common_callback = function () {
      if (dependencies.length) {
        check_dependency(dependencies.shift());
      }

      if (errors.length) {
        console.log('Errors:');

        for (var i in errors) {
          console.log(errors[i]);
        }
      }
    };

    new Promise(function(resolve, reject) {
      exec(item.command, [], function (error, stdout, stderr) {
        if (error !== null) {
          var os = require('os');

          var error_text = [
            'Could not find ' + item.name + '; ensure it is installed and available in PATH.',
            '\tTried to execute: ' + item.command,
            '\tGot error: ' + stderr
          ];

          errors.push(error_text.join(os.EOL));

          reject();
          return;
        }

        if (item.regex) {
          var matches = stdout.match(item.regex);
          if (matches) {
            var cv = require('compare-version');

            // >= 0 is all good
            if (cv(matches[1], item.version) < 0) {
              errors.push(item.name + ' was found, but a newer version is required. Please upgrade ' + item.name + ' to version ' + item.version + ' or higher.');
            }
          }
          else {
            errors.push(item.name + ' was found, but the version could not be determined.');
          }
        }

        resolve();
      });

    }).then(common_callback, common_callback);
  }

  // on failure, disable menu dependencies, load status report into dashboard
}


function detectOAHEnv() {
  var spawn = require('child_process').spawn;
  var child = spawn('vagrant', ['global-status']);

  var stdout = '';
  child.stdout.on('data',
    function (buf) {
        stdout+= buf;
        $("#processingLog pre").append(document.createTextNode(buf));
        $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.stderr.on('data',
    function (buf) {
        $("#processingLog pre").append(document.createTextNode(buf));
        $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.on('exit', function (exitCode) {
    // Search for the oahenv entry
    lines = stdout.split("\n");
    for (var x in lines) {
      var line = lines[x];

      if(line.indexOf("oahenv") > -1) {
        // oahenv virtualbox poweroff
        line = line.trim();
        var parts = line.split(/\s+/);
        setVagrantDetails(parts);
        break;
      }
    }
  });
}


function setVagrantDetails(details) {
  oahenv_id = details[0];
  oahenv_name = details[1];
  oahenv_state = details[3];
  oahenv_home = details[4];

  var config_file = oahenv_home + '/oah-config.yml';
  oahenv_config = yaml.load(config_file);

  runOAHEnvLuncher();
}


function runOAHEnvLuncher() {
  updateEnvStatus();
  oahEnvBuildDashboard();
}


function controlEnv(action) {
  var title = '';
  var cmd = '';

  switch(action) {
    case OAHENV_START:
      cmd = 'up'
      title = 'Starting ENV';
      break;

    case OAHENV_STOP:
      cmd = 'halt';
      title = 'Stopping ENV';
      break;

    case OAHENV_PROVISION:
      cmd = 'provision';
      title = 'Re-provisioning ENV';
      break;

      case OAHENV_RELOAD:
        cmd = 'reload';
        title = 'Reloading ENV';
        break;
  }

  oahEnvProcessing(title);

  $("#processingLog pre").text("");

  var spawn = require('child_process').spawn;
  var child = spawn('vagrant',
    [cmd, oahenv_id]);

  child.stdout.on('data',
    function (buf) {
      $("#processingLog pre").append(document.createTextNode(buf));
      $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.stderr.on('data',
    function (buf) {
        $("#processingLog pre").append(document.createTextNode(buf));
        $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.on('exit', function (exitCode) {
    switch(action) {
      case OAHENV_START:
        if(oahenv_needsprovision) {
          bootbox.hideAll();
          controlEnv(OAHENV_PROVISION);
        }
        else {
          updateEnvStatus();
        }
        break;

      case OAHENV_STOP:
      case OAHENV_RELOAD:
        updateEnvStatus();
        break;

      case OAHENV_PROVISION:
        oahenv_needsprovision = false;
        $("#reprovisionAlert").hide("fast");
        bootbox.hideAll();
        updateEnvStatus();
        break;
    }
  });
}


function updateEnvStatus() {
  // Check if OAHENV is running
  var spawn = require('child_process').spawn;
  var child = spawn('vagrant',
    ['status', oahenv_id]);

  var stdout = '';
  child.stdout.on('data',
    function (buf) {
        stdout += buf;
    }
  );

  child.stderr.on('data',
    function (buf) {
        $("#processingLog pre").append(document.createTextNode(buf));
        $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.on('exit', function (exitCode) {
    // Search for the status
    if(stdout.indexOf("poweroff") > -1) {
      $('#oahenv_start').removeClass('disabled');
      $('#oahenv_stop').addClass('disabled');
      $('.oahEnvHeaderStatus').text("Stopped");
      oahenv_running = false;
    }
    else {
      $('#oahenv_start').addClass('disabled');
      $('#oahenv_stop').removeClass('disabled');
      $('.oahEnvHeaderStatus').text("Running");
      oahenv_running = true;
    }
    bootbox.hideAll();
  });
}


function oahenvHidePanels() {
  $("#panel_oahenv_dashboard").hide();
  $("#menu_oahenv_dashboard").removeClass("active");

  $("#panel_oahenv_sites").hide();
  $("#menu_oahenv_sites").removeClass("active");

  $("#panel_oahenv_tools").hide();
  $("#menu_oahenv_tools").removeClass("active");

  $("#panel_oahenv_settings").hide();
  $("#menu_oahenv_settings").removeClass("active");
}


function oahEnvBuildDashboard() {
  oahenvHidePanels();
  $("#menu_oahenv_dashboard").addClass("active");
  $("#panel_oahenv_dashboard").fadeIn();
}


function oahEnvBuildSettings() {
  oahenvHidePanels();
  $('#oahenvSites').html("");

  for(var x in oahenv_config.apache_vhosts) {
    var servername = oahenv_config.apache_vhosts[x].servername;

    switch(servername) {
      // We don't want to include these default entries.
      case "{{ oahenv_domain }}":
      case "adminer.oahvm.dev":
      case "xhprof.oahvm.dev":
      case "pimpmylog.oahvm.dev":
        // Don't process
        break;

      default:
        $('#oahenvSites').append(renderSitesRow(servername));
        break;
    }
  }

  $("#menu_oahenv_sites").addClass("active");
  $("#panel_oahenv_sites").fadeIn();
}


function oahEnvBuildTools() {
  oahenvHidePanels();
  $("#menu_oahenv_tools").addClass("active");
  $("#panel_oahenv_tools").fadeIn();
}


function renderSitesRow(servername) {
  var name = servername.split(".")[0];
  var row = $('<tr>');

  var td_dns = $('<td>');
  var link = $('<a>');
  link.attr('href', '#');
  link.html(servername);
  td_dns.append(link);
  link.click(function() {
    shell.openExternal("http://" + servername);
  })
  row.append(td_dns);

  var td_dbname = $('<td>');
  td_dbname.html(name);
  row.append(td_dbname);


  var td_actions = $('<td class="oahenv_sites_icons">');
  var button_github = $("<a href='#'><i class='fa fa-2 fa-git'></i></a>");
  button_github.click(function(){
    shell.openExternal('https://github.com/');
  });
  td_actions.append(button_github);

  var button_install = $("<a href='#'><i class='fa fa-2 fa-arrow-down'></i></a>");
  button_install.click(function(){
    alert("When implemented, this button will invoke a 'composer install' to set up the docroot for the project.")
  });
  td_actions.append(button_install);


  row.append(td_actions);

  var td_edit = $('<td class="oahenv_sites_icons">');

  var button_edit = $('<a href="#"><i class="fa fa-2 fa-pencil"></i></a>');
  button_edit.click(function(){
    alert("When implemented, this button will allow you to edit this site entry.")
  });
  td_edit.append(button_edit);

  var button_delete = $('<a href="#"><i class="fa fa-2 fa-ban"></i></a>');
  button_delete.click(function(){
    promptDeleteDetails(name);
  });
  td_edit.append(button_delete);

  row.append(td_edit);

  return row;
}


function collectNewSiteDetails() {
  bootbox.dialog({
    title: "New project",
    message: '<div class="row">  ' +
      '<div class="col-md-12"> ' +
      '<form class="form-horizontal"> ' +
      '<div class="form-group"> ' +
      '<label class="col-md-3 control-label" for="project_name">Project name</label> ' +
      '<div class="col-md-9"> ' +
      '<input id="project_name" name="project_name" type="text" placeholder="" class="form-control input-md"> ' +
      '</div> ' +
      '</div> ' +
      '<div class="form-group"> ' +
      '<label class="col-md-3 control-label" for="project_git_url">Git URL</label> ' +
      '<div class="col-md-9"> ' +
      '<input id="project_git_url" name="project_git_url" type="text" placeholder="" class="form-control input-md"> ' +
      '</div> ' +
      '</div> ' +
      '<div class="form-group"> ' +
      '<label class="col-md-3 control-label" for="awesomeness">Composer</label> ' +
      '<div class="col-md-4"> <div class="radio"> <label for="awesomeness-0"> ' +
      '<input type="radio" name="project_composer" id="composer-0" value="false" checked="checked"> ' +
      'No </label> ' +
      '</div><div class="radio"> <label for="composer-1"> ' +
      '<input type="radio" name="project_composer" id="composer-1" value="true"> Yes </label> ' +
      '</div> ' +
      '</div> </div>' +
      '<div class="form-group"> ' +
      '<label class="col-md-3 control-label" for="project_webroot">Webroot </label> ' +
      '<div class="col-md-9"> ' +
      '<input id="project_webroot" name="project_webroot" type="text" placeholder="" class="form-control input-md"> ' +
      '</div> ' +
      '</div> ' +
      '</form> </div>  </div>',
    buttons: {
      success: {
        label: "Create",
        className: "btn-primary",
        callback: function () {
          var name = $('#project_name').val();
          var git_url = $('#project_git_url').val();
          var composer = $("input[name='project_composer']:checked").val()
          var webroot = $('#project_webroot').val();
          createNewSite(name.toLowerCase(), git_url, composer, webroot);
        }
      }
    }
  });
}


function createNewSite(name, gitUrl, composer, webroot) {
  // Create the directory
  var fs = require('fs');
  var dir = oahenv_config.vagrant_synced_folders[0].local_path + "/" + name;

  // Perform a git init
  if(gitUrl) {
    createSiteGit(dir, gitUrl, composer);
  }
  else {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
  }

  // Create the apache vhost
  var newSite = new Object();
  newSite.servername = name + "." + oahenv_config.vagrant_hostname;
  newSite.projectroot = "/var/www/" + name;
  newSite.documentroot = "/var/www/" + name + "/" + webroot;
  drupalvm_config.apache_vhosts.push(newSite);


  // Create the database
  var newDatabase = new Object();
  newDatabase.name = name;
  newDatabase.encoding = "utf8";
  newDatabase.collation = "utf8_general_ci";
  oahenv_config.mysql_databases.push(newDatabase);

  saveConfigFile();

  oahEnvBuildSettings();
}

function createSiteGit(dir, projectGitUrl, composer){
  oahEnvProcessing("Cloning from git ...");
  var spawn = require('child_process').spawn;
  var child = spawn('git',
    ['clone', projectGitUrl, dir]);

  var stdout = '';
  child.stdout.on('data',
    function (buf) {
        stdout += buf;
    }
  );

  child.on('exit', function (exitCode) {
    bootbox.hideAll();
    if(composer) {
        runComposer(dir);
    }
  });
}


function runComposer(dir) {
  oahEnvProcessing("Running composer ...")
  var spawn = require('child_process').spawn;
  var child = spawn('composer',
    [
      'install',
      '--working-dir=' + dir,
      '-n',
      '-vvv',
      '--dev'
    ]);

  child.stdout.on('data',
    function (buf) {
      $("#processingLog pre").append(document.createTextNode(buf));
      $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );

  child.stderr.on('data',
    function (buf) {
      $("#processingLog pre").append(document.createTextNode(buf));
      $("#processingLog pre").scrollTop($("#processingLog pre")[0].scrollHeight);
    }
  );


  child.on('exit', function (exitCode) {
    bootbox.hideAll();
  });
}


function promptDeleteDetails(projectName) {
  //TODO: Prompt to ask how much of the record to delete
  var deleteSettings = {
    "removeDirectory": true,
    "removeApacheVhost": true,
    "removeDatabase": true
  }

  bootbox.dialog({
    title: "Delete site: " + projectName,
    message: 'This will delete:'
      + '<ul>'
      + '<li>apache vhost</li>'
      + '<li>database</li>'
      + '<li>site directory and files</li>'
      + '</ul>',
    buttons: {
      success: {
        label: "Cancel",
        className: "btn-default",
        callback: function() {
          // Do nothing.
        }
      },
      delete: {
        label: "Delete",
        className: "btn-danger",
        callback: function () {
          deleteSite(projectName, deleteSettings);
        }
      }
    }
  });
}


function deleteSite(projectName, deleteSettings) {
  // Remove apache vhost entry
  if(deleteSettings.removeDirectory) {
    //TODO:
  }

  if(deleteSettings.removeApacheVhost) {
    for(var x in oahenv_config.apache_vhosts) {
      var servername = oahenv_config.apache_vhosts[x].servername;
      var name = servername.split(".")[0];
      if(name == projectName) {
        oahenv_config.apache_vhosts.splice(x, 1);
      }
    }
  }

  if(deleteSettings.removeDatabase) {
    //TODO:
  }

  saveConfigFile();
  oahEnvBuildSettings();
}




function oahEnvBuildSettings() {
  oahenvHidePanels();

  // IP address
  $("#vagrant_ip").val(oahenv_config.vagrant_ip);

  // Hostname
  $("#vagrant_hostname").val(oahenv_config.vagrant_hostname);

  // Local files
  $("#vagrant_synced_folders").val(oahenv_config.vagrant_synced_folders[0].local_path);

  // Memory
  $("#vagrant_memory").val(oahenv_config.vagrant_memory);

  // CPUs
  $("#vagrant_cpus").val(oahenv_config.vagrant_cpus);

  // VM file sync mechanism
  var file_sync_type = oahenv_config.vagrant_synced_folders[0].type;
  switch(file_sync_type) {
    case "rsync":
      $("#oahenv_settings_filesync_rsync").button('toggle');
      break;

    case "nfs":
      $("#oahenv_settings_filesync_nfs").button('toggle');
      break;

    default:
      $("#oahenv_settings_filesync_default").button('toggle');
  }

  // Installed extras
  $('#oahenv_settings_installedextras input').prop('checked', false); // reset
  var installed_extras = oahenv_config.installed_extras;
  for(x in installed_extras) {
    var extra = installed_extras[x];
    $('#oahenv_settings_' + extra).prop('checked', true);
  }

  $("#menu_oahenv_settings").addClass("active");
  $("#panel_oahenv_settings").fadeIn();
}


function saveEnvSettings(el) {
  switch(el) {
    case "vagrant_ip":
      oahenv_config.vagrant_ip = $("#vagrant_ip").val();
      break;

    case "vagrant_hostname":
      oahenv_config.vagrant_hostname = $("#vagrant_hostname").val();
      break;

    case "vagrant_memory":
      oahenv_config.vagrant_memory = parseInt($("#vagrant_memory").val());
      break;

    case "vagrant_cpus":
      oahenv_config.vagrant_cpus = parseInt( $("#vagrant_cpus").val() );
      break;

    case "vagrant_synced_folders":
      oahenv_config.vagrant_synced_folders[0].local_path = $("#vagrant_synced_folders").val();
      break;
  }
  saveConfigFile();
}


function saveFileSyncType(file_sync_type) {
  // Only update if the value is actually different.
  if(file_sync_type != oahenv_config.vagrant_synced_folders[0].type) {
    oahenv_config.vagrant_synced_folders[0].type = file_sync_type;
    saveConfigFile();
  }
}


function saveConfigFile() {
  yamlString = YAML.stringify(oahenv_config, 2);
  var fs = require('fs');
  fs.writeFile(oahenv_home + '/oah-config.yml', yamlString, function(err) {
      if(err) {
          return console.log(err);
      }
  });
  oahenv_needsprovision = true;
  $("#reprovisionAlert").show("fast");
}



function oahEnvResetSettings() {
  var config_file = oahenv_home + '/example.oah-config.yml';
  oahenv_config = yaml.load(config_file);
  saveConfigFile();

  oahEnvBuildSettings();
}
