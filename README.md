# OAH - Launcher

This is the base launcher application for all oah-launcher plugins

__This application is still in heavy active and early development.__



## Instructions

Pre-requisites:

* Make sure you already have oah-vm fully running on your machine (hoping to remove this requirement in the future)
* `npm` must be installed


Steps:

1. `git clone https://github.com/openapphack/oah-launcher.git`
2. `cd oah-launcher`
3. `git submodule init && git submodule update --recursive`
4. `npm install`
5. `npm start`


### Note: NFS mounting still requires user input that is not handled through the app yet (password to edit nfs exports). Watch your terminal window for the password prompt.
