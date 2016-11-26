

function oahenvBuildSettings() {
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


function saveENVSettings(el) {
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



function oahenvResetSettings() {
  var config_file = oahenv_home + '/example.oah-config.yml';
  oahenv_config = yaml.load(config_file);
  saveConfigFile();

  oahenvBuildSettings();
}
