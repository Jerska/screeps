const MAX_CREEPS = 16;
const ROOM_SIZE = 50;

const DATA_TYPES = [
  { type: 'terrain', terrain: 'plain' },
  { type: 'terrain', terrain: 'wall', color: '#aaa', blocking: true },
  { type: 'terrain', terrain: 'swamp', color: '#0f0' },
  { type: 'source', color: '#ff0' },
  { type: 'source-fetch', color: '#f0f' },
];

function findDataType(obj) {
  const res = DATA_TYPES.findIndex(obj2 => {
    if (obj.type !== obj2.type) return false;
    if (obj2[obj2.type]) return obj2[obj2.type] === obj[obj2.type];
    return true;
  });
  if (res === -1) return 0;
  return res;
}

function findAdjacentTiles(x, y) {
  const tiles = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  const positions = tiles.map(([dx, dy]) => [x + dx, y + dy]);
  return positions.filter(
    ([x1, y1]) =>
      !(x1 < 1 || y1 < 1 || x1 + 1 >= ROOM_SIZE || y1 + 1 >= ROOM_SIZE)
  );
}

function findSources(map) {
  const status = findDataType({ type: 'source' });
  const ids = Array.from(map).map(
    (status2, i) => (status === status2 ? i : -1)
  );
  const filtered = ids.filter(e => e !== -1);
  return filtered.map(id => [Math.floor(id / ROOM_SIZE), id % ROOM_SIZE]);
}

function setFetchingTiles(map, x, y) {
  const tiles = findAdjacentTiles(x, y);
  const available = tiles.filter(
    ([x1, y1]) => !DATA_TYPES[map[x1 * ROOM_SIZE + y1]].blocking
  );
  available.forEach(([x1, y1]) => {
    // eslint-disable-next-line no-param-reassign
    map[x1 * ROOM_SIZE + y1] = findDataType({ type: 'source-fetch' });
  });
}

let map;

function bodyCost(body) {
  return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
}

module.exports.loop = () => {
  const spawn = Game.spawns.Spawn1;
  const room = spawn.room;

  map = new Uint8Array(ROOM_SIZE * ROOM_SIZE);

  const objects = room.lookAtArea(0, 0, ROOM_SIZE, ROOM_SIZE, true);
  objects.forEach(obj => {
    const { x, y, type } = obj;
    const status = findDataType(obj);
    if (status) {
      const idx = x * ROOM_SIZE + y;
      map[idx] = Math.max(status, map[idx]);
    }
  });
  const sources = findSources(map);
  sources.forEach(([x, y]) => {
    setFetchingTiles(map, x, y);
  });

  map.forEach((val, i) => {
    const x = Math.floor(i / ROOM_SIZE);
    const y = i % ROOM_SIZE;
    const color = DATA_TYPES[val] && DATA_TYPES[val].color;
    if (color) {
      room.visual.circle(x, y, { fill: color });
    }
  });

  let creepAmount = Object.keys(Game.creeps).length;

  for (const i in Memory.creeps) {
    if (!Game.creeps[i]) {
      delete Memory.creeps[i];
    }
  }
  const body = [WORK];
  while (bodyCost(body) + bodyCost([MOVE, CARRY]) <= spawn.energyCapacity) {
    body.push(MOVE);
    body.push(CARRY);
  }
  if (creepAmount < MAX_CREEPS && spawn.energy === spawn.energyCapacity) {
    let id = 1;
    while (true) {
      const actionState = spawn.spawnCreep(body, `Harvester${id}`, {
        role: 'harvester',
      });
      if (actionState === OK) {
        break;
      }
      id++;
    }
    creepAmount += 1;
  }

  for (const creepName in Game.creeps) {
    if (!Game.creeps.hasOwnProperty(creepName)) continue; // eslint-disable-line no-continue
    const creep = Game.creeps[creepName];

    if (!creep.memory.state) {
      creep.memory.state = 'harvesting';
    }

    if (creep.memory.state === 'refilling') {
      creep.say('🔅');
      if (creep.carry.energy === 0) {
        creep.memory.state = 'harvesting';
      } else {
        const targets = creep.room.find(FIND_STRUCTURES, {
          filter: structure =>
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.energy < structure.energyCapacity,
        });
        if (targets.length > 0) {
          if (
            creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
          ) {
            creep.moveTo(targets[0], {
              visualizePathStyle: { stroke: '#ffffff' },
            });
          }
        } else {
          creep.memory.state = 'upgrading';
        }
      }
    }

    if (creep.memory.state === 'upgrading') {
      creep.say('🔼');
      if (creep.carry.energy === 0) {
        creep.memory.state = 'harvesting';
      } else {
        const actionState = creep.upgradeController(creep.room.controller);
        if (actionState === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller, {
            visualizePathStyle: { stroke: '#ffffff' },
          });
        }
      }
    }
    if (creep.memory.state === 'harvesting') {
      creep.say('🚜');
      if (creep.carry.energy === creep.carryCapacity) {
        delete creep.memory.harvestingTarget;
        creep.memory.state = 'refilling';
      } else {
        let target;
        if (creep.memory.harvestingTarget) {
          target = Game.getObjectById(creep.memory.harvestingTarget);
        } else {
          const sources = creep.room.find(FIND_SOURCES);
          target = sources[Math.floor(Math.random() * sources.length)];
          creep.memory.harvestingTarget = target.id;
        }

        const actionState = creep.harvest(target);
        if (actionState === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
    }
  }
};
