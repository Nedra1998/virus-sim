// Make an instance of two and place it on the page.
const width = 500
const height = 350
const radius = 3
const colors = {
  default: '#03a9f4',
  infected: '#e91e63',
  recovered: '#4caf50',
  dead: '#607d8b'
}
var elem = document.getElementById('scene');
var two = new Two({width: width, height: height}).appendTo(elem);

var nodes = []
var active = false;

var data = {t: [], healthy: [], infected: [], recovered: [], dead: []};

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
        data = {t: [0], healthy: [0], infected: [0], recovered: [0], dead: [0]};
        setMoving(this.movement, this.movementMinSpeed, this.movementMaxSpeed);
        for (var node of nodes) {
          if (node.state == 1) node.age = this.recoveryRate + _.random(0, this.recoveryVariance, true);
          if (node.state == 0) data.healthy[0] += 1;
          if (node.state == 1) data.infected[0] += 1;
          if (node.state == 2) data.recovered[0] += 1;
          if (node.state == 3) data.dead[0] += 1;
        }
        Plotly.newPlot('plot', [
          {x: data.t, y: data.infected, stackgroup: 'one', name: 'Infected', marker: {color: colors.infected}},
          {x: data.t, y: data.recovered, stackgroup: 'one', name: 'Recovered', marker: {color: colors.recovered}},
          {x: data.t, y: data.healthy, stackgroup: 'one', name: 'Healthy', marker: {color: colors.default}},
          {x: data.t, y: data.dead, stackgroup: 'one', name: 'Dead', marker: {color: colors.dead}}
        ], {title: 'Infections'});
      }
    };
    this.reset = () => {
      active = false;
      nodes = []
      two.clear();
      spawnNodes(this.count);
      initialInfect(this.initialInfected);
    }
  }
}
var params = new Params();

const processFrame = () => {
  if (!active) return;
  const deltat = two.timeDelta / 1000;
  data.t.push(_.last(data.t) + deltat);
  data.healthy.push(0);
  data.infected.push(0);
  data.recovered.push(0);
  data.dead.push(0);
  for (var i = 0; i < nodes.length; ++i) {
    var node = nodes[i];
    if (node.state == 0) data.healthy[data.healthy.length - 1] += 1;
    if (node.state == 1) data.infected[data.healthy.length - 1] += 1;
    if (node.state == 2) data.recovered[data.healthy.length - 1] += 1;
    if (node.state == 3) data.dead[data.healthy.length - 1] += 1;
    if (node.state == 3) continue;
    // Update data
    if (node.moving) {
      // Process wall collision
      if (node.x + node.dx * deltat < 0 || node.x + node.dx * deltat >= width) node.dx *= -1;
      if (node.y + node.dy * deltat < 0 || node.y + node.dy * deltat >= height) node.dy *= -1;
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
            console.log(node, nodes[j]);
            var nx = node.x - nodes[j].x;
            var ny = node.y - nodes[j].y;
            const nlen = Math.sqrt(nx * nx + ny * ny)
            nx /= nlen;
            ny /= nlen;
            console.log(nx, ny);
            node.dx = node.dx - 2 * (node.dx * nx + node.dy * ny) * nx;
            node.dy = node.dy - 2 * (node.dx * nx + node.dy * ny) * ny;
            console.log(node.dx, node.dy);
          } else if (params.movementSystem == 2) {
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
var countVal = initial.add(params, 'count', 1, 500);
var initialInfectedVal = initial.add(params, 'initialInfected', 0, 1);
initial.add(params, 'movement', 0, 1);

var simulation = gui.addFolder('Simulation');
simulation.add(params, 'stopTime');
simulation.add(params, 'movementSystem', {'None': 0, 'Fixed': 1, 'Elastic': 2});
simulation.add(params, 'movementMaxSpeed', 0, 100);
simulation.add(params, 'movementMinSpeed', 0, 100);

var virus = gui.addFolder('Virus');
virus.add(params, 'recoveryRate');
virus.add(params, 'recoveryVariance');
virus.add(params, 'infectionRadius', radius, 50);
virus.add(params, 'mortality', 0, 1);

gui.add(params, 'startStop');
gui.add(params, 'reset');

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
    Plotly.extendTraces('plot', {y: [[_.last(data.infected)], [_.last(data.recovered)], [_.last(data.healthy)], [_.last(data.dead)]]}, [0, 1, 2, 3])
    if (params.stopTime > 0 && params.stopTime < _.last(data.t)) active = false;
  }
}).play();
