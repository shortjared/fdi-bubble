// Generated by CoffeeScript 1.7.1
(function() {
  this.ViewModel = (function() {
    function ViewModel() {
      this.violent = ["murder", "rape", "robbery", "assault"];
      this.property = ["arson", "burglary", "larceny", "vehicle_theft"];
      this.crime = ko.observableArray($.bbq.getState("crimes") == null ? [] : $.bbq.getState("crimes").split(";"));
      this.capitalize = function(text) {
        return text.split('_').map(function(t) {
          return t.slice(0, 1).toUpperCase() + t.slice(1);
        }).join(' ');
      };
      this.crimes = [
        {
          crime: this.violent,
          type: "violent"
        }, {
          crime: this.property,
          type: "property"
        }
      ];
      console.log(this.crimes);
      this.ofType = (function(_this) {
        return function(type) {
          var res;
          res = $.grep(_this.crimes, function(c) {
            return c.type === type;
          })[0];
          return _this.crimes.indexOf(res);
        };
      })(this);
      this.get_crimes = (function(_this) {
        return function() {
          $.bbq.pushState({
            crimes: _this.crime().join(';')
          });
          return true;
        };
      })(this);
    }

    return ViewModel;

  })();

}).call(this);
