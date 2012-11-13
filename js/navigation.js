// Code for navigation and settings menus
require(["jquery", "state", "controller", "hoverIntent"], function($, state, controller) {
    
    // list of settings
    var settings = ["voice", "pageColor", "textColor"], // the settings that we are concerned with (voice = speech)
        options = { // list of available options
                   speech: {
                        silent: 'silent',
                        child: 'child',
                        woman: 'female',
                        man: 'male'
                    },
                    colors: {
                        black: '000',
                        blue: '00f',
                        cyan: '0ff',
                        green: '0f0',
                        magenta: 'f0f',
                        red: 'f00',
                        white: 'fff',
                        yellow: 'ff0'
                    },
                    getKeyByValue: function(category, value) { // function to color option by value
                        var object = this[category];
                        for(var option in object) {
                           if(object.hasOwnProperty(option) ) {
                               if(object[option] === value)
                                    return option;
                             }
                        }
                    }
          };
      
    $(function() {
        var $body = $("body"),
            selectorString = ".navigation > li, .mainSettings > li",
            currentSettings = getCurrentSettings();
            
            /*$navIcon = $("a.thr-home-icon"),
            $settingsIcon = $("a.thr-settings-icon"),
            $navigation = $(".navigation"),
            $settings = $(".mainSettings");*/
            
        // Let's initialize the keybindings
        initNavKeybindings();
        
        /*
         * Begin Navigation Code
         */
            
        $body.on("click", selectorString, function(e) { // on click, show the submenus accordingly
             $(".submenu:visible, .innerSubmenu:visible").hide();
             $(this).find(".submenu").show();
             console.log("clicked submenu");
        });
        
        // prevent the submenu from closing if the mouseover is inside the submenu
        $body.on("click", selectorString, function(e) {
            if($(this).find(".submenu").is(":visible")) { // only hide the submenu if it was visible to begin with
              e.stopPropagation();
            }
        }); 
        
        // if the user clicks anywhere in the document except the submenu, close the submenu
        $(document).on("click", "head, body", function() {
            $(".submenu, .innerSubmenu").hide();
        });
        
        $body.on("click", ".mainSettings > li > .submenu > li", function(e) {
            $(".innerSubmenu:visible").hide();
            $(this).find(".innerSubmenu").show();
            return false;
        }); 
        
        // if the click was made inside one of the menus, don't close the menu
        $body.on("click", ".navigation, .mainSettings", function(e) {
            if($(this).is(":visible")) {
                e.stopPropagation();
            }
        });
        
        // Show the nav panel on home icon click, and the settings panel on settings icon click
        $body.on('click', ".thr-home-icon img", function() {
            $(".navigation").slideToggle();
            $(".mainSettings").slideUp(); // hide settings
            return false; // for those who have JavaScript enabled, don't allow the click to go to the home page
        });
        
        $body.on("click", ".thr-settings-icon img", function() {
            updateCheckedOptions(); // update currently selected setting options marked with a check accordingly
            
            $(".mainSettings").slideToggle();
            $(".navigation").slideUp(); // hide navigation
            
            return false; // for those who have JavaScript enabled, don't allow the click to go to the settings page
        });

        // if the user clicks anywhere other than one of the menus, hide the menus
        $(document).on("click", "head, body", function() {
            $(".navigation, .mainSettings").slideUp();
        }); 
        
        /*
         * End Navigation Code
         */
        
        /* 
         * Begin Settings Code
         */
        
        // the user is changing a setting, adjust settings and update accordingly
        $body.on("click", "#speechOptions li > a, #pageColorsOptions li > a, #textColorsOptions li > a", function() {
            // deal with the anchor's parent <li>
            var $parent = $(this).parent();

            changeSetting($parent, $parent.text().toLowerCase());
            return false;
        });
        
        $body.on("click", ".mainSettings #default", function() {
            resetSettings();
        });
        
        /*
         * End Settings Code
         */
      
      }); // end ready
      
      
      function changeSetting($element, text) {
          var parentID = $element.parent().attr("id").toLowerCase().replace("#", ""),
              value;

          // which option are we dealing with?
          if(parentID == "speechoptions") {
              value = getOptionValue("speech", text);
              state.set("voice", value);
              
          } else if(parentID == "pagecolorsoptions") {
              value = getOptionValue("colors", text);
              state.set("pageColor", value);
              
          } else if(parentID == "textcolorsoptions") {
              value = getOptionValue("colors", text);
              state.set("textColor", value);
          } else {// not a valid option, return
              return; 
          }
          
          controller.stateChange(); // update the page
          updateCheckedOptions(); // update the check marks next to the currently selected options
      }
      
      function getCurrentSettings() {
         return {
             speech: state.get(settings[0]),
             pageColor: state.get(settings[1]),
             textColor: state.get(settings[2])
         }
      }
      
      function getOptionValue(category, selectedOption) {
          for(option in options[category]) {
              if(option == selectedOption) {
                  return options[category][option];
              }
          }
          return null;
      }
      
      function resetSettings() {
          state.set("voice", options.speech.silent);
          state.set("pageColor", options.colors.white);
          state.set("textColor", options.colors.black);
          controller.stateChange();
          updateCheckedOptions();
      }
     
      function updateCheckedOptions() {
          $(".checked").removeClass("checked");
          var currentSettings = getCurrentSettings();
          
          // update the currently set options with a check mark next to them
          $("#speechOptions " + "#" + currentSettings.speech).addClass("checked");
          $("#pageColorsOptions " + "." + options.getKeyByValue("colors", currentSettings.pageColor)).addClass("checked");
          $("#textColorsOptions " + "." + options.getKeyByValue("colors", currentSettings.textColor)).addClass("checked");
      }
      
      // function for navigation via key bindings
      function initNavKeybindings() {
          
         var  currIndices = {
                  mainMenu: 0,
                  subMenu: 0,
                  innerSubMenu: 0,
                  resetIndices: function() {
                      for(var key in this) {
                         if(this.hasOwnProperty(key) && typeof this[key] !== "function") {
                             this[key] = 0;
                         }
                      }
                  }, // end function
                  incrementIndex: function(key) {
                      if(this.hasOwnProperty(key) && typeof this[key] !== "function") {
                          this[key] += 1; // increment the index by 1
                      }
                  }, // end function
                  getIndex: function(key) {
                      if(this.hasOwnProperty(key) && typeof this[key] !== "function") {
                          return this[key];
                      }
                  } // end function
              };
          
          console.log(currIndices.getIndex("mainMenu"));
          currIndices.incrementIndex("mainMenu");
          console.log(currIndices.getIndex("mainMenu"));
          
              
          $("body").on("keydown", function(e) {
              var keyCode = e.keyCode || e.which;
              
              // if tab is pressed...
              if(e.keyCode == 9) {
                  var $focusedElement = $("*:focus");
                  // if we are focused on a menu icon, show the menu
                  if($focusedElement.is($(".thr-home-icon"))) {
                      $(".thr-home-icon img").click();
                      currIndices.resetIndices();
                      console.log("clicking home");
                      
                  } else if($focusedElement.is($(".thr-settings-icon"))) {
                      $(".thr-settings-icon img").click();
                      currIndices.resetIndices();
                      console.log("clicking settings");
                  } else {
                      //$(".navigation, .mainSettings").slideUp();
                  }
                  e.stopPropagation();
              } else if(e.keyCode == 37 && isVisible($navigation)) { // left and navigation is open
                  
              }
              
             
          });
      }
      
}); // end require