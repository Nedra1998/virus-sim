// Make an instance of two and place it on the page.
const width = 500
const height = 350
const radius = 3
const wallLen = 500;
const colors = {
  default: '#03a9f4',
  infected: '#e91e63',
  recovered: '#4caf50',
  dead: '#607d8b'
}
var elem = document.getElementById('scene');
var two = new Two({width: width, height: height}).appendTo(elem);

var nodes = []
var walls = []
var active = false;

var data = {t: 0, healthy: 0, infected: 0, recovered: 0, dead: 0};
var updatePlot = 1.0;

const spawnNodes = (n) => {
  if (nodes.length > n) {
    for (var i = Math.floor(n); i < nodes.length; ++i) {
      two.remove(nodes[i].g);
    }
    nodes = _.slice(nodes, 0, n);
  } else {
    while (nodes.length < n) {
      const x = _.random(width);
      const y = _.random(height);
      var valid = true;
      for (var i = 0; i < nodes.length; ++i) {
        const dx = Math.abs(x - nodes[i].x);
        const dy = Math.abs(y - nodes[i].y);
        if (dx * dx + dy * dy <= radius * radius * radius * radius) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      nodes.push({x: x, y: y, dx: 0, dy: 0, g: two.makeCircle(x, y, radius), age: 0, state: 0, moving: false});
      _.last(nodes).g.fill = colors.default;
      _.last(nodes).g.noStroke();
    }
  }
  two.update();
}

const initialInfect = (perc) => {
  for (var i = 0; i < nodes.length * perc; ++i) {
    nodes[i].g.fill = colors.infected;
    nodes[i].state = 1;
  }
  for (var i = Math.floor(nodes.length * perc); i < nodes.length; ++i) {
    nodes[i].g.fill = colors.default;
    nodes[i].state = 0;
  }
  two.update();
}

const setMoving = (perc, minSpeed, maxSpeed) => {
  const diff = maxSpeed - minSpeed;
  for (var i = 0; i < nodes.length; ++i) {
    if (_.random(0, 1, true) < perc) {
      const dx = _.random(-1, 1, true);
      const dy = _.random(-1, 1, true);
      nodes[i].moving = true;
      nodes[i].dx = diff * dx + minSpeed * Math.sign(dx);
      nodes[i].dy = diff * dy + minSpeed * Math.sign(dy);
    }
    else nodes[i].moving = false;
  }
}

class Params {
  constructor() {
    this.count = 500;
    this.initialInfected = 0.1;
    this.movement = 0.1;
    this.movementMaxSpeed = 50;
    this.movementMinSpeed = 25;
    this.movementSystem = 0;
    this.stopTime = -1;
    this.recoveryRate = 10;
    this.recoveryVariance = 10;
    this.infectionRadius = radius;
    this.mortality = 0.03;
    this.startStop = () => {
      active = !active;
      if (active) {
        data = {t: 0, healthy: 0, infected: 0, recovered: 0, dead: 0};
        updatePlot = 1.0;
        setMoving(this.movement, this.movementMinSpeed, this.movementMaxSpeed);
        for (var node of nodes) {
          if (node.state == 1) node.age = this.recoveryRate + _.random(0, this.recoveryVariance, true);
          if (node.state == 0) data.healthy += 1;
          if (node.state == 1) data.infected += 1;
          if (node.state == 2) data.recovered += 1;
          if (node.state == 3) data.dead += 1;
        }
        Plotly.newPlot('plot', [
          {x: [data.t], y: [data.infected], stackgroup: 'one', name: 'Infected', marker: {color: colors.infected}},
          {x: [data.t], y: [data.recovered], stackgroup: 'one', name: 'Recovered', marker: {color: colors.recovered}},
          {x: [data.t], y: [data.healthy], stackgroup: 'one', name: 'Healthy', marker: {color: colors.default}},
          {x: [data.t], y: [data.dead], stackgroup: 'one', name: 'Dead', marker: {color: colors.dead}}
        ], {title: 'Infections'});
      }
    };
    this.reset = () => {
      active = false;
      nodes = []
      walls = []
      two.clear();
      spawnNodes(this.count);
      initialInfect(this.initialInfected);
    };
    this.clear = () => {
      for (var wall of walls) {
        two.remove(wall);
      }
      walls = []
    }
  }
}
var params = new Params();

const pointCircle = (px, py, cx, cy, r) => {
  var dx = px - cx;
  var dy = py - cy;
  if ((dx * dx) + (dy * dy) <= r * r) return true;
  return false;
}
const circleCircle = (c1x, c1y, c1r, c2x, c2y, c2r) => {
  var dx = c1x - c2x;
  var dy = c1y - c2y;
  if ((dx * dx) + (dy * dy) <= (c1r + c2r) * (c1r + c2r)) return true;
  return false;
}
const linePoint = (x1, y1, x2, y2, px, py) => {
  var d1 = Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  var d2 = Math.sqrt((px - x2) * (px - x2) + (py - y2) * (py - y2));
  var lineLen = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  if (d1 + d2 >= lineLen - 0.1 && d1 + d2 <= lineLen + 0.1) return true;
  return false;
}
const lineCircle = (x1, y1, x2, y2, cx, cy, r) => {
  if (pointCircle(x1, y1, cx, cy, r) || pointCircle(x2, y2, cx, cy, r)) return true;
  var dx = x1 - x2;
  var dy = y1 - y2;
  var len = Math.sqrt((dx * dx) + (dy * dy));
  var dot = (((cx - x1) * (x2 - x1)) + ((cy - y1) * (y2 - y1))) / (len * len);
  var clx = x1 + (dot * (x2 - x1));
  var cly = y1 + (dot * (y2 - y1));
  if (!linePoint(x1, y1, x2, y2, clx, cly)) return false;
  dx = clx - cx;
  dy = cly - cy;
  var dist = Math.sqrt((dx * dx) + (dy * dy));
  if (dist <= r) return true;
  return false;
}

const processFrame = () => {
  if (!active) return;
  const deltat = two.timeDelta / 1000;
  data.t += deltat;
  data.healthy = 0;
  data.infected = 0;
  data.recovered = 0;
  data.dead = 0;
  for (var i = 0; i < nodes.length; ++i) {
    var node = nodes[i];
    if (node.state == 0) data.healthy += 1;
    if (node.state == 1) data.infected += 1;
    if (node.state == 2) data.recovered += 1;
    if (node.state == 3) data.dead += 1;
    if (node.state == 3) continue;
    // Update data
    if (node.moving) {
      // Process edge collision
      if (node.x + node.dx * deltat < 0 || node.x + node.dx * deltat >= width) node.dx *= -1;
      if (node.y + node.dy * deltat < 0 || node.y + node.dy * deltat >= height) node.dy *= -1;
      // Process wall collision
      for (var j = 0; j < walls.length; ++j) {
        if (circleCircle(node.x, node.y, radius, walls[j].x1, walls[j].y1, wallLen) && circleCircle(node.x, node.y, radius, walls[j].x2, walls[j].y2, wallLen) && lineCircle(walls[j].x1, walls[j].y1, walls[j].x2, walls[j].y2, node.x, node.y, radius)) {
          var dx = walls[j].x1 - walls[j].x2;
          var dy = walls[j].y1 - walls[j].y2;
          var len = Math.sqrt((dx * dx) + (dy * dy));
          var dot = (((node.x - walls[j].x1) * (walls[j].x2 - walls[j].x1)) + ((node.y - walls[j].y1) * (walls[j].y2 - walls[j].y1))) / (len * len);
          var clx = walls[j].x1 + (dot * (walls[j].x2 - walls[j].x1));
          var cly = walls[j].y1 + (dot * (walls[j].y2 - walls[j].y1));
          var nx = node.x - clx;
          var ny = node.y - cly;
          len = Math.sqrt((nx * nx) + (ny * ny));
          nx /= len;
          ny /= len;
          dot = node.dx * nx + node.dy * ny;
          node.dx -= 2 * dot * nx;
          node.dy -= 2 * dot * ny;
        }
      }
      // Process node collision 
      for (var j = 0; j < nodes.length; ++j) {
        if (i == j) continue;
        const dx = Math.abs(node.x - nodes[j].x);
        const dy = Math.abs(node.y - nodes[j].y);
        if (dx * dx + dy * dy <= params.infectionRadius * params.infectionRadius * 2) {
          if (node.state == 1 && nodes[j].state == 0) {
            nodes[j].state = 1;
            nodes[j].age = params.recoveryRate + _.random(0, params.recoveryVariance, true);
            nodes[j].g.fill = colors.infected;
          } else if (node.state == 0 && nodes[j].state == 1) {
            node.state = 1;
            node.age = params.recoveryRate + _.random(0, params.recoveryVariance, true);
            node.g.fill = colors.infected;
          }
          if (params.movementSystem == 0) {
          } else if (params.movementSystem == 1) {
            var nx = node.x - nodes[j].x;
            var ny = node.y - nodes[j].y;
            const nlen = Math.sqrt(nx * nx + ny * ny)
            nx /= nlen;
            ny /= nlen;
            var dot = node.dx * nx + node.dy * ny;
            node.dx -= 2 * dot * nx;
            node.dy -= 2 * dot * ny;
          }
        }
      }
      node.x += (node.dx * deltat)
      node.y += (node.dy * deltat)
      node.g.translation.set(node.x, node.y);
    }
    if (node.state == 1) {
      node.age -= deltat;
      if (node.age < 0) {
        if (_.random(0, 1, true) < params.mortality) {
          node.state = 3
          node.g.fill = colors.dead;
        }
        else {
          node.state = 2;
          node.g.fill = colors.recovered;
        }
      }
    }
  }
}

var gui = new dat.GUI();

var initial = gui.addFolder('Initial Conditions');
var countVal = initial.add(params, 'count', 1, 1000);
var initialInfectedVal = initial.add(params, 'initialInfected', 0, 1);
initial.add(params, 'movement', 0, 1);

var simulation = gui.addFolder('Simulation');
simulation.add(params, 'stopTime');
simulation.add(params, 'movementSystem', {'None': 0, 'Elastic': 1});
simulation.add(params, 'movementMaxSpeed', 0, 100);
simulation.add(params, 'movementMinSpeed', 0, 100);

var virus = gui.addFolder('Virus');
virus.add(params, 'recoveryRate');
virus.add(params, 'recoveryVariance');
virus.add(params, 'infectionRadius', radius, 50);
virus.add(params, 'mortality', 0, 1);

gui.add(params, 'startStop');
gui.add(params, 'reset');
gui.add(params, 'clear');

countVal.onChange((val) => {
  spawnNodes(val);
});
initialInfectedVal.onChange((val) => {
  initialInfect(val);
});

spawnNodes(params.count);
initialInfect(params.initialInfected);

two.bind('update', () => {
  if (active) {
    processFrame();
    if (data.t + updatePlot > 0) {
      Plotly.extendTraces('plot', {x: [[data.t], [data.t], [data.t], [data.t]], y: [[data.infected], [data.recovered], [data.healthy], [data.dead]]}, [0, 1, 2, 3])
      updatePlot = -data.t - 0.25;
    }
    if (params.stopTime > 0 && params.stopTime < data.t) active = false;
  }
}).play();

var lastX = null;
var lastY = null;

elem.onmousemove = function (e) {
  var x = e.pageX - this.offsetLeft - (this.offsetWidth - width) / 2;
  var y = e.pageY - this.offsetTop;
  if (x < 0 || x > width || e.buttons != 1) return;
  if ((x - lastX) * (x - lastX) + (y - lastY) * (y - lastY) <= wallLen) return;
  if (lastX != null) {
    walls.push({x1: lastX, y1: lastY, x2: x, y2: y, g: two.makeLine(lastX, lastY, x, y)});
    _.last(walls).g.linewidth = 3;
  }
  lastX = x;
  lastY = y;
}
elem.onmouseup = function () {
  lastX = null;
  lastY = null;
}
