elation.require(['ui.toolbox'], function() {
  elation.component.add('floorplan', function() {
    this.offset = [0,0];
    this.tools = {};
    this.objects = [];
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
      'outlet': [1, '#000', 'rgba(0,0,255,.5)'],
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
      this.addtool('outlet');

      this.settool('pointer');

      // drag is always active
      this.addtool('drag', true);
      this.tools['drag'].attach(this);
      
    }
    this.serialize = function(asobj) {
      var data = {}; 
      data['objects'] = [];
      for (var i = 0; i < this.objects.length; i++) {
        data['objects'][i] = this.objects[i].serialize(true);
      }
      data['scale'] = this.scale;
      data['offset'] = this.offset;
      return (asobj ? data : elation.JSON.stringify(data));
    }
    this.clearstate = function() {
      this.objects = [];
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
        this.clearstate();
        if (stateobj.objects) {
          for (var i = 0; i < stateobj.objects.length; i++) {
            var type = stateobj.objects[i].type;
            this.objects.push(new elation.floorplan.things[type](stateobj.objects[i]));
          }
        }
        if (stateobj.scale) this.scale = stateobj.scale;
        if (stateobj.offset) this.offset = stateobj.offset;
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
      for (var i = 0; i < this.objects.length; i++) {
        if (this.objects[i].isin(cliprect)) {
          this.objects[i].render(this);
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
    this.getclosestobject = function(point, radius, type) {
      var distances = [];
      var potentialpoints = [];
      var minidx = false;
      for (var k in this.objects) {
        potentialpoints[k] = this.objects[k].getclosestpoint(point);
        if (potentialpoints[k]) {
          var len = potentialpoints[k].distanceTo(point);
          if ((!type || type == this.objects[k].type) && len < radius) {
            distances[k] = len;
            if (!minidx || len < distances[minidx]) {
              minidx = k;
            }
          }
        }
      }
  /*
      var selcircle = new elation.graphics.test.circle(point, radius);
      for (var k in this.doors) {
        
      }
  */
      //console.log('potential walls(' + distances.length + '):', distances, minidx);
      if (minidx && this.objects[minidx] && potentialpoints[minidx]) {
        var quadrant = this.objects[minidx].getquadrant(point);
        return [this.objects[minidx], potentialpoints[minidx], quadrant];
      }
      return false;
    }
    this.addtool = function(name, invisible) {
      if (!invisible) {
        this.toolbox.addtool(name, elation.bind(this, function() { this.settool(name); }));
      }
      if (typeof elation.floorplan.tools[name] == 'function') {
        this.tools[name] = new elation.floorplan.tools[name]();
      }
    }
    this.settool = function(toolname) {
      if (this.tools[this.currenttool]) {
        this.tools[this.currenttool].detach();
      }
      this.currenttool = toolname;
      for (var k in this.toolbox.tools) {
        var tool = this.toolbox.tools[k];
        tool.component.setActive(k == toolname);
      }
      this.tools[toolname].attach(this);
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
      for (var i = 0; i < this.objects.length; i++) {
        if (this.objects[i].isin(cliprect)) {
          results.push(this.objects[i]);
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
    this.mousewheel = function(ev) {
      var mult = (ev.wheelDeltaY > 0 ? 1.1 : .9);
      this.setscale(this.scale * mult);
      ev.preventDefault();
    }
    this.keydown = function(ev) {
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
      this.setdirty();
    }
  });
});
