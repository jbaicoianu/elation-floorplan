elation.extend("floorplan.tools.drag", function() {
  this.attach = function(floorplan) {
    this.floorplan = floorplan;
    elation.events.add(floorplan.container, 'mousedown,mousemove,mouseup', this);
  }
  this.detach = function() {
    if (this.floorplan) {
      elation.events.remove(this.floorplan.container, 'mousedown,mousemove,mouseup', this);
      this.floorplan = false;
    }
  }
  this.handleEvent = function(ev) { if (typeof this[ev.type] == 'function') return this[ev.type](ev); }
  this.mousedown = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);
    if (ev.button == 1) {
      this.dragging = mousepos;
      floorplan.setdirty();
      ev.preventDefault();
    }
  }
  this.mousemove = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (this.dragging) {
      var diff = [mousepos[0] - this.dragging[0], mousepos[1] - this.dragging[1]];
      floorplan.offset = [floorplan.offset[0] + diff[0] / floorplan.scale, floorplan.offset[1] + diff[1] / floorplan.scale];
      this.dragging = mousepos;
      floorplan.setdirty();
    }
  }
  this.mouseup = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (this.dragging) {
      this.dragging = false;
      floorplan.setdirty();
    }
  }
});
elation.extend("floorplan.tools.pointer", function() {
  this.attach = function(floorplan) {
console.log('attach pointer', floorplan);
    this.floorplan = floorplan;
    elation.events.add(floorplan.canvas, 'mousedown,mousemove,mouseup', this);
  }
  this.detach = function() {
console.log('detach pointer');
    if (this.floorplan) {
      elation.events.remove(this.floorplan.canvas, 'mousedown,mousemove,mouseup', this);
      this.floorplan = false;
    }
  }
  this.handleEvent = function(ev) { if (typeof this[ev.type] == 'function') return this[ev.type](ev); }
  this.mousedown = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (ev.button == 0) {
      var closest = floorplan.getclosestobject(realpos, 1);
      if (closest) {
        // select single object
      } else {
        // selection box
        floorplan.drawing = new elation.floorplan.things.selector({start: realpos});
      }
      floorplan.setdirty();
    }
  }
  this.mousemove = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    // FIXME - replace with group stuff
    if (this.hoveritems && this.hoveritems.length > 0) {
      for (var i = 0; i < this.hoveritems.length; i++) {
        this.hoveritems[i].sethover(false);
      }
      floorplan.setdirty();
    }
    if (floorplan.drawing) {
      floorplan.drawing.setend(realpos);
      var picked = floorplan.getobjectsinrange(floorplan.drawing.start, floorplan.drawing.end);
      this.hoveritems = picked;
      for (var i = 0; i < this.hoveritems.length; i++) {
        this.hoveritems[i].sethover(true);
      }
      floorplan.setdirty();
    } else {
      var closest = floorplan.getclosestobject(realpos, 1);
      if (closest) {
        elation.html.addclass(floorplan.canvas, 'state_grabbable');
        closest[0].sethover(true);
        this.hoveritems = [closest[0]];
        floorplan.setdirty();
      } else {
        elation.html.removeclass(floorplan.canvas, 'state_grabbable');
        this.hoveritems = [];
        floorplan.setdirty();
      }
    }
  }
  this.mouseup = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (floorplan.drawing) {
      floorplan.drawing = false;
      floorplan.setdirty();
    } else {
      var closest = floorplan.getclosestobject(realpos, 1);
      if (closest) {
        closest[0].setselected(true);
        floorplan.setdirty();
      }
    }
  }
});
elation.extend("floorplan.tools.wall", function() {
  this.attach = function(floorplan) {
    this.floorplan = floorplan;
    elation.events.add(floorplan.container, 'mousedown,mousemove,mouseup', this);
  }
  this.detach = function() {
    if (this.floorplan) {
      elation.events.remove(this.floorplan.container, 'mousedown,mousemove,mouseup', this);
      this.floorplan = false;
    }
  }
  this.handleEvent = function(ev) { if (typeof this[ev.type] == 'function') return this[ev.type](ev); }
  this.mousedown = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (ev.button == 0) {
      floorplan.drawing = new elation.floorplan.things.wall({start: realpos});
    }
  }
  this.mousemove = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (floorplan.drawing) {
      floorplan.drawing.setend(realpos);
      floorplan.setdirty();
    }
  }
  this.mouseup = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (floorplan.drawing) {
      if (floorplan.drawing.length() > 0) {
        floorplan.objects.push(floorplan.drawing);
      }
      floorplan.drawing = false;
      floorplan.setdirty();
      floorplan.savestate();
    }
  }
});
elation.extend("floorplan.tools.door", function() {
  this.attach = function(floorplan) {
    this.floorplan = floorplan;
    elation.events.add(floorplan.container, 'mousedown,mousemove,mouseup', this);
  }
  this.detach = function() {
    if (this.floorplan) {
      elation.events.remove(this.floorplan.container, 'mousedown,mousemove,mouseup', this);
      this.floorplan = false;
    }
  }
  this.handleEvent = function(ev) { if (typeof this[ev.type] == 'function') return this[ev.type](ev); }
  this.mousedown = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);
    if (ev.button == 0) {
    }
  }
  this.mousemove = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (!floorplan.drawing || !(floorplan.drawing instanceof elation.floorplan.things[floorplan.currenttool])) {
      floorplan.drawing = new elation.floorplan.things[floorplan.currenttool]({position: realpos});
    }
    var closest = floorplan.getclosestobject(realpos, (floorplan.currenttool == 'door' ? 2 : 1));
    if (closest) {
      floorplan.drawing.enable();
      floorplan.drawing.setwallposition(closest[0], closest[1], closest[2]);
      floorplan.setdirty();
    } else{
      floorplan.drawing.disable();
      floorplan.drawing.setposition(realpos);
      floorplan.setdirty();
    }
  }
  this.mouseup = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (floorplan.drawing && floorplan.drawing.enabled) {
      floorplan.objects.push(floorplan.drawing);
      floorplan.drawing = false;
      floorplan.setdirty();
      floorplan.savestate();
    }
  }
});
elation.extend("floorplan.tools.window", function() {
  this.attach = function(floorplan) {
    this.floorplan = floorplan;
    elation.events.add(floorplan.container, 'mousedown,mousemove,mouseup', this);
  }
  this.detach = function() {
    if (this.floorplan) {
      elation.events.remove(this.floorplan.container, 'mousedown,mousemove,mouseup', this);
      this.floorplan = false;
    }
  }
  this.handleEvent = function(ev) { if (typeof this[ev.type] == 'function') return this[ev.type](ev); }
  this.mousedown = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

  }
  this.mousemove = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (!floorplan.drawing || !(floorplan.drawing instanceof elation.floorplan.things[floorplan.currenttool])) {
      floorplan.drawing = new elation.floorplan.things[floorplan.currenttool]({position: realpos});
    }
    var closest = floorplan.getclosestobject(realpos, (floorplan.currenttool == 'door' ? 2 : 1));
    if (closest) {
      floorplan.drawing.enable();
      floorplan.drawing.setwallposition(closest[0], closest[1], closest[2]);
      floorplan.setdirty();
    } else{
      floorplan.drawing.disable();
      floorplan.drawing.setposition(realpos);
      floorplan.setdirty();
    }
  }
  this.mouseup = function(ev) {
    var floorplan = this.floorplan;
    if (!floorplan) return;

    var mousepos = [ev.clientX, ev.clientY];
    var realpos = floorplan.getrealpos(ev.clientX, ev.clientY, true);

    if (floorplan.drawing && floorplan.drawing.enabled) {
      floorplan.objects.push(floorplan.drawing);
      floorplan.drawing = false;
      floorplan.setdirty();
      floorplan.savestate();
    }
  }
});
