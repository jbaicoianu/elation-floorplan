elation.extend("floorplan.things.wall", function(args) {
  this.type = 'wall';
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
      type: this.type,
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
  this.getquadrant = function(point) {
    var diff = this.end.clone().subSelf(this.start).normalize();
    var perp = new THREE.Vector3().cross(diff, new THREE.Vector3(0,1,0)).normalize();
    var cosa = point.clone().subSelf(this.start).dot(perp);
    return [(cosa < 0 ? -1 : 1), (cosa < 0 ? -1 : 1)];
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
elation.extend("floorplan.things.door", function(args) {
  this.type = 'door';
  this.position = new THREE.Vector3();
  this.width = 2.6667;
  this.thickness = 3.75/12;
  this.enabled = false;
  this.exterior = false;
  this.direction = 'right';
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
  this.getclosestpoint = function(point) {
    var center = this.position.clone();
    var halfwidth = this.width / 2;
    if (this.exterior) {
      center.x += Math.sin(this.angle) * halfwidth;
      center.z -= Math.cos(this.angle) * halfwidth;
    } else {
      center.x -= Math.sin(this.angle) * halfwidth;
      center.z += Math.cos(this.angle) * halfwidth;
    }
    return point.clone().subSelf(center).normalize().multiplyScalar(halfwidth / 2).addSelf(center);
  }
  this.getquadrant = function(point) {
    var perp = new THREE.Vector3(Math.cos(this.angle), 0, Math.sin(this.angle));
    var relpos = point.clone().subSelf(this.position);
    var dot = relpos.dot(perp);
    var left = dot < 0;

    perp.set(Math.cos(this.angle + Math.PI/2), 0, Math.sin(this.angle + Math.PI/2));
    dot = relpos.dot(perp);
    var bottom = dot < 0;

    return [(left ? -1 : 1), (bottom ? -1 : 1)];
  }
  this.serialize = function(asobj) {
    var data = {
      type: this.type,
      position: [this.position.x, this.position.y, this.position.z],
      width: this.width,
      thickness: this.thickness,
      exterior: this.exterior,
      angle: this.angle,
      direction: this.direction,
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
    if (this.direction == 'right') {
      ctx.moveTo(-halfwidth, offset);
      ctx.lineTo(-halfwidth, width + offset);
      ctx.arcTo(halfwidth, width + offset, halfwidth, offset, width);
    } else if (this.direction == 'left') {
      ctx.moveTo(halfwidth, offset);
      ctx.lineTo(halfwidth, width + offset);
      ctx.arcTo(-halfwidth, width + offset, -halfwidth, offset, width);
    }
    ctx.stroke();
    ctx.fill();
    ctx.restore();

  }
  this.init();
});
elation.extend("floorplan.things.window", function(args) {
  this.type = 'window';
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
  this.getclosestpoint = function(point) {
    return false;
  }
  this.getquadrant = function(point) {
    var perp = new THREE.Vector3(Math.cos(this.angle), 0, Math.sin(this.angle));
    var relpos = point.clone().subSelf(this.position);
    var dot = relpos.dot(perp);
    var left = dot < 0;

    perp.set(Math.cos(this.angle + Math.PI/2), 0, Math.sin(this.angle + Math.PI/2));
    dot = relpos.dot(perp);
    var bottom = dot < 0;

    return [(left ? -1 : 1), (bottom ? -1 : 1)];
  }
  this.enable = function() {
    this.enabled = true;
  }
  this.disable = function() {
    this.enabled = false;
  }
  this.serialize = function(asobj) {
    var data = {
      type: this.type,
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
elation.extend("floorplan.things.selector", function(args) {
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
  this.getclosestpoint = function(point) {
    return false;
  }
  this.init();
});

elation.extend("floorplan.things.outlet", function(args) {
  this.type = 'window';
  this.position = new THREE.Vector3();
  this.width = 1;//3.75 / 12;
  this.enabled = false;
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
  this.getclosestpoint = function(point) {
    return false;
  }
  this.getquadrant = function(point) {
    var perp = new THREE.Vector3(Math.cos(this.angle), 0, Math.sin(this.angle));
    var relpos = point.clone().subSelf(this.position);
    var dot = relpos.dot(perp);
    var left = dot < 0;

    perp.set(Math.cos(this.angle + Math.PI/2), 0, Math.sin(this.angle + Math.PI/2));
    dot = relpos.dot(perp);
    var bottom = dot < 0;

    return [(left ? -1 : 1), (bottom ? -1 : 1)];
  }
  this.enable = function() {
    this.enabled = true;
  }
  this.disable = function() {
    this.enabled = false;
  }
  this.serialize = function(asobj) {
    var data = {
      type: this.type,
      position: [this.position.x, this.position.y, this.position.z],
      width: this.width,
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
    var padding = 2;
    var offset = (this.exterior ? -halfwidth : halfwidth)*2;
    if (this.selected) {
      parent.setstyle(parent.style['selected']);
    } else if (this.hover) {
      parent.setstyle(parent.style['hover']);
    } else {
      parent.setstyle(parent.style['outlet']);
    }
    //ctx.fillRect(-halfwidth, -padding + offset, width, thickness + padding * 2);
    ctx.strokeStyle = (this.enabled ? parent.style['outlet'][1] : '#ff0000');
    ctx.beginPath();

    ctx.arc(0,offset,halfwidth,0,2*Math.PI,false);
    //ctx.fill();

    var fuh = halfwidth*.8;
    ctx.moveTo(-fuh, -fuh*.75+offset);
    ctx.lineTo(-fuh, 0);
    ctx.moveTo(fuh, -fuh*.75+offset);
    ctx.lineTo(fuh, 0);
    ctx.stroke();
    ctx.restore();
  }
  this.init();
});
