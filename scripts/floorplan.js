elation.component.add('floorplan', function() {
  this.offset = [0,0];
  this.walls = [];
  this.doors = [];
  this.windows = [];
  this.dirty = true;
  this.rendering = false;
  this.currentstate = 0;
  this.statehistory = [];
  this.fractions = {
    2: { 1: '½' },
    4: { 1: '¼', 3: '¾' },
    8: { 1: '⅛', 3: '⅜', 5: '⅝', 7: '⅞' },
  }
  this.style = {
    'grid_10feet': [1, 'rgba(0,0,0,.1)'],
    'grid_feet': [1, 'rgba(0,0,255,.1)'],
    'grid_inches': [1, 'rgba(255,255,0,.2)'],
    'label': [10, 'rgba(0,0,0,.5)'],
    'border': [2, 'rgba(0,0,0,.5)'],
    'wall': [2, '#000', '#000'],
    'door': [1, '#000', 'rgba(204, 204, 255, .5)'],
    'window': [1, '#000', '#fff'],
    'measurement': [.5, '#ff0000', '#ff0000'],
    'selector': [1, '#000000', 'rgba(255,255,0,.1)'],
    'hover': [1, '#000000', 'rgba(255,255,0,.6)'],
    'selected': [1, '#000000', 'rgba(0,255,0,1)']
  };
  this.scale = 10;
  this.snapsize = 1;
  this.show = {
    'grid_10feet': true,
    'grid_feet': true,
    'grid_inches': false,
    'measurement': true
  };
  this.size = [1000, 1000];
  this.margin = [0, 0];

  this.init = function() {
    this.initcanvas();
    this.inittoolbox();
    this.loadstate();
    this.savestate();
  }
  this.initcanvas = function() {
    if (!this.canvas) {
      this.canvas = elation.html.create('canvas');
      this.canvas.className = 'floorplan_canvas';
      this.size = [window.innerWidth, window.innerHeight];
      this.canvas.width = this.size[0];
      this.canvas.height = this.size[1];
      this.ctx = this.canvas.getContext('2d');
      this.container.appendChild(this.canvas);
      elation.events.add(this.canvas, "mousedown,mousewheel", this);
      elation.events.add(this.canvas, 'mousemove,mouseup', this);
      elation.events.add(window, "keydown,keyup,resize", this);
    }
    this.render()
  }
  this.inittoolbox = function() {
    this.toolbox = elation.ui.toolbox(null, elation.html.create({tag: 'div', classname: 'floorplan_toolbox', append: this.container}));
    this.addtool('pointer');
    this.addtool('wall');
    this.addtool('door');
    this.addtool('window');

    this.settool('pointer');
  }
  this.serialize = function(asobj) {
    var data = {}; 
    var types = ['walls', 'doors', 'windows'];
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      data[type] = [];
      for (var k in this[type]) {
        var obj = this[type][k].serialize(true);
        data[type][k] = obj;
      }
    }
    return (asobj ? data : elation.JSON.stringify(data));
  }
  this.clearstate = function() {
    this.walls = [];
    this.doors = [];
    this.windows = [];
  }
  this.savestate = function() {
    var newdata = this.serialize();
    localStorage.floorplan = newdata;
    if (this.currentstate > 0) {
      this.statehistory.splice(0,this.currentstate);
    }
    this.currentstate = 0;
    this.statehistory.unshift(newdata);
    //console.log('saved', newdata);
  }
  this.loadstate = function(state, skiphistory) {
    if (!state) {
      state = localStorage.floorplan;
    }
    if (state) {
      var stateobj = elation.JSON.parse(state);
      var types = {'walls':'wall', 'doors':'door', 'windows':'window'};
      for (var typename in types) {
        var type = types[typename];
        this[typename] = [];
        if (stateobj[typename] && stateobj[typename].length > 0) {
          for (var i = 0; i < stateobj[typename].length; i++) {
            this[typename].push(new elation.floorplan[type](stateobj[typename][i]));
          }
        }
      }
    }
    this.dirty = true;
    this.render();
  }
  this.undostate = function() {
    if (this.currentstate < this.statehistory.length - 1) {
      this.loadstate(this.statehistory[++this.currentstate]);
    }
  }
  this.redostate = function() {
    if (this.currentstate > 0) {
      this.loadstate(this.statehistory[--this.currentstate]);
    }
  }
  this.addtool = function(name) {
    this.toolbox.addtool(name, elation.bind(this, function() { this.settool(name); }));
  }
  this.drawgrid = function() {
    var ctx = this.ctx;
    this.canvas.width = this.size[0]; // clear canvas
    this.canvas.height = this.size[1];

    var halfw = this.size[0] / 2,
        halfh = this.size[1] / 2;

    this.setstyle(this.style['border']);
    var bwidth = this.style['border'][0];
    ctx.strokeRect(this.margin[0] + bwidth/2, this.margin[1] + bwidth/2, this.size[0] - this.margin[0] - bwidth, this.size[1] - this.margin[1] - bwidth);

    //this.setstyle(this.style['grid']);
    var rangex = [this.offset[0] - halfw / this.scale, this.offset[0] + halfw / this.scale];
    var rangey = [this.offset[1] - halfh / this.scale, this.offset[1] + halfh / this.scale];
    if (this.show['grid_inches']) {
      this.drawgridlines(rangex, 1/12, this.style['grid_inches'], false);
      this.drawgridlines(rangey, 1/12, this.style['grid_inches'], true);
    }
    if (this.show['grid_feet']) {
      this.drawgridlines(rangex, 1, this.style['grid_feet'], false);
      this.drawgridlines(rangey, 1, this.style['grid_feet'], true);
    }
    if (this.show['grid_10feet']) {
      this.drawgridlines(rangex, 10, this.style['grid_10feet'], false, true);
      this.drawgridlines(rangey, 10, this.style['grid_10feet'], true, true);
    }

    var rendered = 0, total = 0;
    var tl = [-this.offset[0] - halfw / this.scale, -this.offset[1] - halfh / this.scale];
    var br = [-this.offset[0] + halfw / this.scale, -this.offset[1] + halfh / this.scale];
    var cliprect = new elation.graphics.test.rectangle(tl, br);
    //var min = [Math.min.apply(window, rangex), Math.min.apply(window, rangey)];
    //var max = [Math.max.apply(window, rangex), Math.max.apply(window, rangey)];
    for (var i = 0; i < this.walls.length; i++) {
      if (this.walls[i].isin(cliprect)) {
        this.walls[i].render(this);
        rendered++;
      }
      total++;
    }
    for (var i = 0; i < this.windows.length; i++) {
      if (this.windows[i].isin(cliprect)) {
        this.windows[i].render(this);
        rendered++;
      }
      total++;
    }
    for (var i = 0; i < this.doors.length; i++) {
      if (this.doors[i].isin(cliprect)) {
        this.doors[i].render(this);
        rendered++;
      }
      total++;
    }

    if (this.drawing) {
      this.drawing.render(this);
      rendered++;
      total++;
    }
//console.log('rendered ' + rendered + '/' + total + ' objects');
    if (this.stoptimer) {
      clearTimeout(this.stoptimer);
    }
    this.dirty = false;
    this.stoptimer = setTimeout(elation.bind(this, function() { this.active = this.stoptimer = false; }), 100);
  }
  this.drawgridlines = function(range, size, style, vertical, label) {
    var ctx = this.ctx;
    ctx.beginPath();
    this.setstyle(style);
    var margin = this.margin[(vertical ? 1 : 0)];
    var maxsize = this.size[(vertical ? 1 : 0)];
    var othersize = this.size[(vertical ? 0 : 1)];
//console.log(range, size, style, margin, maxsize);
    for (var n = margin + (range[0] % size) * this.scale; n < maxsize; n += size * this.scale) {
      var realpos = Math.round((n - maxsize) / this.scale - range[0])
      if (vertical) {
        ctx.moveTo(margin,n);
        ctx.lineTo(othersize,n);
        if (label) ctx.fillText(realpos,4,n);
      } else {
        ctx.moveTo(n,margin);
        ctx.lineTo(n,othersize);
        if (label) ctx.fillText(realpos,n,10);
      }
    }
    ctx.stroke();
  }
  this.setstyle = function(style) {
    var ctx = this.ctx;
    ctx.lineWidth = style[0];
    ctx.strokeStyle = style[1];
    if (style[2]) {
      ctx.fillStyle = style[2];
    }
  }
  this.render = function() {
    if (this.dirty) {
        this.drawgrid();
    }
    if (!this.active) {
      this.active = true;
      elation.graphics.frame(elation.bind(this, this.render));
    }
  }
  this.getcanvaspos = function(vec) {
    var halfsize = [this.size[0]/2, this.size[1]/2];
    return new THREE.Vector3((vec.x + this.offset[0]) * this.scale + halfsize[0], 0, (vec.z + this.offset[1]) * this.scale + halfsize[1]);
  }
  this.getrealpos = function(x, y, snap) {
    var elpos = elation.html.position(this.canvas);
    var realpos = [(x - elpos[0] - this.size[0] / 2 + window.scrollX) / this.scale - this.offset[0], (y - elpos[1] - this.size[1] / 2 + window.scrollY) / this.scale - this.offset[1]];
    if (snap) {
      realpos[0] = Math.round(realpos[0] / this.snapsize) * this.snapsize;
      realpos[1] = Math.round(realpos[1] / this.snapsize) * this.snapsize;
    }
    return new THREE.Vector3(realpos[0], 0, realpos[1]);
  }
  this.getclosestwall = function(point, radius) {
    var distances = [];
    var potentialpoints = [];
    var minidx = false;
    for (var k in this.walls) {
      potentialpoints[k] = this.walls[k].getclosestpoint(point);
      var len = potentialpoints[k].distanceTo(point);
      if (len < radius) {
        distances[k] = len;
        if (!minidx || len < distances[minidx]) {
          minidx = k;
        }
      }
    }
/*
    var selcircle = new elation.graphics.test.circle(point, radius);
    for (var k in this.doors) {
      
    }
*/
    //console.log('potential walls(' + distances.length + '):', distances);
    if (minidx && this.walls[minidx] && potentialpoints[minidx]) {
      var side = this.walls[minidx].getside(point);
      return [this.walls[minidx], potentialpoints[minidx], side];
    }
    return false;
  }
  this.settool = function(toolname) {
    this.currenttool = toolname;
    for (var k in this.toolbox.tools) {
      var tool = this.toolbox.tools[k];
      tool.component.setActive(k == toolname);
    }
    this.drawing = false
    this.dirty = true;
    this.render();
  }
  this.setscale = function(scale) {
    this.scale = elation.utils.math.clamp(scale, 1, 100);
    this.show['measurement'] = (this.scale > 5);
    this.show['grid_feet'] = (this.scale > 5);
    this.show['grid_inches'] = (this.scale > 50);
    this.dirty = true;
    this.render();
  }
  this.setdirty = function() {
    this.dirty = true;
    this.render();
  }
  this.getobjectsinrange = function(tl, br) {
    var min = [0, 0],
        max = [0, 0];
    var cliprect;
    if (tl instanceof THREE.Vector3) {
      cliprect = new elation.graphics.test.rectangle([tl.x, tl.z], [br.x, br.z]);
    } else {
      cliprect = new elation.graphics.test.rectangle(tl, br);
    }

    var results = [];
    for (var i = 0; i < this.walls.length; i++) {
      if (this.walls[i].isin(cliprect)) {
        results.push(this.walls[i]);
      }
    }
    for (var i = 0; i < this.doors.length; i++) {
      if (this.doors[i].isin(cliprect)) {
        results.push(this.doors[i]);
      }
    }
    for (var i = 0; i < this.windows.length; i++) {
      if (this.windows[i].isin(cliprect)) {
        results.push(this.windows[i]);
      }
    }
    //console.log(results);
    return results;
  }
  this.addgroup = function(group, objects, replace) {
    if (replace) {
      this.cleargroup(group);
    }
    if (!this.groups[group]) {
      this.groups[group] = [];
    }
    for (var i = 0; i < objects.length; i++) {
      this.groups[group].push.apply(objects)
    }
  }
  this.removegroup = function(group, objects) {
  }
  this.cleargroup = function(group) {
  }
  this.ingroup = function(group, object) {
  }
  this.mousedown = function(ev) {
    var mousepos = [ev.clientX, ev.clientY];
    var realpos = this.getrealpos(ev.clientX, ev.clientY, true);
    switch (ev.button) {
      case 0:
        switch (this.currenttool) {
          case 'pointer':
            var closest = this.getclosestwall(realpos, 1);
            if (closest) {
            } else {
              this.drawing = new elation.floorplan.selector({start: realpos});
            }
            this.dirty = true;
            break;
          case 'wall':
            this.drawing = new elation.floorplan.wall({start: realpos});
            this.dirty = true;
            break;
        }
        ev.preventDefault();
        break;
      case 1: // middle button
        this.dragging = mousepos;
        ev.preventDefault();
        break;
    }
    this.render();
    // event swap
    elation.events.remove(this.canvas, 'mousemove,mouseup', this);
    elation.events.add(window, 'mousemove,mouseup', this);
  }
  this.mousemove = function(ev) {
    var mousepos = [ev.clientX, ev.clientY];
    var realpos = this.getrealpos(ev.clientX, ev.clientY, true);
    switch (this.currenttool) {
      case 'pointer':
        if (this.hoveritems && this.hoveritems.length > 0) {
          for (var i = 0; i < this.hoveritems.length; i++) {
            this.hoveritems[i].sethover(false);
          }
          this.setdirty();
        }
        if (this.drawing) {
          this.drawing.setend(realpos);
          var picked = this.getobjectsinrange(this.drawing.start, this.drawing.end);
          this.hoveritems = picked;
          for (var i = 0; i < this.hoveritems.length; i++) {
            this.hoveritems[i].sethover(true);
          }
          this.setdirty();
        } else {
          var closest = this.getclosestwall(realpos, 1);
          if (closest) {
            elation.html.addclass(this.canvas, 'state_grabbable');
            closest[0].sethover(true);
            this.hoveritems = [closest[0]];
            this.setdirty();
          } else {
            elation.html.removeclass(this.canvas, 'state_grabbable');
            this.hoveritems = [];
          }
        }
        break;
      case 'wall':
        if (this.drawing) {
          this.drawing.setend(realpos);
          this.dirty = true;
        }
        break;
      case 'door':
      case 'window':
        if (!this.drawing || !(this.drawing instanceof elation.floorplan[this.currenttool])) {
          this.drawing = new elation.floorplan[this.currenttool]({position: realpos});
        }
        var closest = this.getclosestwall(realpos, (this.currenttool == 'door' ? 2 : 1));
        if (closest) {
          this.drawing.enable();
          this.drawing.setwallposition(closest[0], closest[1], closest[2]);
          this.dirty = true;
        } else{
          this.drawing.disable();
          this.drawing.setposition(realpos);
          this.dirty = true;
        }
        break;
    }
    if (this.dragging) {
      var diff = [mousepos[0] - this.dragging[0], mousepos[1] - this.dragging[1]];
      this.offset = [this.offset[0] + diff[0] / this.scale, this.offset[1] + diff[1] / this.scale];
      this.dragging = mousepos;
      this.dirty = true;
    }
    this.render();
  }
  this.mouseup = function(ev) {
    var realpos = this.getrealpos(ev.clientX, ev.clientY, true);
    switch (ev.button) {
      case 0:
        switch (this.currenttool) {
          case 'pointer':
            if (this.drawing) {
              this.drawing = false;
              this.dirty = true;
            } else {
              var closest = this.getclosestwall(realpos, 1);
              if (closest) {
                closest[0].setselected(true);
                this.dirty = true;
              }
            }
            break;
          case 'wall':
            if (this.drawing) {
              if (this.drawing.length() > 0) {
                this.walls.push(this.drawing);
              }
              this.drawing = false;
              this.dirty = true;
              this.savestate();
            }
            break;
          case 'door':
            if (this.drawing && this.drawing.enabled) {
              this.doors.push(this.drawing);
              this.drawing = false;
              this.dirty = true;
              this.savestate();
            }
            break;
          case 'window':
            if (this.drawing && this.drawing.enabled) {
              this.windows.push(this.drawing);
              this.drawing = false;
              this.dirty = true;
              this.savestate();
            }
            break;
        }
        break;
      case 1: // middle button
        this.dragging = false;
        this.dirty = true;
        break;
    }
    if (this.dirty) {
    }
    this.render();
    // reverse event swap
    elation.events.remove(window, 'mousemove,mouseup', this);
    elation.events.add(this.canvas, 'mousemove,mouseup', this);
  }
  this.mousewheel = function(ev) {
    var mult = (ev.wheelDeltaY > 0 ? 1.1 : .9);
    this.setscale(this.scale * mult);
    ev.preventDefault();
  }
  this.keydown = function(ev) {
console.log(ev.keyCode);
    switch (ev.keyCode) {
      case 27: // esc
        if (this.drawing) {
          this.drawing = false;
          if (this.currenttool != 'wall') {
            this.settool('pointer');
          }
        } else {
          this.settool('pointer');
        }
        this.dirty = true;
        break;
      case 16: // shift
        //this.show['grid_inches'] = true; 
        this.snapsize = 1/12;
        this.dirty = true;
        break;
      case 90: // z
        if (ev.ctrlKey) {
          if (ev.shiftKey) {
            this.redostate();
          } else {
            this.undostate();
          }
        }
    }
    this.render();
  }
  this.keyup = function(ev) {
    switch (ev.keyCode) {
      case 16: // shift
        this.show['grid_inches'] = false; 
        this.snapsize = 1;
        this.dirty = true;
        break;
    }
    this.render();
  }
  this.resize = function(ev) {
    this.size = [window.innerWidth, window.innerHeight];
    this.dirty = true;
    this.render();
  }
});
elation.extend("floorplan.wall", function(args) {
  this.studs = 24;
  this.start = new THREE.Vector3();
  this.end = new THREE.Vector3();
  this.width = 3.75/12;
  this._tmpvec  = new THREE.Vector3();
  this.hover = false;
  this.selected = false;

  this.init = function() {
    this.load(args);
  }
  this.load = function(args) {
    if (args.start) {
      this.setstart(args.start);
      if (args.end) {
        this.setend(args.end);
      } else {
        this.setend(args.start);
      }
    }
  }
  this.setstart = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.start.copy(pos);
    } else {
      this.start.set(pos[0], pos[1], pos[2]);
    }
  }
  this.setend = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.end.copy(pos);
    } else {
      this.end.set(pos[0], pos[1], pos[2]);
    }
  }
  this.sethover = function(hover) {
    this.hover = hover;
  }
  this.setselected = function(selected) {
    this.selected = selected;
  }
  this.length = function() {
    return this._tmpvec.sub(this.end, this.start).length();
  }
  this.serialize = function(asobj) {
    var data = {
      studs: this.studs,
      start: [this.start.x, this.start.y, this.start.z],
      end: [this.end.x, this.end.y, this.end.z]
    };
    return (asobj ? data : elation.JSON.stringify(data));;
  }
  this.getclosestpoint = function(point) {
    var dir = new THREE.Vector3().sub(this.end, this.start);
    var length = dir.length();
    var pointvec = point.clone().subSelf(this.start);
    var projdist = pointvec.dot(dir.divideScalar(length));
    //console.log('projdist:', this.start, this.end, projdist, dir, point, pointvec);
    var closest = false;
    if (projdist < 0) {
      return this.start.clone();
    } else if (projdist > length) {
      return this.end.clone();
    } else {
      return dir.multiplyScalar(projdist).addSelf(this.start);
    }
  }
  this.getside = function(point) {
    var diff = this.end.clone().subSelf(this.start).normalize();
    var perp = new THREE.Vector3().cross(diff, new THREE.Vector3(0,1,0)).normalize();
    var cosa = point.clone().subSelf(this.start).dot(perp);
    return (cosa < 0);
  }
  this.getangle = function(from) {
    if (typeof from == 'undefined') {
      from = new THREE.Vector3(1,0,0);
    }
    var diff = this.end.clone().subSelf(this.start).normalize();
    var cosa = diff.dot(from);
    var cross = diff.clone().crossSelf(from);
    var sina = cross.length();
    var theta = Math.atan2(sina, cosa);
    var sign = new THREE.Vector3(0,1,0).dot(cross);
    if (sign < 0) {
      theta *= -1;
    }
    return theta;
  }
  this.isin = function(rect) {
    var line = new elation.graphics.test.line([this.start.x, this.start.z], [this.end.x, this.end.z]);
    return elation.graphics.test.line_rectangle(line, rect);
  }
  this.render = function(parent) {
    var ctx = parent.ctx;

    if (!(this.start && this.end)) {
      console.log('invalid wall', this);
    }
    var halfsize = [parent.size[0]/2, parent.size[1]/2];
    var screenstart = parent.getcanvaspos(this.start);
    var screenend = parent.getcanvaspos(this.end);

    var diff = new THREE.Vector3().sub(this.end, this.start);
    var perp = new THREE.Vector3().cross(diff, new THREE.Vector3(0,1,0)).normalize().multiplyScalar(this.width);
    var innerstart = parent.getcanvaspos(new THREE.Vector3().add(this.start, perp));
    var innerend = parent.getcanvaspos(new THREE.Vector3().add(this.end, perp));
    var length = diff.length();

    if (this.selected) {
      parent.setstyle(parent.style['selected']);
    } else if (this.hover) {
      parent.setstyle(parent.style['hover']);
    }
    
    if (this.hover || this.selected) {
      ctx.save();
      ctx.translate(screenstart.x, screenstart.z);
      ctx.rotate(this.getangle());
      var hoverpad = 2;
      ctx.fillRect(0, -hoverpad, length * parent.scale, this.width * parent.scale + hoverpad * 2);
      ctx.restore();
    }

    parent.setstyle(parent.style['wall']);
    ctx.beginPath();
    ctx.moveTo(screenstart.x, screenstart.z);
    ctx.lineTo(screenend.x, screenend.z);
    ctx.moveTo(innerstart.x, innerstart.z);
    ctx.lineTo(innerend.x, innerend.z);
    ctx.stroke();

    var studpos = new THREE.Vector3();
    var studgap = this.studs / 12;
    //ctx.lineWidth = 3.75 / 12 * parent.scale/4;
    ctx.lineWidth = 1; // FIXME - adaptive size for better physical accuracy
    ctx.beginPath();
    for (var i = 0; i <= Math.ceil(length / studgap); i++) {
      var s = Math.min(length, i * studgap);
      var studfart = diff.clone().normalize().multiplyScalar(s);
      studpos.add(this.start, studfart);
//console.log(i, studgap, i * studgap, studpos.x, studpos.y, studpos.z);
      var studstart = parent.getcanvaspos(studpos);
      var studend = parent.getcanvaspos(studpos.addSelf(perp));
      ctx.moveTo(studstart.x, studstart.z);
      ctx.lineTo(studend.x, studend.z);
    }
    ctx.stroke();

    if (parent.show['measurement']) {
      // measurement line
      var measurestart = parent.getcanvaspos(this.start); //new THREE.Vector3().sub(this.start,perp));
      var measuremiddle = parent.getcanvaspos(new THREE.Vector3().sub(this.start.clone().addSelf(diff.divideScalar(2)),perp));
      var measureend = parent.getcanvaspos(this.end);//new THREE.Vector3().sub(this.end,perp));
      var measureint = Math.floor(length) 
      var measurefrac = length - measureint;
      var measure = Math.floor(length) + "'";
      if (measurefrac > 0) {
        var measureinch = measurefrac * 12; 
        var measureinchint = Math.floor(measureinch);
        var measureinchfrac = measureinch - measureinchint;
        var measureinchfracdenom = elation.utils.math.gcd(Math.round(measureinchfrac*64), 64);
        var measureinchfracnum = Math.round(measureinchfrac * measureinchfracdenom);
        if (measureinchint > 0) {
          measure += ' ' + measureinchint;
        }
        if (measureinchfracnum > 0 && measureinchfracnum != measureinchfracdenom) {
          if (parent.fractions[measureinchfracdenom] && parent.fractions[measureinchfracdenom][measureinchfracnum]) {
            measure += ' ' + parent.fractions[measureinchfracdenom][measureinchfracnum];
          } else {
            measure += ' ' + measureinchfracdenom + '/' + measureinchfracnum;
          }
        }
        measure += '"';
      } else if (measureinchint > 0) {
        measure += '"';
      }
      
      //console.log(measuremiddle.x , perp.x * 50);
      var perpmultx = (perp.x > 0 ? 12 : 6) * parent.scale;
      var perpmultz = (perp.z > 0 ? 5 : 8) * parent.scale;

      ctx.beginPath();
      parent.setstyle(parent.style['measurement']);
      ctx.fillText(measure, measuremiddle.x - perp.x * perpmultx, measuremiddle.z - perp.z * perpmultz);
      //ctx.moveTo(measurestart.x, measurestart.z);
      //ctx.lineTo(measureend.x, measureend.z);
      ctx.moveTo(measurestart.x,measurestart.z);
      var midpoint = measuremiddle.x - measurestart.x;
      var foo = 4 * parent.scale;
      ctx.bezierCurveTo(measurestart.x - perp.x * foo, measurestart.z - perp.z * foo, measuremiddle.x - perp.x / foo, measuremiddle.z - perp.z / foo, measuremiddle.x - perp.x * foo, measuremiddle.z - perp.z * foo);
      ctx.bezierCurveTo(measuremiddle.x - perp.x / foo, measuremiddle.z - perp.z / foo, measureend.x - perp.x * foo, measureend.z - perp.z * foo, measureend.x,measureend.z);
      ctx.stroke();
    }
    
  }
  this.init();
});
elation.extend("floorplan.door", function(args) {
  this.position = new THREE.Vector3();
  this.width = 2.6667;
  this.thickness = 3.75/12;
  this.enabled = false;
  this.exterior = false;
  this.angle = 0;
  this.active = false;
  this.hover = false;
  this._tmpvec  = new THREE.Vector3();

  this.init = function() {
    this.load(args);
  }
  this.load = function(args) {
    for (var k in args) {
      if (k == 'position') {
        this.setposition(args[k]);
      } else {
        this[k] = args[k];
      }
    }
  }
  this.setposition = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.position.copy(pos);
    } else {
      this.position.set(pos[0], pos[1], pos[2]);
    }
  }
  this.setwallposition = function(wall, pos, exterior) {
    this.angle = wall.getangle();
    this.setposition(pos);
    this.exterior = exterior || false;;
  }
  this.sethover = function(hover) {
    this.hover = hover;
  }
  this.setactive = function(active) {
    this.active = active;
  }
  this.enable = function() {
    this.enabled = true;
  }
  this.disable = function() {
    this.enabled = false;
  }
  this.isin = function(rect) {
    var halfwidth = this.width/2;
    var angle = (this.exterior ? this.angle + Math.PI : this.angle);
    var circle = new elation.graphics.test.circle([this.position.x - Math.sin(angle) * halfwidth, this.position.z + Math.cos(angle) * halfwidth], this.width/2);
    return elation.graphics.test.circle_rectangle(circle, rect);
  }
  this.serialize = function(asobj) {
    var data = {
      position: [this.position.x, this.position.y, this.position.z],
      width: this.width,
      thickness: this.thickness,
      exterior: this.exterior,
      angle: this.angle,
      enabled: this.enabled
    };
    return (asobj ? data : elation.JSON.stringify(data));;
  }
  this.render = function(parent) {
    var ctx = parent.ctx;
  
    var canvaspos = parent.getcanvaspos(this.position);
    ctx.save();
    ctx.translate(canvaspos.x, canvaspos.z);
    ctx.rotate((this.exterior ? this.angle + Math.PI : this.angle));
//console.log(this.angle);
    var width = this.width * parent.scale;
    var halfwidth = width / 2;
    var thickness = this.thickness * parent.scale;
    var padding = 0;
    var offset = (this.exterior ? -thickness : 0);;
    ctx.fillStyle = (this.enabled ? "#cccccc" : '#ff0000');
    ctx.fillRect(-halfwidth, -padding + offset, width, thickness + padding * 2);
    if (this.selected) {
      parent.setstyle(parent.style['selected']);
    } else if (this.hover) {
      parent.setstyle(parent.style['hover']);
    } else {
      parent.setstyle(parent.style['door']);
    }
    ctx.beginPath();
    ctx.moveTo(-halfwidth, offset);
    ctx.lineTo(-halfwidth, width + offset);
    ctx.arcTo(halfwidth, width + offset, halfwidth, offset, width);
    ctx.stroke();
    ctx.fill();
    ctx.restore();

  }
  this.init();
});
elation.extend("floorplan.window", function(args) {
  this.position = new THREE.Vector3();
  this.width = 4;
  this.thickness = 3.75/12;
  this.enabled = false;
  this.hover = false;
  this.selected = false;
  this.angle = 0;
  this._tmpvec  = new THREE.Vector3();

  this.init = function() {
    this.load(args);
  }
  this.load = function(args) {
    for (var k in args) {
      if (k == 'position') {
        this.setposition(args[k]);
      } else {
        this[k] = args[k];
      }
    }
  }

  this.setposition = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.position.copy(pos);
    } else {
      this.position.set(pos[0], pos[1], pos[2]);
    }
  }
  this.setwallposition = function(wall, pos, exterior) {
    this.angle = wall.getangle();
    this.setposition(pos);
    this.exterior = exterior || false;;
  }
  this.sethover = function(hover) {
    this.hover = hover;
  }
  this.setselected = function(selected) {
    this.selected = selected;
  }
  this.isin = function(rect) {
    var circle = new elation.graphics.test.circle([this.position.x, this.position.z], this.width/2);
    return elation.graphics.test.circle_rectangle(circle, rect);
  }
  this.enable = function() {
    this.enabled = true;
  }
  this.disable = function() {
    this.enabled = false;
  }
  this.serialize = function(asobj) {
    var data = {
      position: [this.position.x, this.position.y, this.position.z],
      width: this.width,
      thickness: this.thickness,
      angle: this.angle,
      enabled: this.enabled
    };
    return (asobj ? data : elation.JSON.stringify(data));;
  }
  this.render = function(parent) {
    var ctx = parent.ctx;
  
    var canvaspos = parent.getcanvaspos(this.position);
    ctx.save();
    ctx.translate(canvaspos.x, canvaspos.z);
    ctx.rotate((this.exterior ? this.angle + Math.PI : this.angle));
//console.log(this.angle);
    var width = this.width * parent.scale;
    var halfwidth = width / 2;
    var thickness = this.thickness * parent.scale;
    var padding = 2;
    var offset = (this.exterior ? -thickness : 0);;
    if (this.selected) {
      parent.setstyle(parent.style['selected']);
    } else if (this.hover) {
      parent.setstyle(parent.style['hover']);
    } else {
      ctx.fillStyle = (this.enabled ? parent.style['window'][2] : '#ffcccc');
    }
    ctx.fillRect(-halfwidth, -padding + offset, width, thickness + padding * 2);
    parent.setstyle(parent.style['window']);
    ctx.beginPath();
    ctx.moveTo(-halfwidth, offset);
    ctx.lineTo(-halfwidth, thickness + offset);
    ctx.moveTo(halfwidth, offset);
    ctx.lineTo(halfwidth, thickness + offset);

    ctx.moveTo(-halfwidth, thickness / 2 + offset);
    ctx.lineTo(halfwidth, thickness / 2 + offset);
    ctx.stroke();
    ctx.restore();
  }
  this.init();
});
elation.extend("floorplan.selector", function(args) {
  this.start = new THREE.Vector3();
  this.end = new THREE.Vector3();
  this._tmpvec  = new THREE.Vector3();

  this.init = function() {
    this.load(args);
  }
  this.load = function(args) {
    if (args.start) {
      this.setstart(args.start);
      if (args.end) {
        this.setend(args.end);
      } else {
        this.setend(args.start);
      }
    }
  }
  this.setstart = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.start.copy(pos);
    } else {
      this.start.set(pos[0], pos[1], pos[2]);
    }
  }
  this.setend = function(pos) {
    if (pos instanceof THREE.Vector3) {
      this.end.copy(pos);
    } else {
      this.end.set(pos[0], pos[1], pos[2]);
    }
  }
  this.render = function(parent) {
    var ctx = parent.ctx;
    var canvasstart = parent.getcanvaspos(this.start);
    var canvasend = parent.getcanvaspos(this.end);

    var tl = [Math.min(canvasstart.x, canvasend.x), Math.min(canvasstart.z, canvasend.z)];
    var br = [Math.max(canvasstart.x, canvasend.x), Math.max(canvasstart.z, canvasend.z)];

    var dashlength = 10;
    var range = [Math.abs(br[0] - tl[0]), Math.abs(br[1] - tl[1])];
    ctx.fillStyle = 'rgba(255,0,0,.05)';
    parent.setstyle(parent.style['selector']);
    ctx.fillRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]);
    ctx.beginPath();
    this.strokeline(ctx, tl, range[0], dashlength, 1, false);
    this.strokeline(ctx, [br[0], tl[1]], range[1], dashlength, 1, true);
    this.strokeline(ctx, br, range[0], dashlength, -1, false);
    this.strokeline(ctx, [tl[0], br[1]], range[1], dashlength, -1, true);
    ctx.stroke();
  }
  this.strokeline = function(ctx, start, length, width, dir, vert) {
    for (var n = 0; n <= length / width; n++) {
      if (n % 2 == 0) {
        if (vert) {
          ctx.moveTo(start[0], start[1] + n * width * dir);
        } else {
          ctx.moveTo(start[0] + n * width * dir, start[1]);
        }
      } else {
        if (vert) {
          ctx.lineTo(start[0], start[1] + n * width * dir);
        } else {
          ctx.lineTo(start[0] + n * width * dir, start[1]);
        }
      }
    }
  }
  this.init();
});
